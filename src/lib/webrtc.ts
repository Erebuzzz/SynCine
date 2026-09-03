import { Client, Databases, ID, Permission, Role } from 'appwrite';

export interface WebRTCEngineOptions {
  client: Client;
  databaseId: string;
  roomId: string;
  currentUserId: string;
  currentUserName?: string;
  onRemoteTrackAdded: (peerId: string, stream: MediaStream, peerName?: string) => void;
  onPeerDisconnected: (peerId: string) => void;
  onPeerConnected?: (peerId: string) => void;
  onPeerDiscovered?: (peerId: string, userName: string) => void;
  onScreenShareChanged?: (peerId: string, streamId: string | undefined, active: boolean) => void;
  onHostCommandReceived?: (command: string, targetId?: string) => void;
  onEmojiReactionReceived?: (emojiId: string, senderName?: string) => void;
  onCameraMirrorChanged?: (peerId: string, isMirrored: boolean) => void;
}

export class WebRTCEngine {
  private peers: Map<string, RTCPeerConnection> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private makingOffer: Map<string, boolean> = new Map();
  private ignoreOffer: Map<string, boolean> = new Map();
  private peerNames: Map<string, string> = new Map();
  private db: Databases;
  private unsubscribe?: () => void;
  private localMicStream?: MediaStream;
  private localCameraStream?: MediaStream;
  private localScreenStream?: MediaStream;

