import { Config } from './constants.js';

// WebRTCManager class for peer connection management
export class WebRTCManager {
  constructor(deps) {
    this.deps = deps; // { logger, sessionManager, signalingManager, mediaManager, uiManager, elm, callbacks }
    this.peerConnection = null;
    this.dataChannel = null;
    this.iceCandidates = [];
    this.iceGatheringTimeout = null;
    this.iceCandidatesSent = false;
  }

  async createPeerConnection() {
    const { logger, mediaManager, elm, callbacks } = this.deps;

    this.peerConnection = new RTCPeerConnection({
      iceServers: Config.STUN_SERVERS,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    });

    const localStream = mediaManager.getLocalStream();
    if (!localStream) {
      throw new Error('localStream is null - camera not started');
    }
    localStream.getTracks().forEach(track => {
      if (track.readyState === 'live') {
        this.peerConnection.addTrack(track, localStream);
      }
    });
    logger.rtc('tracks added');

    setTimeout(async () => {
      if (!this.peerConnection) return;
      const sender = this.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) {
        const params = sender.getParameters();
        if (params.encodings && params.encodings.length > 0) {
          params.encodings[0].maxBitrate = 50000;
          params.encodings[0].maxFramerate = 60;
          await sender.setParameters(params);
        }
      }
    }, 1000);

    this.peerConnection.ontrack = (event) => {
      logger.rtc('remote track:', event.track.kind);
      if (elm.remoteVideo && event.streams[0]) {
        elm.remoteVideo.srcObject = event.streams[0];
        elm.remoteVideo.oncanplay = () => {
          elm.remoteVideo.play().catch(() => {});
        };
        callbacks.playVideoSafely(elm.remoteVideo, 'リモート');
      }
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.iceCandidates.push(event.candidate);
      } else {
        logger.ice('gathering complete, count:', this.iceCandidates.length);
      }
    };

    this.setupConnectionEventHandlers();
  }

  async sendIceCandidates() {
    const { logger, sessionManager, signalingManager } = this.deps;

    if (this.iceCandidatesSent) return true;
    if (!sessionManager.sessionHash) return false;

    // ICE候補が収集されるまで待つ
    const waitStart = Date.now();
    while (this.iceCandidates.length === 0 && Date.now() - waitStart < Config.ICE_GATHERING_TIMEOUT) {
      await new Promise(r => setTimeout(r, 100));
    }

    if (this.iceCandidates.length === 0) {
      logger.ice('no candidates after waiting');
      return false;
    }

    sessionManager.setState(sessionManager.isHost ? 'H:ICE_PUT' : 'G:ICE_PUT');

    const keyword = sessionManager.currentKeyword;
    const iceSuffix = `ice-${sessionManager.isHost ? 'host' : 'guest'}`;
    const iceKey = sessionManager.getChannelPath(iceSuffix);

    logger.ice('PUT', this.iceCandidates.length, 'candidates to', iceKey);
    this.iceCandidatesSent = true;
    try {
      const result = await signalingManager.send(iceKey, {
        type: 'ice-batch',
        candidates: this.iceCandidates,
        isHost: sessionManager.isHost
      }, keyword, Config.TIMEOUT_SIGNALING);
      if (result.success) {
        logger.ice('PUT success');
        return true;
      }
      logger.error('ICE', 'PUT timeout');
      return false;
    } catch (e) {
      logger.error('ICE', 'PUT error:', e.message);
      return false;
    }
  }

  setupConnectionEventHandlers() {
    const { logger, sessionManager, uiManager, callbacks } = this.deps;

    this.peerConnection.onconnectionstatechange = async () => {
      logger.rtc('state:', this.peerConnection.connectionState);

      if (this.peerConnection.connectionState === 'connected') {
        sessionManager.sessionActive = true;
        sessionManager.connectionEstablished = true;
        callbacks.onConnected();

        await callbacks.updateConnectionInfo(true);

        let retryCount = 0;
        const retryTimer = setInterval(async () => {
          retryCount++;
          const connectionType = await callbacks.getConnectionType();
          if (connectionType) {
            uiManager.updateStatus(`接続完了 (${connectionType})`);
            clearInterval(retryTimer);
          } else if (retryCount >= 5) {
            uiManager.updateStatus('接続完了');
            clearInterval(retryTimer);
          }
        }, 2000);
      } else if (this.peerConnection.connectionState === 'disconnected' ||
        this.peerConnection.connectionState === 'failed') {
        if (sessionManager.connectionEstablished) {
          sessionManager.connectionEstablished = false;
          sessionManager.sessionActive = false;

          uiManager.updateStatus('相手が退室しました。再接続中...');
          const keyword = sessionManager.currentKeyword;
          setTimeout(() => {
            callbacks.reconnectSession(keyword);
          }, Config.RETRY_DELAY);
        } else {
          callbacks.handleDisconnect();
        }
      }
    };

    this.peerConnection.oniceconnectionstatechange = async () => {
      logger.ice('conn:', this.peerConnection.iceConnectionState);
      if (this.peerConnection.iceConnectionState === 'connected') {
        await callbacks.updateConnectionInfo(true);
      } else {
        callbacks.updateConnectionInfo();
      }
    };

    this.peerConnection.onicegatheringstatechange = () => {
      logger.ice('gather:', this.peerConnection.iceGatheringState);
      callbacks.updateConnectionInfo();
    };
  }

  setupDataChannel() {
    const { sessionManager } = this.deps;

    if (sessionManager.isHost) {
      this.dataChannel = this.peerConnection.createDataChannel('aa-data');
      this.setupDataChannelEvents();
    } else {
      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannelEvents();
      };
    }
  }

  setupDataChannelEvents() {
    this.dataChannel.onopen = () => {
      console.log('データチャンネル開通');
    };
    this.dataChannel.onmessage = (event) => {
      const message = JSON.parse(event.data);
    };
    this.dataChannel.onerror = (error) => {
      console.error('データチャンネルエラー:', error);
    };
  }

  async createOffer() {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  async createAnswer() {
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  async setRemoteDescription(description) {
    if (!this.peerConnection) return;
    await this.peerConnection.setRemoteDescription(description);
  }

  async addIceCandidate(candidate) {
    if (!this.peerConnection) return;
    await this.peerConnection.addIceCandidate(candidate);
  }

  getPeerConnection() {
    return this.peerConnection;
  }

  getDataChannel() {
    return this.dataChannel;
  }

  close() {
    if (this.iceGatheringTimeout) {
      clearTimeout(this.iceGatheringTimeout);
      this.iceGatheringTimeout = null;
    }
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.iceCandidates = [];
    this.iceCandidatesSent = false;
  }
}
