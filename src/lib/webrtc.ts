import { Client, Databases, ID, Permission, Role } from 'appwrite';

export interface WebRTCEngineOptions {
  client: Client;
  databaseId: string;
  roomId: string;
  currentUserId: string;
  currentUserName?: string;
  onRemoteTrackAdded: (peerId: string, stream: MediaStream, peerName?: string) => void;
  onRemoteScreenStream?: (peerId: string, stream: MediaStream | undefined) => void;
  onPeerDisconnected: (peerId: string) => void;
  onPeerConnected?: (peerId: string) => void;
  onPeerDiscovered?: (peerId: string, userName: string) => void;
  onScreenShareChanged?: (peerId: string, streamId: string | undefined, active: boolean, trackId?: string) => void;
  onHostCommandReceived?: (command: string, targetId?: string) => void;
  onEmojiReactionReceived?: (emojiId: string, senderName?: string) => void;
  onCameraMirrorChanged?: (peerId: string, isMirrored: boolean) => void;
  onConnectionStatusChange?: (status: 'connected' | 'reconnecting' | 'offline') => void;
}

export class WebRTCEngine {
  private peers: Map<string, RTCPeerConnection> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private remoteScreenStreams: Map<string, MediaStream> = new Map();
  private remoteScreenTrackIds: Map<string, string> = new Map();
  private remoteScreenStreamIds: Map<string, string> = new Map();
  private remoteCameraTrackIds: Map<string, string> = new Map();
  private activeScreenSharerId?: string;
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
  private makingOffer: Map<string, boolean> = new Map();
  private ignoreOffer: Map<string, boolean> = new Map();
  private peerNames: Map<string, string> = new Map();
  private audioTransceivers: Map<string, RTCRtpTransceiver> = new Map();
  private cameraTransceivers: Map<string, RTCRtpTransceiver> = new Map();
  private screenTransceivers: Map<string, RTCRtpTransceiver> = new Map();
  private screenAudioTransceivers: Map<string, RTCRtpTransceiver> = new Map();
  private remoteScreenAudioTrackIds: Map<string, string> = new Map();
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
      { urls: 'stun:openrelay.metered.ca:80' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ],
    iceCandidatePoolSize: 10
  };

  constructor(private opts: WebRTCEngineOptions) {
    this.db = new Databases(opts.client);
    this.initSignaling();
    this.attachNetworkListeners();
  }

  private handleOnline = async () => {
    this.opts.onConnectionStatusChange?.('reconnecting');
    if (this.opts.currentUserName) {
      await this.announceJoin(this.opts.currentUserName);
    }
    for (const [peerId, pc] of this.peers.entries()) {
      try {
        if (typeof pc.restartIce === 'function') {
          pc.restartIce();
        }
        if (this.opts.currentUserId > peerId) {
          await this.initiateConnection(peerId);
        }
      } catch (err) {
        console.warn(`ICE restart error for peer ${peerId}:`, err);
      }
    }
    this.opts.onConnectionStatusChange?.('connected');
  };

  private handleOffline = () => {
    this.opts.onConnectionStatusChange?.('offline');
  };

  private attachNetworkListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  private detachNetworkListeners() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
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

            // If joining peer announced an active screen cast
            if (payload.hasScreenCast && payload.screenTrackId) {
              this.remoteScreenTrackIds.set(payload.screenTrackId, doc.senderId);
              if (payload.screenStreamId) {
                this.remoteScreenStreamIds.set(payload.screenStreamId, doc.senderId);
              }
              this.activeScreenSharerId = doc.senderId;
              this.opts.onScreenShareChanged?.(doc.senderId, payload.screenStreamId, true, payload.screenTrackId);
            }

            // Rejoin handling: if an old connection exists for this sender, purge it cleanly
            if (this.peers.has(doc.senderId)) {
              const oldPc = this.peers.get(doc.senderId);
              oldPc?.close();
              this.peers.delete(doc.senderId);
              this.remoteStreams.delete(doc.senderId);
              this.remoteScreenStreams.delete(doc.senderId);
              this.remoteCameraTrackIds.delete(doc.senderId);
              this.pendingCandidates.delete(doc.senderId);
            }

            this.opts.onPeerDiscovered?.(doc.senderId, remoteName);

            // Respond with announce-ack including current screen cast state
            const screenTrack = this.localScreenStream?.getVideoTracks()[0];
            const screenAudioTrack = this.localScreenStream?.getAudioTracks()[0];
            await this.sendSignal(doc.senderId, 'candidate', {
              action: 'announce-ack',
              userId: this.opts.currentUserId,
              userName: this.opts.currentUserName || 'Participant',
              hasScreenCast: Boolean(this.localScreenStream),
              screenStreamId: this.localScreenStream?.id,
              screenTrackId: screenTrack?.id,
              screenAudioTrackId: screenAudioTrack?.id
            });

            // Initialize peer connection
            this.getOrCreatePeer(doc.senderId);

            // Deterministic politeness initiator: designated peer creates offer immediately
            if (this.opts.currentUserId > doc.senderId) {
              await this.initiateConnection(doc.senderId);
            }

            // Proactively notify joiner of our active screen cast
            if (this.localScreenStream) {
              await this.sendSignal(doc.senderId, 'candidate', {
                action: 'screen-cast-started',
                streamId: this.localScreenStream.id,
                trackId: screenTrack?.id,
                audioTrackId: screenAudioTrack?.id,
                senderId: this.opts.currentUserId
              });
            }
          } else if (payload && payload.action === 'announce-ack') {
            const remoteName = payload.userName || `User ${doc.senderId.slice(-4)}`;
            this.peerNames.set(doc.senderId, remoteName);

            // If existing peer acknowledged with an active screen cast
            if (payload.hasScreenCast && payload.screenTrackId) {
              this.remoteScreenTrackIds.set(payload.screenTrackId, doc.senderId);
              if (payload.screenAudioTrackId) {
                this.remoteScreenAudioTrackIds.set(payload.screenAudioTrackId, doc.senderId);
              }
              if (payload.screenStreamId) {
                this.remoteScreenStreamIds.set(payload.screenStreamId, doc.senderId);
              }
              this.activeScreenSharerId = doc.senderId;
              this.opts.onScreenShareChanged?.(doc.senderId, payload.screenStreamId, true, payload.screenTrackId);
            }

            this.opts.onPeerDiscovered?.(doc.senderId, remoteName);

            // Initialize peer connection
            this.getOrCreatePeer(doc.senderId);

            // Deterministic politeness initiator: designated peer creates offer immediately
            if (this.opts.currentUserId > doc.senderId) {
              await this.initiateConnection(doc.senderId);
            }
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
            const streamId = payload.streamId;
            const trackId = payload.trackId;
            const audioTrackId = payload.audioTrackId;
            if (trackId) this.remoteScreenTrackIds.set(trackId, doc.senderId);
            if (audioTrackId) this.remoteScreenAudioTrackIds.set(audioTrackId, doc.senderId);
            if (streamId) this.remoteScreenStreamIds.set(streamId, doc.senderId);
            this.activeScreenSharerId = doc.senderId;
            this.opts.onScreenShareChanged?.(doc.senderId, streamId, true, trackId);

            // Reconcile if the screen tracks are already attached to dedicated screen transceivers
            const screenT = this.screenTransceivers.get(doc.senderId);
            const screenAudioT = this.screenAudioTransceivers.get(doc.senderId);
            let screenStream = this.remoteScreenStreams.get(doc.senderId);
            if (!screenStream) {
              screenStream = new MediaStream();
              this.remoteScreenStreams.set(doc.senderId, screenStream);
            }
            if (screenT?.receiver?.track && screenT.receiver.track.kind === 'video' && !screenStream.getTracks().some((t) => t.id === screenT.receiver.track.id)) {
              screenStream.addTrack(screenT.receiver.track);
            }
            if (screenAudioT?.receiver?.track && screenAudioT.receiver.track.kind === 'audio' && !screenStream.getTracks().some((t) => t.id === screenAudioT.receiver.track.id)) {
              screenStream.addTrack(screenAudioT.receiver.track);
            }
            if (screenStream.getTracks().length > 0) {
              this.opts.onRemoteScreenStream?.(doc.senderId, new MediaStream(screenStream.getTracks()));
            }
          } else if (payload && payload.action === 'screen-cast-stopped') {
            this.remoteScreenStreams.delete(doc.senderId);
            if (this.activeScreenSharerId === doc.senderId) {
              this.activeScreenSharerId = undefined;
            }
            this.opts.onRemoteScreenStream?.(doc.senderId, undefined);
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
        this.remoteScreenStreams.delete(peerId);
        this.remoteCameraTrackIds.delete(peerId);
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
      const track = e.track;
      const screenTransceiver = this.screenTransceivers.get(peerId);
      const isScreenTransceiver = Boolean(
        screenTransceiver && (e.transceiver === screenTransceiver || (e.transceiver?.mid && e.transceiver.mid === screenTransceiver.mid))
      );

      const screenAudioTransceiver = this.screenAudioTransceivers.get(peerId);
      const isScreenAudioTransceiver = Boolean(
        screenAudioTransceiver && (e.transceiver === screenAudioTransceiver || (e.transceiver?.mid && e.transceiver.mid === screenAudioTransceiver.mid))
      );

      // Check if this track is from a screen broadcast (video or audio)
      const isScreenTrack =
        isScreenTransceiver ||
        isScreenAudioTransceiver ||
        (this.remoteScreenTrackIds.get(track.id) === peerId) ||
        (this.remoteScreenAudioTrackIds.get(track.id) === peerId) ||
        (e.streams[0]?.id && this.remoteScreenStreamIds.get(e.streams[0].id) === peerId);

      if (isScreenTrack && (track.kind === 'video' || isScreenAudioTransceiver || this.remoteScreenAudioTrackIds.get(track.id) === peerId)) {
        let screenStream = this.remoteScreenStreams.get(peerId);
        if (!screenStream) {
          screenStream = new MediaStream([track]);
          this.remoteScreenStreams.set(peerId, screenStream);
        } else if (!screenStream.getTracks().some((t) => t.id === track.id)) {
          screenStream.addTrack(track);
        }

        track.addEventListener('ended', () => {
          if (track.kind === 'video') {
            this.remoteScreenStreams.delete(peerId);
            this.opts.onRemoteScreenStream?.(peerId, undefined);
          }
        });

        // Always emit fresh MediaStream reference containing all available tracks (video + audio)
        this.opts.onRemoteScreenStream?.(peerId, new MediaStream(screenStream.getTracks()));
        if (track.kind === 'video') {
          this.opts.onScreenShareChanged?.(peerId, e.streams[0]?.id, true, track.id);
        }
        return;
      }

      // Handle participant camera and mic tracks
      if (track.kind === 'video') {
        this.remoteCameraTrackIds.set(peerId, track.id);
      }

      let stream = this.remoteStreams.get(peerId);
      if (!stream) {
        stream = new MediaStream();
        this.remoteStreams.set(peerId, stream);
      }

      if (!stream.getTracks().some((t) => t.id === track.id)) {
        stream.addTrack(track);
      }

      // Emit clean media stream wrapper and pass peerName so display names are never lost
      const streamWrapper = new MediaStream(stream.getTracks());
      const peerName = this.peerNames.get(peerId);
      this.opts.onRemoteTrackAdded(peerId, streamWrapper, peerName);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        this.opts.onPeerConnected?.(peerId);
      } else if (
        pc.connectionState === 'failed' ||
        pc.connectionState === 'closed'
      ) {
        this.handlePeerLeave(peerId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (
        pc.iceConnectionState === 'failed' ||
        pc.iceConnectionState === 'closed'
      ) {
        this.handlePeerLeave(peerId);
      }
    };

    // 1. Pre-allocate audio transceiver for mic
    const micTrack = this.localMicStream?.getAudioTracks()[0] || null;
    if (typeof pc.addTransceiver === 'function') {
      const audioT = pc.addTransceiver(micTrack || 'audio', {
        direction: 'sendrecv',
        streams: this.localMicStream ? [this.localMicStream] : []
      });
      this.audioTransceivers.set(peerId, audioT);
    } else if (micTrack && this.localMicStream) {
      pc.addTrack(micTrack, this.localMicStream);
    }

    // 2. Pre-allocate video transceiver for camera
    const cameraTrack = this.localCameraStream?.getVideoTracks()[0] || null;
    if (typeof pc.addTransceiver === 'function') {
      const videoT = pc.addTransceiver(cameraTrack || 'video', {
        direction: 'sendrecv',
        streams: this.localCameraStream ? [this.localCameraStream] : []
      });
      this.prioritizeVp8Codec(videoT);
      this.cameraTransceivers.set(peerId, videoT);
    } else if (cameraTrack && this.localCameraStream) {
      pc.addTrack(cameraTrack, this.localCameraStream);
    }

    // 3. Pre-allocate video transceiver for screen share (guarantees symmetric m-lines for midway joiners)
    const screenTrack = this.localScreenStream?.getVideoTracks()[0] || null;
    if (typeof pc.addTransceiver === 'function') {
      const screenT = pc.addTransceiver(screenTrack || 'video', {
        direction: 'sendrecv',
        streams: this.localScreenStream ? [this.localScreenStream] : []
      });
      this.prioritizeVp8Codec(screenT);
      this.screenTransceivers.set(peerId, screenT);
    } else if (screenTrack && this.localScreenStream) {
      pc.addTrack(screenTrack, this.localScreenStream);
    }

    // 4. Pre-allocate audio transceiver for screen / broadcast audio
    const screenAudioTrack = this.localScreenStream?.getAudioTracks()[0] || null;
    if (typeof pc.addTransceiver === 'function') {
      const screenAudioT = pc.addTransceiver(screenAudioTrack || 'audio', {
        direction: 'sendrecv',
        streams: this.localScreenStream ? [this.localScreenStream] : []
      });
      this.screenAudioTransceivers.set(peerId, screenAudioT);
    } else if (screenAudioTrack && this.localScreenStream) {
      pc.addTrack(screenAudioTrack, this.localScreenStream);
    }

    this.peers.set(peerId, pc);
    return pc;
  }

  private handlePeerLeave(peerId: string) {
    const pc = this.peers.get(peerId);
    if (pc) {
      pc.close();
      this.peers.delete(peerId);
    }
    this.audioTransceivers.delete(peerId);
    this.cameraTransceivers.delete(peerId);
    this.screenTransceivers.delete(peerId);
    this.screenAudioTransceivers.delete(peerId);
    this.remoteStreams.delete(peerId);
    this.remoteScreenStreams.delete(peerId);
    this.remoteCameraTrackIds.delete(peerId);
    this.pendingCandidates.delete(peerId);
    this.makingOffer.delete(peerId);
    this.ignoreOffer.delete(peerId);
    this.peerNames.delete(peerId);
    if (this.activeScreenSharerId === peerId) {
      this.activeScreenSharerId = undefined;
      this.opts.onRemoteScreenStream?.(peerId, undefined);
    }
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

  private prioritizeVp8Codec(transceiver: RTCRtpTransceiver) {
    if (
      typeof RTCRtpSender === 'undefined' ||
      typeof RTCRtpSender.getCapabilities !== 'function' ||
      !transceiver.setCodecPreferences
    ) {
      return;
    }
    try {
      const capabilities = RTCRtpSender.getCapabilities('video');
      if (!capabilities?.codecs) return;

      const vp8 = capabilities.codecs.filter((c) => c.mimeType.toLowerCase() === 'video/vp8');
      const fallback = capabilities.codecs.filter((c) => c.mimeType.toLowerCase() !== 'video/vp8');

      if (vp8.length > 0) {
        transceiver.setCodecPreferences([...vp8, ...fallback]);
      }
    } catch (err) {
      console.warn('Failed to prioritize VP8 codec preference:', err);
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

  public attachMicStream(stream: MediaStream) {
    this.localMicStream = stream;
    const track = stream.getAudioTracks()[0];
    if (!track) return;

    this.peers.forEach((pc, peerId) => {
      const audioTransceiver = this.audioTransceivers.get(peerId);
      if (audioTransceiver) {
        audioTransceiver.sender.replaceTrack(track).catch(console.warn);
      } else {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'audio');
        if (sender) {
          sender.replaceTrack(track).catch(console.warn);
        } else {
          pc.addTrack(track, stream);
        }
      }
    });
  }

  public attachCameraStream(stream: MediaStream) {
    this.localCameraStream = stream;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    this.peers.forEach((pc, peerId) => {
      const cameraTransceiver = this.cameraTransceivers.get(peerId);
      if (cameraTransceiver) {
        cameraTransceiver.sender.replaceTrack(videoTrack).catch(console.warn);
      } else {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack).catch(console.warn);
        } else {
          pc.addTrack(videoTrack, stream);
        }
      }
    });
  }

  public removeCameraStream() {
    this.peers.forEach((_pc, peerId) => {
      const cameraTransceiver = this.cameraTransceivers.get(peerId);
      if (cameraTransceiver) {
        cameraTransceiver.sender.replaceTrack(null).catch(console.warn);
      }
    });
    this.localCameraStream = undefined;
  }

  public attachScreenStream(stream: MediaStream) {
    this.localScreenStream = stream;
    const screenTrack = stream.getVideoTracks()[0];
    const screenAudioTrack = stream.getAudioTracks()[0] || null;
    if (!screenTrack) return;

    this.peers.forEach((pc, peerId) => {
      const screenTransceiver = this.screenTransceivers.get(peerId);
      if (screenTransceiver) {
        screenTransceiver.sender.replaceTrack(screenTrack).catch(console.warn);
      } else {
        pc.addTrack(screenTrack, stream);
      }

      const screenAudioTransceiver = this.screenAudioTransceivers.get(peerId);
      if (screenAudioTransceiver) {
        screenAudioTransceiver.sender.replaceTrack(screenAudioTrack).catch(console.warn);
      } else if (screenAudioTrack) {
        pc.addTrack(screenAudioTrack, stream);
      }
    });

    this.sendSignal('all', 'candidate', {
      action: 'screen-cast-started',
      streamId: stream.id,
      trackId: screenTrack.id,
      audioTrackId: screenAudioTrack?.id,
      senderId: this.opts.currentUserId
    }).catch(console.warn);
  }

  public removeScreenStream() {
    if (!this.localScreenStream) return;
    const screenStreamId = this.localScreenStream.id;
    this.peers.forEach((_pc, peerId) => {
      const screenTransceiver = this.screenTransceivers.get(peerId);
      if (screenTransceiver) {
        screenTransceiver.sender.replaceTrack(null).catch(console.warn);
      }
      const screenAudioTransceiver = this.screenAudioTransceivers.get(peerId);
      if (screenAudioTransceiver) {
        screenAudioTransceiver.sender.replaceTrack(null).catch(console.warn);
      }
    });
    this.localScreenStream.getTracks().forEach((t) => t.stop());
    this.localScreenStream = undefined;

    this.sendSignal('all', 'candidate', {
      action: 'screen-cast-stopped',
      streamId: screenStreamId,
      senderId: this.opts.currentUserId
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
      const screenTrack = this.localScreenStream?.getVideoTracks()[0];
      const screenAudioTrack = this.localScreenStream?.getAudioTracks()[0];
      await this.sendSignal('all', 'candidate', {
        action: 'announce-join',
        userId: this.opts.currentUserId,
        userName,
        hasScreenCast: Boolean(this.localScreenStream),
        screenStreamId: this.localScreenStream?.id,
        screenTrackId: screenTrack?.id,
        screenAudioTrackId: screenAudioTrack?.id
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
    this.detachNetworkListeners();
    this.announceLeave().catch(() => {});

    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }

    this.peers.forEach((pc) => pc.close());
    this.peers.clear();
    this.audioTransceivers.clear();
    this.cameraTransceivers.clear();
    this.screenTransceivers.clear();
    this.screenAudioTransceivers.clear();
    this.remoteStreams.clear();
    this.remoteScreenStreams.clear();
    this.remoteScreenTrackIds.clear();
    this.remoteScreenAudioTrackIds.clear();
    this.remoteScreenStreamIds.clear();
    this.remoteCameraTrackIds.clear();
    this.pendingCandidates.clear();
    this.makingOffer.clear();
    this.ignoreOffer.clear();
    this.peerNames.clear();

    this.localMicStream = undefined;
    this.localCameraStream = undefined;

    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach((t) => t.stop());
      this.localScreenStream = undefined;
    }
  }
}