  private rtcConfiguration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:relay.metered.ca:80' }
    ],
    iceCandidatePoolSize: 10
  };

  constructor(private opts: WebRTCEngineOptions) {
    this.db = new Databases(opts.client);
    this.initSignaling();
  }

  private initSignaling() {
    const channel = `databases.${this.opts.databaseId}.collections.signaling.documents`;

    this.unsubscribe = this.opts.client.subscribe(channel, async (event: any) => {
      const doc = event?.payload;

      if (!doc || doc.roomId !== this.opts.roomId) return;
      if (doc.senderId === this.opts.currentUserId) return;
      if (doc.receiverId !== this.opts.currentUserId && doc.receiverId !== 'all') return;

      try {
        const payload = JSON.parse(doc.payload);

        if (doc.type === 'offer') {
          await this.handleOffer(doc.senderId, payload);
        } else if (doc.type === 'answer') {
          await this.handleAnswer(doc.senderId, payload);
        } else if (doc.type === 'candidate') {
          if (payload && payload.action === 'announce-join') {
            const remoteName = payload.userName || `Viewer ${doc.senderId.slice(-4)}`;
            this.peerNames.set(doc.senderId, remoteName);

            // Rejoin handling: if an old connection exists for this sender, purge it cleanly
            if (this.peers.has(doc.senderId)) {
              const oldPc = this.peers.get(doc.senderId);
              oldPc?.close();
              this.peers.delete(doc.senderId);
              this.remoteStreams.delete(doc.senderId);
              this.pendingCandidates.delete(doc.senderId);
            }

            this.opts.onPeerDiscovered?.(doc.senderId, remoteName);

            // Respond with announce-ack so the joining peer immediately learns our identity
            await this.sendSignal(doc.senderId, 'candidate', {
              action: 'announce-ack',
              userId: this.opts.currentUserId,
              userName: this.opts.currentUserName || 'Participant'
            });

            // Ensure peer connection is initialized
            this.getOrCreatePeer(doc.senderId);

            if (this.localScreenStream) {
              await this.sendSignal(doc.senderId, 'candidate', {
                action: 'screen-cast-started',
                streamId: this.localScreenStream.id
              });
            }
          } else if (payload && payload.action === 'announce-ack') {
            const remoteName = payload.userName || `User ${doc.senderId.slice(-4)}`;
            this.peerNames.set(doc.senderId, remoteName);
            this.opts.onPeerDiscovered?.(doc.senderId, remoteName);

            // Ensure peer connection is initialized
            this.getOrCreatePeer(doc.senderId);
          } else if (payload && payload.action === 'announce-leave') {
            // Cleanly remove departing peer
            this.handlePeerLeave(doc.senderId);
          } else if (payload && payload.action === 'host-command') {
            this.opts.onHostCommandReceived?.(payload.command, payload.targetId);
          } else if (payload && payload.action === 'emoji-reaction') {
            this.opts.onEmojiReactionReceived?.(payload.emojiId, payload.senderName);
          } else if (payload && payload.action === 'camera-mirror-changed') {
            this.opts.onCameraMirrorChanged?.(doc.senderId, payload.isMirrored);
          } else if (payload && payload.action === 'screen-cast-started') {
            this.opts.onScreenShareChanged?.(doc.senderId, payload.streamId, true);
          } else if (payload && payload.action === 'screen-cast-stopped') {
            this.opts.onScreenShareChanged?.(doc.senderId, payload.streamId, false);
          } else if (payload && payload.candidate) {
            await this.handleCandidate(doc.senderId, payload.candidate);
          } else {
            await this.handleCandidate(doc.senderId, payload);
          }
        }
      } catch (err) {
        console.error('Failed to parse and process signaling payload:', err);
      }
    });
  }

  private getOrCreatePeer(peerId: string): RTCPeerConnection {
    let pc = this.peers.get(peerId);
    if (pc) {
      if (
        pc.signalingState === 'closed' ||
        pc.connectionState === 'closed' ||
        pc.connectionState === 'failed'
      ) {
        pc.close();
        this.peers.delete(peerId);
        this.remoteStreams.delete(peerId);
        this.pendingCandidates.delete(peerId);
        pc = undefined;
      } else {
        return pc;
      }
    }

    pc = new RTCPeerConnection(this.rtcConfiguration);

    // Perfect Negotiation pattern: onnegotiationneeded triggers offer generation
    pc.onnegotiationneeded = async () => {
      try {
        this.makingOffer.set(peerId, true);
        const offer = await pc.createOffer();
        if (pc.signalingState !== 'stable') return;
        await pc.setLocalDescription(offer);
        await this.sendSignal(peerId, 'offer', pc.localDescription);
      } catch (err) {
        console.warn(`Negotiation error for peer ${peerId}:`, err);
      } finally {
        this.makingOffer.set(peerId, false);
      }
    };

    pc.onicecandidate = async (e) => {
      if (e.candidate) {
        await this.sendSignal(peerId, 'candidate', { candidate: e.candidate.toJSON() });
      }
    };

    pc.ontrack = (e) => {
      let stream = this.remoteStreams.get(peerId);
      if (!stream) {
        stream = new MediaStream();
        this.remoteStreams.set(peerId, stream);
      }

      if (e.track && !stream.getTracks().some((t) => t.id === e.track.id)) {
        stream.addTrack(e.track);
      }
      e.streams[0]?.getTracks().forEach((track) => {
        if (!stream!.getTracks().some((t) => t.id === track.id)) {
          stream!.addTrack(track);
        }
      });

      // Crucial: emit a fresh MediaStream wrapper and pass peerName so display names are never lost
      const streamWrapper = new MediaStream(stream.getTracks());
      const peerName = this.peerNames.get(peerId);
      this.opts.onRemoteTrackAdded(peerId, streamWrapper, peerName);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        this.opts.onPeerConnected?.(peerId);
      } else if (
        pc.connectionState === 'disconnected' ||
        pc.connectionState === 'failed' ||
        pc.connectionState === 'closed'
      ) {
        this.handlePeerLeave(peerId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (
        pc.iceConnectionState === 'disconnected' ||
        pc.iceConnectionState === 'failed' ||
        pc.iceConnectionState === 'closed'
      ) {
        this.handlePeerLeave(peerId);
      }
    };

    // Attach active local audio tracks
    if (this.localMicStream) {
      this.localMicStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, this.localMicStream!);
      });
    }

    // Attach active local camera video tracks
    if (this.localCameraStream) {
      this.localCameraStream.getVideoTracks().forEach((track) => {
        pc.addTrack(track, this.localCameraStream!);
      });
    }

    // Attach active local screen tracks
    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localScreenStream!);
      });
    }

    this.forceH264Codec(pc);
    this.peers.set(peerId, pc);
    return pc;
  }

  private handlePeerLeave(peerId: string) {
    const pc = this.peers.get(peerId);
    if (pc) {
      pc.close();
      this.peers.delete(peerId);
    }
    this.remoteStreams.delete(peerId);
    this.pendingCandidates.delete(peerId);
    this.makingOffer.delete(peerId);
    this.ignoreOffer.delete(peerId);
    this.peerNames.delete(peerId);
    this.opts.onPeerDisconnected(peerId);
  }

  public async initiateConnection(peerId: string) {
    const pc = this.getOrCreatePeer(peerId);
    try {
      this.makingOffer.set(peerId, true);
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      if (pc.signalingState !== 'stable') return;
      await pc.setLocalDescription(offer);
      await this.sendSignal(peerId, 'offer', pc.localDescription || offer);
    } catch (err) {
      console.warn(`Failed to initiate connection to peer ${peerId}:`, err);
    } finally {
      this.makingOffer.set(peerId, false);
    }
  }

  private async handleOffer(peerId: string, offer: RTCSessionDescriptionInit) {
    const pc = this.getOrCreatePeer(peerId);
    const isPolite = this.opts.currentUserId < peerId;
    const isMakingOffer = this.makingOffer.get(peerId) || false;
    const offerCollision = offer.type === 'offer' && (isMakingOffer || pc.signalingState !== 'stable');

    this.ignoreOffer.set(peerId, !isPolite && offerCollision);
    if (this.ignoreOffer.get(peerId)) {
      console.warn(`WebRTC glare collision detected with peer ${peerId}. Impolite peer ignoring offer.`);
      return;
    }

    if (offerCollision && isPolite) {
      if (pc.signalingState === 'have-local-offer') {
        try {
          console.log(`WebRTC glare collision detected with peer ${peerId}. Polite peer rolling back.`);
          await pc.setLocalDescription({ type: 'rollback' });
        } catch (err) {
          console.warn(`Rollback failed for peer ${peerId}:`, err);
        }
      }
    }

    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    // Drain queued ICE candidates
    const queued = this.pendingCandidates.get(peerId);
    if (queued && queued.length > 0) {
      for (const candidate of queued) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.warn('Error applying queued ICE candidate:', e);
        }
      }
      this.pendingCandidates.delete(peerId);
    }

    if (offer.type === 'offer') {
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await this.sendSignal(peerId, 'answer', pc.localDescription);
    }
  }

  private async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit) {
    const pc = this.peers.get(peerId);
    if (!pc) return;

    if (pc.signalingState === 'have-local-offer') {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      const queued = this.pendingCandidates.get(peerId);
      if (queued && queued.length > 0) {
        for (const candidate of queued) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.warn('Error applying queued ICE candidate:', e);
          }
        }
        this.pendingCandidates.delete(peerId);
      }
    }
  }

  private async handleCandidate(peerId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peers.get(peerId);
    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        if (!this.ignoreOffer.get(peerId)) {
          console.warn(`Failed to add ICE candidate for peer ${peerId}:`, err);
        }
      }
    } else {
      const list = this.pendingCandidates.get(peerId) || [];
      list.push(candidate);
      this.pendingCandidates.set(peerId, list);
    }
  }

  private async sendSignal(receiverId: string, type: 'offer' | 'answer' | 'candidate', payload: any) {
    try {
      const permissions = [
        Permission.read(Role.any()),
        typeof Permission.write === 'function'
          ? Permission.write(Role.any())
          : Permission.update(Role.any())
      ];
      await this.db.createDocument(
        this.opts.databaseId,
        'signaling',
        ID.unique(),
        {
          roomId: this.opts.roomId,
          senderId: this.opts.currentUserId,
          receiverId,
          type,
          payload: JSON.stringify(payload)
        },
        permissions
      );
    } catch (err) {
      console.error(`Failed to send signaling message (${type}) to ${receiverId}:`, err);
    }
  }

  private forceH264Codec(pc: RTCPeerConnection) {
    if (typeof RTCRtpReceiver === 'undefined' || !RTCRtpReceiver.getCapabilities) return;

    pc.getTransceivers().forEach((transceiver) => {
      if (transceiver.receiver && transceiver.receiver.track && transceiver.receiver.track.kind === 'video') {
        const capabilities = RTCRtpReceiver.getCapabilities('video');
        if (!capabilities) return;

        const h264 = capabilities.codecs.filter((c) => c.mimeType.toLowerCase() === 'video/h264');
        const fallback = capabilities.codecs.filter((c) => c.mimeType.toLowerCase() !== 'video/h264');

        if (transceiver.setCodecPreferences && h264.length > 0) {
          transceiver.setCodecPreferences([...h264, ...fallback]);
        }
      }
    });
  }

  public attachMicStream(stream: MediaStream) {
    this.localMicStream = stream;
    const track = stream.getAudioTracks()[0];
    if (!track) return;

    this.peers.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'audio');
      if (sender) {
        sender.replaceTrack(track).catch(console.warn);
      } else {
        pc.addTrack(track, stream);
      }
    });
  }

  public attachCameraStream(stream: MediaStream) {
    this.localCameraStream = stream;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    this.peers.forEach((pc) => {
      const sender = pc.getSenders().find(
        (s) => s.track?.kind === 'video' && s.track?.id !== this.localScreenStream?.getVideoTracks()[0]?.id
      );
      if (sender) {
        sender.replaceTrack(videoTrack).catch(console.warn);
      } else {
        pc.addTrack(videoTrack, stream);
      }
    });
  }

  public removeCameraStream() {
    if (!this.localCameraStream) return;
    const videoTracks = this.localCameraStream.getVideoTracks();
    this.peers.forEach((pc) => {
      pc.getSenders().forEach((sender) => {
        if (sender.track && videoTracks.some((t) => t.id === sender.track!.id)) {
          pc.removeTrack(sender);
        }
      });
    });
    this.localCameraStream.getTracks().forEach((t) => t.stop());
    this.localCameraStream = undefined;
  }

  public attachScreenStream(stream: MediaStream) {
    this.localScreenStream = stream;
    stream.getTracks().forEach((track) => {
      this.peers.forEach((pc) => {
        const senders = pc.getSenders();
        const existing = senders.find((s) => s.track?.kind === track.kind && s.track?.id === track.id);
        if (!existing) {
          pc.addTrack(track, stream);
        }
      });
    });

    this.sendSignal('all', 'candidate', {
      action: 'screen-cast-started',
      streamId: stream.id
    }).catch(console.warn);
  }

  public removeScreenStream() {
    if (!this.localScreenStream) return;
    const screenStreamId = this.localScreenStream.id;
    const screenTracks = this.localScreenStream.getTracks();
    this.peers.forEach((pc) => {
      pc.getSenders().forEach((sender) => {
        if (sender.track && screenTracks.some((t) => t.id === sender.track!.id)) {
          pc.removeTrack(sender);
        }
      });
    });
    this.localScreenStream.getTracks().forEach((t) => t.stop());
    this.localScreenStream = undefined;

    this.sendSignal('all', 'candidate', {
      action: 'screen-cast-stopped',
      streamId: screenStreamId
    }).catch(console.warn);
  }

  public getPeerConnections(): Map<string, RTCPeerConnection> {
    return this.peers;
  }

  public getPeerName(peerId: string): string | undefined {
    return this.peerNames.get(peerId);
  }

  public async updateVideoEncodings(maxBitrate: number): Promise<void> {
    for (const pc of this.peers.values()) {
      const senders = pc.getSenders();
      for (const sender of senders) {
        if (sender.track && sender.track.kind === 'video') {
          try {
            const params = sender.getParameters();
            if (!params.encodings || params.encodings.length === 0) {
              params.encodings = [{}];
            }
            params.encodings[0].maxBitrate = maxBitrate;
            await sender.setParameters(params);
          } catch (err) {
            console.warn('Failed to update RTCRtpSender encoding bitrate:', err);
          }
        }
      }
    }
  }

  public async replaceTracks(newAudioTrack?: MediaStreamTrack, newVideoTrack?: MediaStreamTrack): Promise<void> {
    for (const pc of this.peers.values()) {
      const senders = pc.getSenders();
      for (const sender of senders) {
        if (sender.track?.kind === 'audio' && newAudioTrack) {
          await sender.replaceTrack(newAudioTrack).catch(console.warn);
        }
        if (sender.track?.kind === 'video' && newVideoTrack) {
          await sender.replaceTrack(newVideoTrack).catch(console.warn);
        }
      }
    }
  }

  public async announceJoin(userName: string) {
    try {
      this.opts.currentUserName = userName;
      await this.sendSignal('all', 'candidate', {
        action: 'announce-join',
        userId: this.opts.currentUserId,
        userName
      });
    } catch (err) {
      console.warn('Failed to announce join:', err);
    }
  }

  public async announceLeave(): Promise<void> {
    try {
      await this.sendSignal('all', 'candidate', {
        action: 'announce-leave',
        userId: this.opts.currentUserId
      });
    } catch (err) {
      console.warn('Failed to announce leave:', err);
    }
  }

  public async broadcastHostCommand(command: string, targetId?: string): Promise<void> {
    try {
      await this.sendSignal('all', 'candidate', {
        action: 'host-command',
        command,
        targetId
      });
    } catch (err) {
      console.warn('Failed to broadcast host command:', err);
    }
  }

  public async broadcastEmojiReaction(emojiId: string, senderName: string): Promise<void> {
    try {
      await this.sendSignal('all', 'candidate', {
        action: 'emoji-reaction',
        emojiId,
        senderName
      });
    } catch (err) {
      console.warn('Failed to broadcast emoji reaction:', err);
    }
  }

  public async broadcastCameraMirror(isMirrored: boolean): Promise<void> {
    try {
      await this.sendSignal('all', 'candidate', {
        action: 'camera-mirror-changed',
        isMirrored
      });
    } catch (err) {
      console.warn('Failed to broadcast camera mirror state:', err);
    }
  }

  public destroy() {
    this.announceLeave().catch(() => {});

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }

    this.peers.forEach((pc) => pc.close());
    this.peers.clear();
    this.remoteStreams.clear();
    this.pendingCandidates.clear();
    this.makingOffer.clear();
    this.ignoreOffer.clear();
    this.peerNames.clear();

    if (this.localMicStream) {
      this.localMicStream.getTracks().forEach((t) => t.stop());
      this.localMicStream = undefined;
    }

    if (this.localCameraStream) {
      this.localCameraStream.getTracks().forEach((t) => t.stop());
      this.localCameraStream = undefined;
    }

    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach((t) => t.stop());
      this.localScreenStream = undefined;
    }
  }
}
