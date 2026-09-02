import { Client, Databases, ID, Permission, Role } from 'appwrite';

export interface WebRTCEngineOptions {
  client: Client;
  databaseId: string;
  roomId: string;
  currentUserId: string;
  onRemoteTrackAdded: (peerId: string, stream: MediaStream) => void;
  onPeerDisconnected: (peerId: string) => void;
  onPeerConnected?: (peerId: string) => void;
  onScreenShareChanged?: (peerId: string, streamId: string | undefined, active: boolean) => void;
}

export class WebRTCEngine {
  private peers: Map<string, RTCPeerConnection> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();
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
            if (doc.senderId !== this.opts.currentUserId) {
              await this.initiateConnection(doc.senderId);
              if (this.localScreenStream) {
                await this.sendSignal(doc.senderId, 'candidate', {
                  action: 'screen-cast-started',
                  streamId: this.localScreenStream.id
                });
              }
            }
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
    if (pc) return pc;

    pc = new RTCPeerConnection(this.rtcConfiguration);

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

      e.streams[0]?.getTracks().forEach((track) => {
        if (!stream!.getTracks().some((t) => t.id === track.id)) {
          stream!.addTrack(track);
        }
      });

      if (e.track && !stream.getTracks().some((t) => t.id === e.track.id)) {
        stream.addTrack(e.track);
      }

      this.opts.onRemoteTrackAdded(peerId, stream);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        this.opts.onPeerConnected?.(peerId);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.handlePeerLeave(peerId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
        this.handlePeerLeave(peerId);
      }
    };

    // Attach active local audio tracks to the peer connection
    if (this.localMicStream) {
      this.localMicStream.getAudioTracks().forEach((track) => {
        pc.addTrack(track, this.localMicStream!);
      });
    }

    // Attach active local camera video tracks to the peer connection
    if (this.localCameraStream) {
      this.localCameraStream.getVideoTracks().forEach((track) => {
        pc.addTrack(track, this.localCameraStream!);
      });
    }

    // Attach active local screen tracks to the peer connection
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
    this.opts.onPeerDisconnected(peerId);
  }

  public async initiateConnection(peerId: string) {
    const pc = this.getOrCreatePeer(peerId);
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    await pc.setLocalDescription(offer);
    await this.sendSignal(peerId, 'offer', offer);
  }

  private async handleOffer(peerId: string, offer: RTCSessionDescriptionInit) {
    const pc = this.getOrCreatePeer(peerId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));

    // Process queued candidates
    const queued = this.pendingCandidates.get(peerId);
    if (queued && queued.length > 0) {
      for (const candidate of queued) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      this.pendingCandidates.delete(peerId);
    }

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await this.sendSignal(peerId, 'answer', answer);
  }

  private async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit) {
    const pc = this.peers.get(peerId);
    if (pc && pc.signalingState !== 'stable') {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));

      const queued = this.pendingCandidates.get(peerId);
      if (queued && queued.length > 0) {
        for (const candidate of queued) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
        this.pendingCandidates.delete(peerId);
      }
    }
  }

  private async handleCandidate(peerId: string, candidate: RTCIceCandidateInit) {
    const pc = this.peers.get(peerId);
    if (pc && pc.remoteDescription && pc.remoteDescription.type) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      const list = this.pendingCandidates.get(peerId) || [];
      list.push(candidate);
      this.pendingCandidates.set(peerId, list);
    }
  }

  private async sendSignal(receiverId: string, type: 'offer' | 'answer' | 'candidate', payload: any) {
    try {
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
        [
          Permission.read(Role.any()),
          Permission.write(Role.any())
        ]
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
        sender.replaceTrack(track);
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
        sender.replaceTrack(videoTrack);
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
      await this.sendSignal('all', 'candidate', {
        action: 'announce-join',
        userId: this.opts.currentUserId,
        userName
      });
    } catch (err) {
      console.warn('Failed to announce join:', err);
    }
  }

  public destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }

    this.peers.forEach((pc) => pc.close());
    this.peers.clear();
    this.remoteStreams.clear();
    this.pendingCandidates.clear();

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
