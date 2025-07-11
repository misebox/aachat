// Config class for constants
class Config {
  static PPNG_SERVER = atob('aHR0cHM6Ly9wcG5nLnVydGVsbC5jb20vcA==');
  static STUN_SERVERS = JSON.parse(atob('W3sidXJscyI6InN0dW46c3R1bi5zLmdvb2dsZS5jb206MTkzMDIifSx7InVybHMiOiJzdHVuOnN0dW4xLmwuZ29vZ2xlLmNvbToxOTMwMiJ9LHsidXJscyI6InN0dW46c3R1bjIubC5nb29nbGUuY29tOjE5MzAyIn0seyJ1cmxzIjoic3R1bjpzdHVuMy5zLmdvb2dsZS5jb206MTkzMDIifSx7InVybHMiOiJzdHVuOnN0dW40LmwuZ29vZ2xlLmNvbToxOTMwMiJ9LHsidXJscyI6InN0dW46c3R1bi5zdHVucHJvdG9jb2wub3JnOjM0NzgifSx7InVybHMiOiJzdHVuOnN0dW4udm9pcGJ1c3Rlci5jb206MzQ3OCJ9LHsidXJscyI6InN0dW46c3R1bi52b2lwc3R1bnQuY29tOjM0NzgifV0='));
  
  // ASCII文字セット（明度順、暗→明）
  static ASCII_CHARS = " .,:;ico%k0S@QNW";
  static CHAR_COUNT = Config.ASCII_CHARS.length;
  static AA_WIDTH = 80;
  static AA_HEIGHT = 60;
}

const _byId = (id) => document.getElementById(id);

const Elm = {
  keyword: _byId('keyword'),
  clearBtn: _byId('clearBtn'),
  connectBtn: _byId('connectBtn'),
  leaveBtn: _byId('leaveBtn'),
  statusText: _byId('statusText'),
  timer: _byId('timer'),
  statusText2: _byId('statusText2'),
  timer2: _byId('timer2'),
  localVideo: _byId('localVideo'),
  remoteVideo: _byId('remoteVideo'),
  localAA: _byId('localAA'),
  remoteAA: _byId('remoteAA'),
  canvas: _byId('canvas'),
  videoSelect: _byId('videoSelect'),
  audioSelect: _byId('audioSelect'),
  refreshDevices: _byId('refreshDevices'),
  deviceBtn: _byId('deviceBtn'),
  mobileDeviceBtn: _byId('mobileDeviceBtn'),
  deviceDialog: _byId('deviceDialog'),
  closeDialog: _byId('closeDialog'),
  videoSelectDialog: _byId('videoSelectDialog'),
  audioSelectDialog: _byId('audioSelectDialog'),
  refreshDevicesDialog: _byId('refreshDevicesDialog'),
  applyDevices: _byId('applyDevices'),
  helpBtn: _byId('helpBtn'),
  helpDialog: _byId('helpDialog'),
  closeHelpDialog: _byId('closeHelpDialog'),
  mobileHelpBtn: _byId('mobileHelpBtn'),
  // ID-based elements added to HTML
  container: _byId('container'),
  title: _byId('title'),
  controls: _byId('controls'),
  desktopStatus: _byId('desktopStatus'),
  chatArea: _byId('chatArea'),
  mobileStatus: _byId('mobileStatus'),
  remoteTitle: _byId('remoteTitle'),
  localTitle: _byId('localTitle'),
  viewport: _byId('viewport')
};


// Utility class for utility functions
class Utility {
  // セッショントークン生成
  static generateSessionToken() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 16; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  static generateSuggestedKeyword(baseKeyword) {
    const suffixes = ['2', '3', 'b', 'alt', 'new', 'x'];
    const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return baseKeyword + randomSuffix;
  }

  // XOR暗号化用の関数
  static xorEncrypt(text, key) {
    const encrypted = [];
    for (let i = 0; i < text.length; i++) {
      encrypted.push(String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length)));
    }
    return btoa(encrypted.join(''));
  }

  static xorDecrypt(encryptedBase64, key) {
    const encrypted = atob(encryptedBase64);
    const decrypted = [];
    for (let i = 0; i < encrypted.length; i++) {
      decrypted.push(String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)));
    }
    return decrypted.join('');
  }
}

// MediaManager class for device and stream management
class MediaManager {
  constructor() {
    this.localStream = null;
    this.availableDevices = {
      videoDevices: [],
      audioDevices: []
    };
    this.selectedDeviceIds = {
      video: null,
      audio: null
    };
  }

  async getAvailableDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      this.availableDevices.videoDevices = devices.filter(device => device.kind === 'videoinput');
      this.availableDevices.audioDevices = devices.filter(device => device.kind === 'audioinput');

      console.log('ビデオデバイス:', this.availableDevices.videoDevices.length);
      console.log('音声デバイス:', this.availableDevices.audioDevices.length);

      this.updateDeviceSelects();

    } catch (error) {
      console.error('デバイス取得エラー:', error);
    }
  }

  getSelectedDeviceIds() {
    return {
      video: Elm.videoSelect.value || undefined,
      audio: Elm.audioSelect.value || undefined
    };
  }

  async startCamera() {
    try {
      const deviceIds = this.getSelectedDeviceIds();

      // 80x60で試行
      try {
        const constraints = {
          video: {
            width: { exact: 80 },
            height: { exact: 60 },
            frameRate: { ideal: 60, min: 30 },
            facingMode: 'user'
          },
          audio: true
        };

        // デバイスIDが選択されている場合は指定
        if (deviceIds.video) {
          constraints.video.deviceId = { exact: deviceIds.video };
          delete constraints.video.facingMode; // deviceId指定時はfacingModeを削除
        }
        if (deviceIds.audio) {
          constraints.audio = { deviceId: { exact: deviceIds.audio } };
        }

        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        // フォールバック: 160x120
        try {
          const constraints = {
            video: {
              width: { exact: 160 },
              height: { exact: 120 },
              frameRate: { ideal: 60, min: 30 },
              facingMode: 'user'
            },
            audio: true
          };

          if (deviceIds.video) {
            constraints.video.deviceId = { exact: deviceIds.video };
            delete constraints.video.facingMode;
          }
          if (deviceIds.audio) {
            constraints.audio = { deviceId: { exact: deviceIds.audio } };
          }

          this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
          // 最終フォールバック: 320x240
          const constraints = {
            video: {
              width: { exact: 320 },
              height: { exact: 240 },
              frameRate: { ideal: 60, min: 30 },
              facingMode: 'user'
            },
            audio: true
          };

          if (deviceIds.video) {
            constraints.video.deviceId = { exact: deviceIds.video };
            delete constraints.video.facingMode;
          }
          if (deviceIds.audio) {
            constraints.audio = { deviceId: { exact: deviceIds.audio } };
          }

          this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
        }
      }

      Elm.localVideo.srcObject = this.localStream;
      console.log('カメラ解像度:', Elm.localVideo.videoWidth, 'x', Elm.localVideo.videoHeight);

      // 使用中のデバイス情報を保存
      const videoTrack = this.localStream.getVideoTracks()[0];
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (videoTrack) {
        this.selectedDeviceIds.video = videoTrack.getSettings().deviceId;
        console.log('使用中ビデオデバイス:', videoTrack.label);
      }
      if (audioTrack) {
        this.selectedDeviceIds.audio = audioTrack.getSettings().deviceId;
        console.log('使用中音声デバイス:', audioTrack.label);
      }

      // ローカルビデオの適切な再生処理
      await playVideoSafely(Elm.localVideo, 'ローカル');

      return true;
    } catch (error) {
      console.error('カメラ起動エラー:', error);
      alert('カメラの起動に失敗しました: ' + error.message);
      return false;
    }
  }

  stopCamera() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
      Elm.localVideo.srcObject = null;
    }
  }

  getVideoConstraints() {
    return {
      width: { exact: 80 },
      height: { exact: 60 },
      frameRate: { ideal: 60, min: 30 },
      facingMode: 'user'
    };
  }

  async switchDeviceDuringCall(videoChanged, audioChanged, peerConnection) {
    const constraints = {};

    // 変更が必要なデバイスの制約を設定
    if (videoChanged) {
      constraints.video = this.selectedDeviceIds.video ?
        { deviceId: { exact: this.selectedDeviceIds.video }, ...this.getVideoConstraints() } :
        this.getVideoConstraints();
    }

    if (audioChanged) {
      constraints.audio = this.selectedDeviceIds.audio ?
        { deviceId: { exact: this.selectedDeviceIds.audio } } :
        true;
    }

    console.log('デバイス切り替え開始:', constraints);

    // 新しいストリームを取得
    const newStream = await navigator.mediaDevices.getUserMedia(constraints);

    // トラックを置換
    const pc = webRTCManager.getPeerConnection();
    if (!pc) {
      console.error('PeerConnection is not available');
      return;
    }
    const senders = pc.getSenders();

    if (videoChanged) {
      const newVideoTrack = newStream.getVideoTracks()[0];
      const videoSender = senders.find(sender => sender.track && sender.track.kind === 'video');

      if (videoSender && newVideoTrack) {
        await videoSender.replaceTrack(newVideoTrack);

        // 古いビデオトラックを停止
        const oldVideoTrack = this.localStream.getVideoTracks()[0];
        if (oldVideoTrack) {
          oldVideoTrack.stop();
          this.localStream.removeTrack(oldVideoTrack);
        }
        this.localStream.addTrack(newVideoTrack);
      }
    }

    if (audioChanged) {
      const newAudioTrack = newStream.getAudioTracks()[0];
      const audioSender = senders.find(sender => sender.track && sender.track.kind === 'audio');

      if (audioSender && newAudioTrack) {
        await audioSender.replaceTrack(newAudioTrack);

        // 古いオーディオトラックを停止
        const oldAudioTrack = this.localStream.getAudioTracks()[0];
        if (oldAudioTrack) {
          oldAudioTrack.stop();
          this.localStream.removeTrack(oldAudioTrack);
        }
        this.localStream.addTrack(newAudioTrack);
      }
    }

    // 新しいトラックを使用中のストリームに反映
    Elm.localVideo.srcObject = this.localStream;

    // 使用中のトラックのうち、新しいストリームに含まれないものを停止
    newStream.getTracks().forEach(track => {
      if (!this.localStream.getTracks().includes(track)) {
        track.stop();
      }
    });

    console.log('デバイス切り替え完了');
  }

  updateDeviceSelects() {
    // デスクトップ用
    updateSelectOptions(Elm.videoSelect, this.getAvailableVideoDevices(), 'カメラ');
    updateSelectOptions(Elm.audioSelect, this.getAvailableAudioDevices(), 'マイク');

    // ダイアログ用
    updateSelectOptions(Elm.videoSelectDialog, this.getAvailableVideoDevices(), 'カメラ');
    updateSelectOptions(Elm.audioSelectDialog, this.getAvailableAudioDevices(), 'マイク');

    // 現在の選択を保持
    if (this.selectedDeviceIds.video) {
      Elm.videoSelect.value = this.selectedDeviceIds.video;
      Elm.videoSelectDialog.value = this.selectedDeviceIds.video;
    }
    if (this.selectedDeviceIds.audio) {
      Elm.audioSelect.value = this.selectedDeviceIds.audio;
      Elm.audioSelectDialog.value = this.selectedDeviceIds.audio;
    }
  }

  getLocalStream() {
    return this.localStream;
  }

  getAvailableVideoDevices() {
    return this.availableDevices.videoDevices;
  }

  getAvailableAudioDevices() {
    return this.availableDevices.audioDevices;
  }

  async applyDeviceSelection(sessionManager, webRTCManager, closeDialogCallback) {
    const newVideoDeviceId = Elm.videoSelectDialog.value;
    const newAudioDeviceId = Elm.audioSelectDialog.value;

    // デバイス変更があるかチェック
    const videoChanged = this.selectedDeviceIds.video !== newVideoDeviceId;
    const audioChanged = this.selectedDeviceIds.audio !== newAudioDeviceId;

    if (!videoChanged && !audioChanged) {
      closeDialogCallback();
      return;
    }

    // 選択デバイスIDを更新
    this.selectedDeviceIds.video = newVideoDeviceId;
    this.selectedDeviceIds.audio = newAudioDeviceId;

    // デスクトップ用の選択も同期
    Elm.videoSelect.value = this.selectedDeviceIds.video;
    Elm.audioSelect.value = this.selectedDeviceIds.audio;

    console.log('デバイス選択適用:', {
      video: Elm.videoSelectDialog.options[Elm.videoSelectDialog.selectedIndex]?.text,
      audio: Elm.audioSelectDialog.options[Elm.audioSelectDialog.selectedIndex]?.text,
      sessionActive: sessionManager.sessionActive
    });

    // 通話中の場合はデバイスを切り替え
    if (sessionManager.sessionActive && this.getLocalStream() && webRTCManager.getPeerConnection()) {
      try {
        await this.switchDeviceDuringCall(videoChanged, audioChanged, webRTCManager.getPeerConnection());
      } catch (error) {
        console.error('通話中のデバイス切り替えエラー:', error);
        alert('デバイスの切り替えに失敗しました: ' + error.message);
      }
    }

    closeDialogCallback();
  }
}

// SessionManager class for session state management
class SessionManager {
  constructor() {
    this.isHost = false;
    this.sessionToken = null;
    this.currentKeyword = null;
    this.sessionActive = false;
    this.startTime = null;
    this.connectionEstablished = false;
  }

  reset() {
    this.isHost = false;
    this.sessionToken = null;
    this.currentKeyword = null;
    this.sessionActive = false;
    this.startTime = null;
    this.connectionEstablished = false;
  }

  startSession(isHost, keyword) {
    this.isHost = isHost;
    this.currentKeyword = keyword;
    this.sessionActive = true;
    this.startTime = Date.now();
    this.sessionToken = Utility.generateSessionToken();
  }

  endSession() {
    this.sessionActive = false;
    this.connectionEstablished = false;
  }

  getSessionDuration() {
    if (!this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  isSessionExpired(maxDuration = 600) {
    return this.getSessionDuration() >= maxDuration;
  }

  getRemainingTime(maxDuration = 600) {
    const elapsed = this.getSessionDuration();
    return Math.max(0, maxDuration - elapsed);
  }
}

// WebRTCManager class for peer connection management
class WebRTCManager {
  constructor() {
    this.peerConnection = null;
    this.dataChannel = null;
    this.iceCandidates = [];
    this.iceGatheringTimeout = null;
  }

  async createPeerConnection() {
    this.peerConnection = new RTCPeerConnection({
      iceServers: Config.STUN_SERVERS,
      iceCandidatePoolSize: 10, // ICE候補のプールサイズを増やす
      bundlePolicy: 'max-bundle', // メディアバンドル最大化
      rtcpMuxPolicy: 'require' // RTCP多重化
    });

    console.log('ローカルストリーム追加開始');
    mediaManager.getLocalStream().getTracks().forEach(track => {
      console.log('トラック追加:', track.kind, track.enabled, 'readyState:', track.readyState);
      if (track.readyState === 'live') {
        this.peerConnection.addTrack(track, mediaManager.getLocalStream());
      } else {
        console.warn('トラックが無効:', track.kind, track.readyState);
      }
    });
    console.log('ローカルストリーム追加完了');

    // 高FPS設定をトラック追加後に設定
    setTimeout(async () => {
      if (!this.peerConnection) {
        console.warn('PeerConnection is already closed');
        return;
      }
      const sender = this.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) {
        const params = sender.getParameters();
        if (params.encodings && params.encodings.length > 0) {
          params.encodings[0].maxBitrate = 50000; // 50kbps（高FPS用に増加）
          params.encodings[0].maxFramerate = 60; // 60FPS設定
          await sender.setParameters(params);
          console.log('高FPS設定: 60fps, 50kbps');
        }
      }
    }, 1000);

    this.peerConnection.ontrack = (event) => {
      console.log('リモートトラック受信:', event.track.kind);
      console.log('Remote video element:', Elm.remoteVideo);
      console.log('Event streams:', event.streams);

      if (Elm.remoteVideo && event.streams[0]) {
        Elm.remoteVideo.srcObject = event.streams[0];
        Elm.remoteVideo.onloadedmetadata = () => {
          console.log('リモートビデオサイズ:', Elm.remoteVideo.videoWidth, 'x', Elm.remoteVideo.videoHeight);
          console.log('Remote video ready for AA conversion');
        };

        // より確実なビデオ準備待ち
        Elm.remoteVideo.oncanplay = () => {
          console.log('Remote video can play - forcing play');
          Elm.remoteVideo.play().catch(e => console.log('Remote video play failed:', e));
        };

        // リモートビデオの適切な再生処理
        playVideoSafely(Elm.remoteVideo, 'リモート');
      } else {
        console.error('Missing remote video element or stream');
      }
    };

    this.peerConnection.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log('ICE候補収集:', event.candidate.type, event.candidate.address);
        this.iceCandidates.push(event.candidate);

        // タイムアウトをリセット
        if (this.iceGatheringTimeout) clearTimeout(this.iceGatheringTimeout);

        // 3秒待ってから送信（より多くの候補を収集）
        this.iceGatheringTimeout = setTimeout(async () => {
          console.log('ICE候補収集タイムアウト. 候補数:', this.iceCandidates.length);
          if (this.iceCandidates.length > 0) {
            const keyword = sessionManager.currentKeyword || Elm.keyword.value;
            const iceKey = sessionManager.sessionToken ?
              `${keyword}/${sessionManager.sessionToken}/ice-${sessionManager.isHost ? 'host' : 'guest'}` :
              `${keyword}-ice-${sessionManager.isHost ? 'host' : 'guest'}`;
            console.log('ICE候補送信:', iceKey);
            await signalingManager.sendSignal(iceKey, {
              type: 'ice-batch',
              candidates: this.iceCandidates,
              isHost: sessionManager.isHost
            });
          }
        }, 3000);
      } else {
        // ICE候補収集完了
        if (this.iceGatheringTimeout) clearTimeout(this.iceGatheringTimeout);
        console.log('ICE候補収集完了. 候補数:', this.iceCandidates.length);
        if (this.iceCandidates.length > 0) {
          const keyword = sessionManager.currentKeyword || Elm.keyword.value;
          const iceKey = sessionManager.sessionToken ?
            `${keyword}/${sessionManager.sessionToken}/ice-${sessionManager.isHost ? 'host' : 'guest'}` :
            `${keyword}-ice-${sessionManager.isHost ? 'host' : 'guest'}`;
          console.log('ICE候補送信:', iceKey);
          await signalingManager.sendSignal(iceKey, {
            type: 'ice-batch',
            candidates: this.iceCandidates,
            isHost: sessionManager.isHost
          });
        }
      }
    };

    this.setupConnectionEventHandlers();
  }

  setupConnectionEventHandlers() {
    this.peerConnection.onconnectionstatechange = async () => {
      console.log('接続状態:', this.peerConnection.connectionState);

      if (this.peerConnection.connectionState === 'connected') {
        sessionManager.sessionActive = true;
        sessionManager.connectionEstablished = true;
        aaChat.isWaitingForGuest = false;
        aaChat.reconnectAttempts = 0;
        clearKeywordTimer();
        stopAllPolling(); // 接続完了時にポーリング停止

        // connectionTypeを取得して表示（何度か試行）
        console.log('onconnectionstatechange: 接続完了を検出');
        await updateConnectionInfo(true);

        // connectionTypeが取得できない場合に備えて数回リトライ
        let retryCount = 0;
        const retryTimer = setInterval(async () => {
          retryCount++;
          const connectionType = await getConnectionType();
          if (connectionType) {
            console.log('接続完了ステータス更新:', connectionType);
            uiManager.updateStatus(`接続完了 (${connectionType})`);
            clearInterval(retryTimer);
          } else if (retryCount >= 5) {
            // 5回リトライしても取得できない場合は接続完了のみ表示
            uiManager.updateStatus('接続完了');
            clearInterval(retryTimer);
          }
        }, 2000);
      } else if (this.peerConnection.connectionState === 'disconnected' ||
        this.peerConnection.connectionState === 'failed') {
        if (sessionManager.connectionEstablished) {
          // 一度接続した後の切断の場合
          sessionManager.connectionEstablished = false;
          sessionManager.sessionActive = false;

          if (sessionManager.isHost) {
            // ホストは最初からやり直し
            uiManager.updateStatus('参加者が退室しました。新しいセッションを開始中...');
            setTimeout(() => {
              restartHostSession();
            }, 1000);
          } else {
            // ゲストは新ホストに昇格
            uiManager.updateStatus('ホストが退室しました。新ホストとして待機中...');
            promoteGuestToHost();
          }
        } else {
          handleDisconnect();
        }
      }
    };

    // ICE接続状態の監視
    this.peerConnection.oniceconnectionstatechange = async () => {
      console.log('ICE接続状態:', this.peerConnection.iceConnectionState);

      // ICE接続が完了した場合はステータスを更新
      if (this.peerConnection.iceConnectionState === 'connected') {
        await updateConnectionInfo(true);
      } else {
        updateConnectionInfo();
      }
    };

    // ICE収集状態の監視
    this.peerConnection.onicegatheringstatechange = () => {
      console.log('ICE収集状態:', this.peerConnection.iceGatheringState);
      updateConnectionInfo();
    };
  }

  setupDataChannel() {
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
    await this.peerConnection.setRemoteDescription(description);
  }

  async addIceCandidate(candidate) {
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
  }
}

// SignalingManager class for piping server communication
class SignalingManager {
  constructor() {
    this.abortController = null;
  }

  async sendSignal(keyword, data) {
    console.log('送信中:', keyword, 'データタイプ:', data.type);
    const json = JSON.stringify(data);
    const encrypted = Utility.xorEncrypt(json, keyword);

    const response = await fetch(`${Config.PPNG_SERVER}/aachat/${keyword}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: encrypted
    });

    if (!response.ok) {
      console.error('送信エラー:', response.status, response.statusText);
      const error = new Error('シグナル送信エラー');
      error.status = response.status;
      throw error;
    }
    console.log('送信成功:', keyword);
  }

  async receiveSignal(keyword) {
    console.log('受信試行:', keyword);

    // AbortControllerを作成（既存のものがあればキャンセル）
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();

    try {
      const response = await fetch(`${Config.PPNG_SERVER}/aachat/${keyword}`, {
        signal: this.abortController.signal
      });

      if (!response.ok) {
        if (response.status === 400) {
          console.log('受信結果: データなし (400)');
          return null;
        }
        console.error('受信エラー:', response.status, response.statusText);
        throw new Error('シグナル受信エラー');
      }

      console.log('受信成功:', keyword);
      const encrypted = await response.text();
      const decrypted = Utility.xorDecrypt(encrypted, keyword);
      const data = JSON.parse(decrypted);
      console.log('受信データ:', data.type);
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('受信キャンセル:', keyword);
        return null;
      }
      console.error('受信エラー:', error);
      throw error;
    }
  }

  abortCurrentRequest() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      console.log('piping serverへの接続をキャンセルしました');
    }
  }
}

// ASCIIConverter class for video processing
class ASCIIConverter {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.minBrightness = 0;
    this.maxBrightness = 255;
    this.dynamicRangeEnabled = true;
    this.contrastTimer = null;
    this.conversionTimer = null;
    this.lastRemoteVideoLogTime = 0;
  }

  videoToAscii(video) {
    if (!video.videoWidth || !video.videoHeight) return '';

    this.canvas.width = Config.AA_WIDTH;
    this.canvas.height = Config.AA_HEIGHT;

    this.ctx.drawImage(video, 0, 0, Config.AA_WIDTH, Config.AA_HEIGHT);
    const imageData = this.ctx.getImageData(0, 0, Config.AA_WIDTH, Config.AA_HEIGHT);
    const pixels = imageData.data;

    let ascii = '';
    for (let y = 0; y < Config.AA_HEIGHT; y++) {
      for (let x = 0; x < Config.AA_WIDTH; x++) {
        const i = (y * Config.AA_WIDTH + x) * 4;
        let brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;

        // ダイナミックレンジ調整
        if (this.dynamicRangeEnabled && this.maxBrightness > this.minBrightness) {
          // 現在の輝度を0-1の範囲に正規化
          brightness = (brightness - this.minBrightness) / (this.maxBrightness - this.minBrightness);
          brightness = Math.max(0, Math.min(1, brightness)); // クリップ

          // ASCII_CHARSのインデックスに変換
          const charIndex = Math.floor(brightness * (Config.CHAR_COUNT - 1));
          ascii += Config.ASCII_CHARS[charIndex];
        } else {
          // 通常の変換
          const charIndex = Math.floor((brightness / 255) * (Config.CHAR_COUNT - 1));
          ascii += Config.ASCII_CHARS[charIndex];
        }
      }
      ascii += '\n';
    }

    return ascii;
  }

  analyzeAndAdjustContrast(video) {
    if (!video.videoWidth || !video.videoHeight) return;

    // サンプリング用の小さいキャンバス
    const sampleWidth = 64;
    const sampleHeight = 64;
    this.canvas.width = sampleWidth;
    this.canvas.height = sampleHeight;

    this.ctx.drawImage(video, 0, 0, sampleWidth, sampleHeight);
    const imageData = this.ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const pixels = imageData.data;

    // 明度の統計を計算
    let min = 255;
    let max = 0;
    let sum = 0;
    let count = 0;
    const brightnessValues = [];

    for (let i = 0; i < pixels.length; i += 4) {
      const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      brightnessValues.push(brightness);
      min = Math.min(min, brightness);
      max = Math.max(max, brightness);
      sum += brightness;
      count++;
    }

    const mean = sum / count;

    // 分散と標準偏差を計算
    let variance = 0;
    for (const brightness of brightnessValues) {
      variance += Math.pow(brightness - mean, 2);
    }
    variance /= count;
    const stdDev = Math.sqrt(variance);

    // パーセンタイルを計算（外れ値除去のため）
    brightnessValues.sort((a, b) => a - b);
    const percentile5 = brightnessValues[Math.floor(count * 0.05)];
    const percentile95 = brightnessValues[Math.floor(count * 0.95)];

    // 分散に基づいた調整
    if (stdDev < 20) {
      // 低分散（単調な画像）: より積極的にレンジを拡張
      this.minBrightness = Math.max(0, mean - stdDev * 3);
      this.maxBrightness = Math.min(255, mean + stdDev * 3);
    } else if (stdDev > 60) {
      // 高分散（コントラストが高い）: 外れ値を除外
      this.minBrightness = Math.max(0, percentile5 - 10);
      this.maxBrightness = Math.min(255, percentile95 + 10);
    } else {
      // 中分散: バランスの取れた調整
      const margin = stdDev * 0.5;
      this.minBrightness = Math.max(0, min - margin);
      this.maxBrightness = Math.min(255, max + margin);
    }

    // レンジが狭すぎる場合は調整
    if (this.maxBrightness - this.minBrightness < 30) {
      const center = (this.minBrightness + this.maxBrightness) / 2;
      this.minBrightness = Math.max(0, center - 15);
      this.maxBrightness = Math.min(255, center + 15);
    }
  }

  startConversion(localVideo, remoteVideo, localAA, remoteAA) {
    // 既に動作中の場合は停止してから再開
    this.stopConversion();

    // コントラスト調整タイマー（1秒ごと）
    this.contrastTimer = setInterval(() => {
      if (localVideo.srcObject && localVideo.videoWidth > 0) {
        this.analyzeAndAdjustContrast(localVideo);
      }
    }, 1000);

    // AA変換タイマー（60fpsに合わせて約16msごと）
    this.conversionTimer = setInterval(() => {
      // ローカルビデオからAAを生成して表示
      if (localVideo.srcObject && localVideo.videoWidth > 0) {
        const localAAText = this.videoToAscii(localVideo);
        localAA.textContent = localAAText;
      }

      // リモートビデオからAAを生成して表示
      if (remoteVideo.srcObject && remoteVideo.videoWidth > 0) {
        const remoteAAText = this.videoToAscii(remoteVideo);
        remoteAA.textContent = remoteAAText;
      } else if (remoteVideo.srcObject && remoteVideo.videoWidth === 0) {
        // リモートビデオがあるがサイズが0の場合のログ（5秒間隔で制限）
        const now = Date.now();
        if (now - this.lastRemoteVideoLogTime > 5000) {
          console.log('Remote video has stream but no dimensions:', {
            readyState: remoteVideo.readyState,
            paused: remoteVideo.paused,
            videoWidth: remoteVideo.videoWidth,
            videoHeight: remoteVideo.videoHeight
          });
          this.lastRemoteVideoLogTime = now;
        }
      }
    }, 16); // 約60fps
  }

  stopConversion() {
    if (this.contrastTimer) {
      clearInterval(this.contrastTimer);
      this.contrastTimer = null;
    }
    if (this.conversionTimer) {
      clearInterval(this.conversionTimer);
      this.conversionTimer = null;
    }
  }
}

// UIManager class for DOM operations
class UIManager {
  constructor() {
    this.isKeywordFromURL = false; // URL由来のキーワードフラグ
  }

  updateStatus(text) {
    Elm.statusText.textContent = text;
    Elm.statusText2.textContent = text;
  }

  toggleButtons(enabled) {
    Elm.connectBtn.disabled = !enabled;

    // モバイルでもボタンを完全に非表示にする
    Elm.connectBtn.style.display = enabled ? 'inline-block' : 'none';
    Elm.leaveBtn.style.display = enabled ? 'none' : 'inline-block';
    
    // クリアボタンはセッション中（enabled=false）には非表示
    if (!enabled) {
      Elm.clearBtn.style.display = 'none';
    } else {
      // セッション終了時は、URL由来のキーワードがある場合のみ表示
      const urlParams = new URLSearchParams(window.location.search);
      const hasKeywordFromURL = urlParams.get('k');
      Elm.clearBtn.style.display = hasKeywordFromURL ? 'inline-block' : 'none';
    }

    // キーワード入力のロック状態を更新（enabled=falseはセッション中を意味する）
    this.updateKeywordLockState(!enabled);
  }

  adjustAAFontSize() {
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;

    // モバイルの場合は個別に調整
    if (containerWidth <= 768) {
      this.adjustMobileAASize();
      return;
    }

    // タブレットの場合は画面に収まるように調整
    if (containerWidth <= 1200) {
      // 縦向きか横向きかを判定
      const isPortrait = containerHeight > containerWidth;

      let availableWidth, availableHeight, fontSizeByWidth, fontSizeByHeight;

      if (isPortrait) {
        // 縦向きタブレット：縦並びレイアウト
        availableWidth = containerWidth - 40; // 1つのAAエリア + マージン
        availableHeight = (containerHeight - 160) / 2; // 2つのAAエリア + コントロール
        fontSizeByWidth = availableWidth / (80 * 0.6 + 79 * 0.4);
        fontSizeByHeight = availableHeight / 60;
      } else {
        // 横向きタブレット：横並びレイアウト
        availableWidth = (containerWidth - 60) / 2; // 2つのAAエリア + マージン
        availableHeight = containerHeight - 120; // コントロール分を除く
        fontSizeByWidth = availableWidth / (80 * 0.6 + 79 * 0.4);
        fontSizeByHeight = availableHeight / 60;
      }

      const tabletFontSize = Math.max(6, Math.min(fontSizeByWidth, fontSizeByHeight, 16));
      document.documentElement.style.setProperty('--aa-font-size', `${tabletFontSize}px`);
      console.log('タブレットAAサイズ調整:', tabletFontSize + 'px', {
        isPortrait,
        availableWidth,
        availableHeight,
        fontSizeByWidth,
        fontSizeByHeight
      });
      return;
    }

    // デスクトップの場合は実際のコンテナサイズを計算
    const chatArea = Elm.chatArea;

    // 実際に使用されているスペースを計算
    const h1 = Elm.title;
    const controls = Elm.controls;
    const desktopStatus = Elm.desktopStatus;
    const container = Elm.container;

    let usedHeight = 0;
    if (h1) usedHeight += h1.offsetHeight + parseInt(getComputedStyle(h1).marginTop) + parseInt(getComputedStyle(h1).marginBottom);
    if (controls) usedHeight += controls.offsetHeight + parseInt(getComputedStyle(controls).marginTop) + parseInt(getComputedStyle(controls).marginBottom);
    if (desktopStatus) usedHeight += desktopStatus.offsetHeight + parseInt(getComputedStyle(desktopStatus).marginTop) + parseInt(getComputedStyle(desktopStatus).marginBottom);
    if (container) {
      const containerPadding = parseInt(getComputedStyle(container).paddingTop) + parseInt(getComputedStyle(container).paddingBottom);
      usedHeight += containerPadding;
    }

    const actualChatAreaHeight = containerHeight - usedHeight;
    const actualChatAreaWidth = chatArea ? chatArea.clientWidth : containerWidth - 20;

    let fontSize;

    if (containerWidth > 1200) {
      // 横並びレイアウト - 2つのAAエリアが横に並ぶ
      // CSSのgapサイズを動的に取得
      const chatAreaStyles = getComputedStyle(chatArea);
      const gapSize = parseInt(chatAreaStyles.gap) || 0;
      const availableWidthPerArea = (actualChatAreaWidth - gapSize) / 2;

      // video-container内でのh3タイトルの実際の高さを取得
      const sampleH3 = Elm.remoteTitle;
      const titleHeight = sampleH3 ? sampleH3.offsetHeight : 0;
      const availableHeightPerArea = actualChatAreaHeight - titleHeight;

      // CSS width formula: calc(80 * fontSize * 0.6 + 79 * fontSize * 0.4)
      const widthMultiplier = 80 * 0.6 + 79 * 0.4; // = 79.6
      const fontSizeByWidth = availableWidthPerArea / widthMultiplier;
      const fontSizeByHeight = availableHeightPerArea / 60;

      fontSize = Math.min(fontSizeByWidth, fontSizeByHeight, 20);
    } else {
      // 縦並びレイアウト - AAエリアが縦に並ぶ
      const availableWidth = actualChatAreaWidth;

      // 実際のDOM要素のサイズを取得
      const mobileStatus = Elm.mobileStatus;
      const mobileStatusHeight = mobileStatus ? mobileStatus.offsetHeight : 0;

      // h3タイトル要素の実際の高さを取得（2つ分）
      const h3Elements = [Elm.remoteTitle, Elm.localTitle];
      let totalTitleHeight = 0;
      h3Elements.forEach(h3 => {
        if (h3) totalTitleHeight += h3.offsetHeight;
      });

      const availableHeightPerArea = (actualChatAreaHeight - mobileStatusHeight - totalTitleHeight) / 2;

      const widthMultiplier = 80 * 0.6 + 79 * 0.4; // = 79.6
      const fontSizeByWidth = availableWidth / widthMultiplier;
      const fontSizeByHeight = availableHeightPerArea / 60;

      fontSize = Math.min(fontSizeByWidth, fontSizeByHeight, 18);
    }

    fontSize = Math.max(fontSize, 8); // 最小8px

    // CSSカスタムプロパティで動的に設定
    document.documentElement.style.setProperty('--aa-font-size', `${fontSize}px`);

    // 設定後に実際のサイズを検証して調整
    setTimeout(() => {
      this.validateAndAdjustAASize(fontSize);
    }, 100);

    console.log('AA表示フォントサイズ調整:', fontSize + 'px', {
      containerWidth,
      containerHeight,
      actualChatAreaWidth,
      actualChatAreaHeight,
      layout: containerWidth > 1200 ? '横並び' : '縦並び'
    });
  }

  validateAndAdjustAASize(initialFontSize) {
    const aaDisplays = [Elm.localAA, Elm.remoteAA];
    const chatArea = Elm.chatArea;

    if (!chatArea || aaDisplays.length === 0) return;

    const chatAreaRect = chatArea.getBoundingClientRect();
    let needsAdjustment = false;
    let adjustmentFactor = 1.0;

    aaDisplays.forEach(display => {
      const rect = display.getBoundingClientRect();

      // 幅のはみ出しチェック
      if (rect.width > chatAreaRect.width) {
        const widthFactor = (chatAreaRect.width - 20) / rect.width; // 20px マージン
        adjustmentFactor = Math.min(adjustmentFactor, widthFactor);
        needsAdjustment = true;
        console.log('幅はみ出し検出:', rect.width, '>', chatAreaRect.width);
      }

      // 高さのはみ出しチェック（親コンテナとの比較）
      const container = display.closest('.video-container');
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const titleHeight = 30; // h3タイトル分
        const availableHeight = containerRect.height - titleHeight;

        if (rect.height > availableHeight) {
          const heightFactor = availableHeight / rect.height;
          adjustmentFactor = Math.min(adjustmentFactor, heightFactor);
          needsAdjustment = true;
          console.log('高さはみ出し検出:', rect.height, '>', availableHeight);
        }
      }
    });

    if (needsAdjustment) {
      const adjustedFontSize = Math.max(initialFontSize * adjustmentFactor, 6);
      document.documentElement.style.setProperty('--aa-font-size', `${adjustedFontSize}px`);
      console.log('AAサイズ再調整:', initialFontSize + 'px', '->', adjustedFontSize + 'px', '調整係数:', adjustmentFactor);
    }
  }

  adjustMobileAASize() {
    const remoteAA = Elm.remoteAA;
    const localAA = Elm.localAA;

    // 実際のDOM要素から利用可能高さを計算
    const h1 = Elm.title;
    const controls = Elm.controls;
    const container = Elm.container;

    const h1Height = h1 ? h1.offsetHeight + parseInt(getComputedStyle(h1).marginTop) + parseInt(getComputedStyle(h1).marginBottom) : 0;
    const controlsHeight = controls ? controls.offsetHeight : 0;
    const containerPadding = container ? parseInt(getComputedStyle(container).paddingTop) + parseInt(getComputedStyle(container).paddingBottom) : 0;

    // Visual Viewport API対応（iOS キーボード表示時）
    const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const availableHeight = viewportHeight - h1Height - controlsHeight - containerPadding;

    // chat-area内の要素（mobile-status、h3タイトル）を考慮
    const mobileStatus = Elm.mobileStatus;
    const mobileStatusHeight = mobileStatus ? mobileStatus.offsetHeight : 0;

    const h3Elements = [Elm.remoteTitle, Elm.localTitle];
    let totalTitleHeight = 0;
    h3Elements.forEach(h3 => {
      if (h3) totalTitleHeight += h3.offsetHeight;
    });

    const availableAAHeight = availableHeight - mobileStatusHeight - totalTitleHeight;

    // より大胆なサイズ計算を試す
    const idealFontSize = availableAAHeight / (60 * 2.5); // 2.5倍で計算（2つのAAエリア分）

    // 幅の制約もチェック
    const containerWidth = window.innerWidth;
    const widthMultiplier = 80 * 0.6 + 79 * 0.4; // = 79.6
    const maxFontSizeByWidth = (containerWidth - 10) / widthMultiplier; // 10px マージン

    // 最終的なフォントサイズ
    let fontSize = Math.min(idealFontSize, maxFontSizeByWidth);
    fontSize = Math.max(4, Math.min(12, fontSize)); // 4-12pxの範囲（モバイル用に制限）

    console.log('モバイルAAサイズ計算:', {
      viewportHeight,
      h1Height,
      controlsHeight,
      containerPadding,
      availableHeight,
      availableAAHeight,
      fontSize
    });


    // CSS変数を設定（両方同じサイズ）
    document.documentElement.style.setProperty('--remote-aa-font-size', `${fontSize}px`);
    document.documentElement.style.setProperty('--aa-font-size', `${fontSize}px`);

    console.log('モバイルAAサイズ調整:', fontSize + 'px', {
      availableHeight,
      availableAAHeight,
      idealFontSize,
      maxFontSizeByWidth,
      mobileStatusHeight,
      totalTitleHeight,
      containerWidth,
      finalFontSize: fontSize,
      calculatedAAHeight: fontSize * 60 * 2
    });
  }

  openDeviceDialog() {
    Elm.deviceDialog.style.display = 'flex';
  }

  closeDeviceDialog() {
    Elm.deviceDialog.style.display = 'none';
  }

  openHelpDialog() {
    Elm.helpDialog.style.display = 'flex';
  }

  closeHelpDialog() {
    Elm.helpDialog.style.display = 'none';
  }

  loadKeywordFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const keyword = urlParams.get('k');
    if (keyword) {
      Elm.keyword.value = keyword;
      this.isKeywordFromURL = true; // URL由来のキーワードフラグ
      Elm.clearBtn.style.display = 'inline-block'; // クリアボタン表示
      console.log('URLからキーワードを読み込み:', keyword);
      
      // 接続ボタンにフォーカス（少し遅延してDOMが準備完了してから）
      setTimeout(() => {
        Elm.connectBtn.focus();
      }, 100);
    } else {
      this.isKeywordFromURL = false;
    }
    this.updateKeywordLockState(false); // 初期状態（セッション非アクティブ）で更新
  }

  updateKeywordLockState(sessionActive) {
    // k=パラメータ指定時は常にロック
    // セッション中（ホスト中・参加中）もロック
    // それ以外は編集可能
    const shouldLock = this.isKeywordFromURL || sessionActive;
    Elm.keyword.readOnly = shouldLock;

    console.log('キーワード入力状態:', shouldLock ? 'ロック' : '編集可能', {
      fromURL: this.isKeywordFromURL,
      sessionActive: sessionActive
    });
  }
}


// AAChat Main Class - coordinates all managers
class AAChat {
  constructor() {
    // Initialize managers
    this.mediaManager = new MediaManager();
    this.webRTCManager = new WebRTCManager();
    this.sessionManager = new SessionManager();
    this.signalingManager = new SignalingManager();

    // Initialize canvas and converters
    this.ctx = Elm.canvas.getContext('2d');
    this.asciiConverter = new ASCIIConverter(Elm.canvas, this.ctx);
    this.uiManager = new UIManager();

    // State variables
    this.keywordTimer = null;
    this.timerInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = null;
    this.activePollingIntervals = [];
    this.isWaitingForGuest = false;
  }
}

// Global instance
const aaChat = new AAChat();

// Backward compatibility - expose individual managers as globals
const mediaManager = aaChat.mediaManager;
const webRTCManager = aaChat.webRTCManager;
const sessionManager = aaChat.sessionManager;
const signalingManager = aaChat.signalingManager;
const asciiConverter = aaChat.asciiConverter;
const uiManager = aaChat.uiManager;
const ctx = aaChat.ctx;


function updateSelectOptions(selectElement, devices, prefix) {
  selectElement.innerHTML = '';
  devices.forEach((device, index) => {
    const option = document.createElement('option');
    option.value = device.deviceId;
    option.textContent = device.label || `${prefix} ${index + 1}`;
    selectElement.appendChild(option);
  });
}


async function playVideoSafely(videoElement, label) {
  return new Promise((resolve) => {
    const attemptPlay = () => {
      const playPromise = videoElement.play();

      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log(`${label}ビデオ再生開始`);
          resolve();
        }).catch(error => {
          console.log(`${label}ビデオ再生エラー:`, error.message);
          // 自動再生が拒否された場合は静かに失敗
          resolve();
        });
      } else {
        console.log(`${label}ビデオ: play() Promise未対応`);
        resolve();
      }
    };

    // ビデオが読み込まれるまで待機
    if (videoElement.readyState >= 2) {
      // 既に読み込み済み
      attemptPlay();
    } else {
      // loadeddataイベントを待つ
      const onLoadedData = () => {
        videoElement.removeEventListener('loadeddata', onLoadedData);
        attemptPlay();
      };
      videoElement.addEventListener('loadeddata', onLoadedData);

      // タイムアウト処理（5秒後）
      setTimeout(() => {
        videoElement.removeEventListener('loadeddata', onLoadedData);
        console.log(`${label}ビデオ読み込みタイムアウト`);
        resolve();
      }, 5000);
    }
  });
}


// ASCII変換処理は ASCIIConverter クラスに移動

function stopAllPolling() {
  aaChat.activePollingIntervals.forEach(intervalId => clearInterval(intervalId));
  aaChat.activePollingIntervals = [];
  console.log('全ポーリング停止');
}

function addPollingInterval(intervalId) {
  aaChat.activePollingIntervals.push(intervalId);
}



async function hostSession() {
  const keyword = Elm.keyword.value.trim();
  if (!keyword) {
    alert('キーワードを入力してください');
    return;
  }

  if (!await mediaManager.startCamera()) return;

  sessionManager.startSession(true, keyword);
  uiManager.updateStatus('接続準備中...');
  uiManager.toggleButtons(false);

  // ASCII変換を開始（ホスト開始時に必要）
  asciiConverter.startConversion(Elm.localVideo, Elm.remoteVideo, Elm.localAA, Elm.remoteAA);

  // セッショントークンは startSession で生成済み

  await webRTCManager.createPeerConnection();
  webRTCManager.setupDataChannel();

  // オファー作成時のオプションを追加
  const offer = await webRTCManager.createOffer();

  console.log('オファーを送信中:', keyword, 'トークン:', sessionManager.sessionToken);
  try {
    await signalingManager.sendSignal(keyword, {
      type: 'offer',
      offer: offer,
      token: sessionManager.sessionToken
    });
    console.log('オファー送信完了');
  } catch (error) {
    console.log('オファー送信エラー:', error.status, error.message);
    
    // 409エラーの場合は既存ホストが存在
    if (error.status === 409) {
      uiManager.updateStatus('エラー: このキーワードは既に使用されています');
      cleanup();
      return;
    }

    // その他のエラーの場合は表示して終了
    uiManager.updateStatus('接続エラー: ' + error.message);
    cleanup();
    return;
  }

  uiManager.updateStatus('参加者を待っています...');
  startKeywordTimer();

  pollForAnswer();
}

async function restartHostSession() {
  console.log('ホストセッション再開');

  // 既存の接続をクリーンアップ
  stopAllPolling();
  webRTCManager.close();
  // iceCandidates now managed by webRTCManager
  sessionManager.connectionEstablished = false;
  aaChat.isWaitingForGuest = false;
  sessionManager.sessionToken = Utility.generateSessionToken();

  // ローカルストリームが存在しない場合は再取得
  if (!mediaManager.getLocalStream()) {
    console.log('ローカルストリームを再取得中...');
    if (!await mediaManager.startCamera()) {
      uiManager.updateStatus('カメラアクセスエラー');
      return;
    }
  }

  // 新しいセッションを開始
  await webRTCManager.createPeerConnection();
  webRTCManager.setupDataChannel();

  const offer = await webRTCManager.createOffer();

  // 新しいトークンでオファーを送信
  console.log('新しいオファーを送信中:', sessionManager.currentKeyword, 'トークン:', sessionManager.sessionToken);
  await signalingManager.sendSignal(sessionManager.currentKeyword, {
    type: 'offer',
    offer: offer,
    token: sessionManager.sessionToken
  });
  console.log('新しいオファー送信完了');

  uiManager.updateStatus('新しい参加者を待っています...');
  pollForAnswer();
}

async function joinSession() {
  const keyword = Elm.keyword.value.trim();
  if (!keyword) {
    alert('キーワードを入力してください');
    return;
  }

  // 既存ストリームのクリーンアップ
  if (mediaManager.getLocalStream()) {
    mediaManager.stopCamera();
  }

  if (!await mediaManager.startCamera()) return;

  sessionManager.startSession(false, keyword);
  uiManager.updateStatus('接続中...');
  uiManager.toggleButtons(false);

  // ASCII変換を再開（再参加時に必要）
  asciiConverter.startConversion(Elm.localVideo, Elm.remoteVideo, Elm.localAA, Elm.remoteAA);

  // シンプルにポーリングで検索
  startJoinPolling();
}

// 自動ロール決定による統一接続関数
async function connectSession() {
  const keyword = Elm.keyword.value.trim();
  if (!keyword) {
    alert('キーワードを入力してください');
    return;
  }

  // 既存ストリームのクリーンアップ
  if (mediaManager.getLocalStream()) {
    mediaManager.stopCamera();
  }

  if (!await mediaManager.startCamera()) return;

  uiManager.updateStatus('接続中...');
  uiManager.toggleButtons(false);

  try {
    // まずホストロールを試行
    console.log('ホストロールを試行中:', keyword);
    await attemptHostRole(keyword);
  } catch (error) {
    if (error.status === 409) {
      // 既にホストが存在する可能性があるが、同時アクセスの場合もある
      console.log('ホスト競合検出、少し待ってからゲストロールを試行:', keyword);
      uiManager.updateStatus('他の参加者を確認中...');
      
      // ランダムな遅延（500-1500ms）でタイミングをずらす
      const delay = 500 + Math.random() * 1000;
      setTimeout(async () => {
        console.log('ゲストロールに切り替え:', keyword);
        uiManager.updateStatus('参加者として接続中...');
        await attemptGuestRole(keyword);
      }, delay);
    } else {
      // その他のエラー
      uiManager.updateStatus('接続エラー: ' + error.message);
      cleanup();
      throw error;
    }
  }
}

// ホストロール試行
async function attemptHostRole(keyword) {
  sessionManager.startSession(true, keyword);
  
  // ASCII変換を開始
  asciiConverter.startConversion(Elm.localVideo, Elm.remoteVideo, Elm.localAA, Elm.remoteAA);

  await webRTCManager.createPeerConnection();
  webRTCManager.setupDataChannel();

  const offer = await webRTCManager.createOffer();

  console.log('オファーを送信中:', keyword, 'トークン:', sessionManager.sessionToken);
  
  // ここで409エラーが発生する可能性がある
  await signalingManager.sendSignal(keyword, {
    type: 'offer',
    offer: offer,
    token: sessionManager.sessionToken
  });
  
  console.log('ホストとして接続成功');
  uiManager.updateStatus('ホストとして接続 - 参加者を待っています...');
  startKeywordTimer();
  pollForAnswer();
}

// ゲストロール試行
async function attemptGuestRole(keyword) {
  // ホスト試行時の状態をクリーンアップ
  cleanup();
  
  // 新しいストリームを取得
  if (!await mediaManager.startCamera()) {
    throw new Error('カメラアクセスエラー');
  }

  sessionManager.startSession(false, keyword);
  
  // ASCII変換を開始
  asciiConverter.startConversion(Elm.localVideo, Elm.remoteVideo, Elm.localAA, Elm.remoteAA);

  uiManager.updateStatus('参加者として接続中...');
  uiManager.toggleButtons(false);

  // ゲストとしてポーリング開始
  startJoinPolling();
}

async function pollForAnswer() {
  const keyword = Elm.keyword.value;
  let attempts = 0;
  const maxAttempts = 30;

  const pollInterval = setInterval(async () => {
    attempts++;
    if (attempts > maxAttempts || sessionManager.connectionEstablished) {
      clearInterval(pollInterval);
      if (!sessionManager.connectionEstablished) {
        uiManager.updateStatus('タイムアウト: 参加者が見つかりませんでした');
      }
      return;
    }

    try {
      // トークンベースのパスと旧形式の両方をチェック
      const answerPath = sessionManager.sessionToken ?
        `${keyword}/${sessionManager.sessionToken}/answer` :
        `${keyword}-answer`;

      const signal = await signalingManager.receiveSignal(answerPath);
      if (signal && signal.type === 'answer') {
        clearInterval(pollInterval);
        uiManager.updateStatus('参加者からの応答を受信 - ICE候補を交換中...');
        await webRTCManager.setRemoteDescription(signal.answer);
        pollForIceCandidates();
      }
    } catch (error) {
      // 応答待ち
    }
  }, 2000);

  addPollingInterval(pollInterval);
}

async function startJoinPolling() {
  const keyword = sessionManager.currentKeyword;
  let attempts = 0;
  const maxAttempts = 30;

  uiManager.updateStatus('オファーを検索しています...');

  const pollInterval = setInterval(async () => {
    attempts++;
    if (attempts > maxAttempts || sessionManager.connectionEstablished) {
      clearInterval(pollInterval);
      if (!sessionManager.connectionEstablished) {
        console.log('オファー検索タイムアウト、ホストロールを試行');
        uiManager.updateStatus('セッションが見つからないため、ホストとして待機中...');
        
        try {
          // ホストロールを試行
          sessionManager.isHost = true;
          sessionManager.sessionToken = Utility.generateSessionToken();
          
          await webRTCManager.createPeerConnection();
          webRTCManager.setupDataChannel();
          const offer = await webRTCManager.createOffer();
          
          await signalingManager.sendSignal(keyword, {
            type: 'offer',
            offer: offer,
            token: sessionManager.sessionToken
          });
          
          uiManager.updateStatus('ホストとして参加者を待っています...');
          startKeywordTimer();
          pollForAnswer();
          
        } catch (error) {
          console.error('ホストロール切り替えエラー:', error);
          uiManager.updateStatus('接続に失敗しました');
          cleanup();
        }
      }
      return;
    }

    try {
      // シンプルに基本キーワードのみを検索
      console.log('オファーを検索中:', keyword);
      const signal = await signalingManager.receiveSignal(keyword);

      if (signal && signal.type === 'offer') {
        clearInterval(pollInterval);
        uiManager.updateStatus('オファー受信 - 応答を準備中...');

        // ホストからのトークンを保存
        if (signal.token) {
          sessionManager.sessionToken = signal.token;
          console.log('セッショントークン受信:', sessionManager.sessionToken);
        }

        await webRTCManager.createPeerConnection();
        webRTCManager.setupDataChannel();

        await webRTCManager.setRemoteDescription(signal.offer);
        uiManager.updateStatus('応答を作成中...');
        const answer = await webRTCManager.createAnswer();

        // トークンを使用した安全なパスで応答
        const answerPath = sessionManager.sessionToken ?
          `${keyword}/${sessionManager.sessionToken}/answer` :
          `${keyword}-answer`;

        uiManager.updateStatus('応答を送信中...');
        await signalingManager.sendSignal(answerPath, {
          type: 'answer',
          answer: answer
        });

        uiManager.updateStatus('ICE候補を交換中...');
        pollForIceCandidates();
      }
    } catch (error) {
      console.log('参加ポーリングエラー:', error.message);
    }
  }, 2000);

  addPollingInterval(pollInterval);
}

async function pollForIceCandidates() {
  const keyword = sessionManager.currentKeyword || Elm.keyword.value;
  const targetKey = sessionManager.sessionToken ?
    `${keyword}/${sessionManager.sessionToken}/ice-${sessionManager.isHost ? 'guest' : 'host'}` :
    `${keyword}-ice-${sessionManager.isHost ? 'guest' : 'host'}`;
  console.log('ICE候補ポーリング開始:', targetKey);

  let attempts = 0;
  const maxAttempts = 10;

  const pollInterval = setInterval(async () => {
    attempts++;
    if (attempts > maxAttempts || sessionManager.connectionEstablished) {
      console.log('ICE候補ポーリング終了');
      clearInterval(pollInterval);
      return;
    }

    try {
      const signal = await signalingManager.receiveSignal(targetKey);
      if (signal && signal.type === 'ice-batch' && signal.isHost !== sessionManager.isHost) {
        console.log('ICE候補受信:', signal.candidates.length, '個');
        clearInterval(pollInterval);
        uiManager.updateStatus('ICE候補を受信 - 接続を確立中...');
        for (const candidate of signal.candidates) {
          console.log('ICE候補追加:', candidate.candidate ? candidate.candidate.split(' ')[7] : 'unknown');
          try {
            await webRTCManager.addIceCandidate(candidate);
          } catch (error) {
            console.log('ICE候補追加エラー:', error.message);
          }
        }
        console.log('ICE候補追加完了');

        // ICE候補追加後、接続状態をチェック
        setTimeout(async () => {
          const currentState = webRTCManager.getPeerConnection()?.connectionState;
          console.log('ICE候補追加後の接続状態:', currentState);

          if (currentState === 'connected') {
            await updateConnectionInfo(true);
          } else {
            uiManager.updateStatus('接続を確立中...');
          }
        }, 1000);
      }
    } catch (error) {
      console.log('ICE候補受信エラー:', error.message);
    }
  }, 2000);

  addPollingInterval(pollInterval);
}

function startKeywordTimer() {
  // sessionStartTime now managed by sessionManager
  updateTimer();

  aaChat.keywordTimer = setTimeout(() => {
    if (!sessionManager.sessionActive) {
      uiManager.updateStatus('キーワードの有効期限が切れました');
      cleanup();
    }
  }, 10 * 60 * 1000);

  aaChat.timerInterval = setInterval(() => {
    if (!sessionManager.startTime) {
      clearInterval(aaChat.timerInterval);
      aaChat.timerInterval = null;
      return;
    }
    updateTimer();
  }, 1000);
}

function updateTimer() {
  if (!sessionManager.startTime) return;

  const elapsed = sessionManager.getSessionDuration();
  const remaining = sessionManager.getRemainingTime();

  if (!sessionManager.connectionEstablished && remaining > 0) {
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const timerText = `有効期限: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    Elm.timer.textContent = timerText;
    Elm.timer2.textContent = timerText;
  } else {
    Elm.timer.textContent = '';
    Elm.timer2.textContent = '';
  }
}

function clearKeywordTimer() {
  if (aaChat.keywordTimer) {
    clearTimeout(aaChat.keywordTimer);
    aaChat.keywordTimer = null;
  }
  if (aaChat.timerInterval) {
    clearInterval(aaChat.timerInterval);
    aaChat.timerInterval = null;
  }
  Elm.timer.textContent = '';
  Elm.timer2.textContent = '';
}



function handleDisconnect() {
  clearReconnectInterval();
  if (sessionManager.isHost) {
    uiManager.updateStatus('セッション終了');
    cleanup();
  } else {
    uiManager.updateStatus('ホストが退室しました。新ホストとして待機中...');
    promoteGuestToHost();
  }
}

function clearReconnectInterval() {
  if (aaChat.reconnectInterval) {
    clearInterval(aaChat.reconnectInterval);
    aaChat.reconnectInterval = null;
  }
}

// ゲストを新ホストに昇格させる関数
async function promoteGuestToHost() {
  try {
    console.log('ゲストを新ホストに昇格中...');
    
    // 現在の接続をクリーンアップ（ローカルストリームは保持）
    stopAllPolling();
    webRTCManager.close();
    
    // ホストとして再設定
    sessionManager.isHost = true;
    sessionManager.connectionEstablished = false;
    sessionManager.sessionToken = Utility.generateSessionToken(); // 新しいトークン生成
    
    // 新しいWebRTC接続を作成
    await webRTCManager.createPeerConnection();
    webRTCManager.setupDataChannel();
    
    // オファーを作成して送信
    const offer = await webRTCManager.createOffer();
    const keyword = sessionManager.currentKeyword;
    
    console.log('新ホストとしてオファー送信:', keyword);
    await signalingManager.sendSignal(keyword, {
      type: 'offer',
      offer: offer,
      token: sessionManager.sessionToken
    });
    
    uiManager.updateStatus('新ホストとして参加者を待っています...');
    startKeywordTimer();
    pollForAnswer();
    
  } catch (error) {
    console.error('ホスト昇格エラー:', error);
    uiManager.updateStatus('ホスト昇格に失敗しました');
    cleanup();
  }
}

function leaveSession() {
  uiManager.updateStatus('退室しました');
  cleanup();

  // ページリロードではなく、状態をリセット
  setTimeout(() => {
    uiManager.updateStatus('未接続');
    uiManager.toggleButtons(true);
  }, 100);
}

function cleanup() {
  stopAllPolling(); // 全ポーリング停止

  // 進行中のpiping serverへの接続をキャンセル
  signalingManager.abortCurrentRequest();

  // ASCII変換を停止
  asciiConverter.stopConversion();

  webRTCManager.close();

  // ローカルストリームをクリーンアップ（ホスト・ゲスト両方）
  if (mediaManager.getLocalStream()) {
    mediaManager.stopCamera();
    Elm.localAA.textContent = '';
    console.log('ローカルビデオストリーム停止');
  }

  Elm.remoteVideo.srcObject = null;
  Elm.remoteAA.textContent = '';

  // ホスト側でない場合のみローカルAAをクリア
  if (!sessionManager.isHost) {
    Elm.localAA.textContent = '';
  }

  // iceCandidates now managed by webRTCManager
  aaChat.reconnectAttempts = 0;
  aaChat.isWaitingForGuest = false;

  // ゲスト退室時はホスト状態を保持
  if (!sessionManager.isHost) {
    sessionManager.reset();
  } else {
    sessionManager.endSession();
  }

  clearKeywordTimer();
  clearReconnectInterval();

  uiManager.toggleButtons(true);
}

function updateStatus(text) {
  Elm.statusText.textContent = text;
  Elm.statusText2.textContent = text;
}

async function getConnectionType() {
  if (!webRTCManager.getPeerConnection()) return null;

  try {
    const stats = await webRTCManager.getPeerConnection().getStats();
    let connectionType = '';

    stats.forEach(report => {
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        const localCandidate = stats.get(report.localCandidateId);
        const remoteCandidate = stats.get(report.remoteCandidateId);

        if (localCandidate && remoteCandidate) {
          const localType = localCandidate.candidateType;
          const remoteType = remoteCandidate.candidateType;
          connectionType = `${localType} ↔ ${remoteType}`;

          console.log('接続方法:', connectionType);
          console.log('ローカル:', localCandidate);
          console.log('リモート:', remoteCandidate);
        }
      }
    });

    return connectionType || null;
  } catch (err) {
    console.log('Stats取得エラー:', err);
    return null;
  }
}

async function updateConnectionInfo(shouldUpdateStatus = false) {
  if (!webRTCManager.getPeerConnection()) return;

  const connectionState = webRTCManager.getPeerConnection()?.connectionState;
  const iceConnectionState = webRTCManager.getPeerConnection()?.iceConnectionState;
  const iceGatheringState = webRTCManager.getPeerConnection()?.iceGatheringState;

  if (connectionState === 'connected') {
    const connectionType = await getConnectionType();

    if (connectionType) {
      if (shouldUpdateStatus) {
        uiManager.updateStatus(`接続完了 (${connectionType})`);
      }
    } else {
      if (shouldUpdateStatus) {
        uiManager.updateStatus('接続完了');
      }
    }
  } else {
    // 詳細な接続情報を表示
    const info = `${connectionState} | ice: ${iceConnectionState} | gathering: ${iceGatheringState}`;
    Elm.timer.textContent = info;
    Elm.timer2.textContent = info;
  }
}

// ユーザー操作によるビデオ再生を許可
function enableAutoplayAfterUserGesture() {
  // すべてのビデオ要素で自動再生を試行
  playVideoSafely(Elm.localVideo, 'ローカル（ユーザー操作後）');
  playVideoSafely(Elm.remoteVideo, 'リモート（ユーザー操作後）');
}

Elm.connectBtn.addEventListener('click', () => {
  enableAutoplayAfterUserGesture();
  connectSession();
});

Elm.leaveBtn.addEventListener('click', leaveSession);

// URLパラメータからキーワードを自動入力
// クリアボタンのイベントリスナー
Elm.clearBtn.addEventListener('click', () => {
  // パラメータなしのURLに遷移
  window.location.href = window.location.pathname;
});

// 文字サイズ自動調整関数
function adjustAAFontSize() {
  const aaDisplays = [Elm.localAA, Elm.remoteAA];
  const containerWidth = window.innerWidth;
  const containerHeight = window.innerHeight;

  // モバイルの場合は個別に調整
  if (containerWidth <= 768) {
    adjustMobileAASize();
    return;
  }

  // タブレットの場合は画面に収まるように調整
  if (containerWidth <= 1200) {
    // 縦向きか横向きかを判定
    const isPortrait = containerHeight > containerWidth;

    let availableWidth, availableHeight, fontSizeByWidth, fontSizeByHeight;

    if (isPortrait) {
      // 縦向きタブレット：縦並びレイアウト
      availableWidth = containerWidth - 40; // 1つのAAエリア + マージン
      availableHeight = (containerHeight - 160) / 2; // 2つのAAエリア + コントロール
      fontSizeByWidth = availableWidth / (80 * 1.0 + 79 * 0.4);
      fontSizeByHeight = availableHeight / 60;
    } else {
      // 横向きタブレット：横並びレイアウト
      availableWidth = (containerWidth - 60) / 2; // 2つのAAエリア + マージン
      availableHeight = containerHeight - 120; // コントロール分を除く
      fontSizeByWidth = availableWidth / (80 * 1.0 + 79 * 0.4);
      fontSizeByHeight = availableHeight / 60;
    }

    const tabletFontSize = Math.max(6, Math.min(fontSizeByWidth, fontSizeByHeight, 16));
    document.documentElement.style.setProperty('--aa-font-size', `${tabletFontSize}px`);
    console.log('タブレットAAサイズ調整:', tabletFontSize + 'px', {
      isPortrait,
      availableWidth,
      availableHeight,
      fontSizeByWidth,
      fontSizeByHeight
    });
    return;
  }

  // デスクトップの場合は画面サイズに基づいて計算
  let fontSize;

  if (containerWidth > 1200) {
    // 横並びレイアウト
    const widthBasedSize = (containerWidth - 50) / (80 * 1.0 * 2);
    const heightBasedSize = (containerHeight - 100) / 60;
    fontSize = Math.min(widthBasedSize, heightBasedSize, 20);
  } else if (containerWidth > 768) {
    // 縦並びレイアウト
    const widthBasedSize = (containerWidth - 30) / (80 * 1.0);
    const heightBasedSize = (containerHeight - 150) / (60 * 2);
    fontSize = Math.min(widthBasedSize, heightBasedSize, 18);
  }

  fontSize = Math.max(fontSize, 8); // 最小8px

  // CSSカスタムプロパティで動的に設定
  document.documentElement.style.setProperty('--aa-font-size', `${fontSize}px`);
  console.log('AA表示フォントサイズ調整:', fontSize + 'px');
}

// モバイル用のAAサイズ調整
function adjustMobileAASize() {
  // iOSキーボード対応：画面の実際のサイズではなく、ビューポートサイズを使用
  const containerHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const containerWidth = window.innerWidth;

  // キーボードが表示されている場合の検出
  const isKeyboardVisible = window.visualViewport && window.visualViewport.height < window.screen.height * 0.75;

  // キーボード表示時は基準サイズを固定値で使用
  const baseHeight = isKeyboardVisible ? window.screen.height : containerHeight;
  const availableHeight = baseHeight - 120; // コントロールとタイトルを除く
  const statusHeight = 50; // ステータス表示分

  // 相手のAAは40vhで固定（基準サイズに対して）
  const remoteHeight = baseHeight * 0.4;
  const localAvailableHeight = availableHeight - remoteHeight - statusHeight;

  // 相手のAAサイズ（40vhに収まるように計算）
  const remoteMaxHeight = baseHeight * 0.4;
  const remoteFontSize = Math.max(4, Math.min(10, remoteMaxHeight / 60, containerWidth * 0.012));

  // 自分のAAサイズ（基本的に相手と同じサイズ、スペース不足時のみ縮小）
  const idealLocalFontSize = remoteFontSize; // 相手と同じサイズを目標
  const maxLocalFontSize = Math.min(localAvailableHeight / 60, containerWidth * 0.01);
  const localFontSize = Math.max(3, Math.min(idealLocalFontSize, maxLocalFontSize));

  // 相手のAAサイズ設定
  document.documentElement.style.setProperty('--remote-aa-font-size', `${remoteFontSize}px`);
  document.documentElement.style.setProperty('--aa-font-size', `${remoteFontSize}px`);

  // 自分のAAだけ別のサイズに設定
  const localAA = document.getElementById('localAA');
  if (localAA) {
    localAA.style.fontSize = `${localFontSize}px`;
    localAA.style.letterSpacing = `${localFontSize * 0.4}px`;
    localAA.style.width = `${80 * localFontSize * 1.0 + 79 * localFontSize * 0.4}px`;
    localAA.style.height = `${60 * localFontSize}px`;

    // 必要に応じてスケール調整
    const maxWidth = containerWidth - 4;
    const calculatedWidth = 80 * localFontSize * 1.0 + 79 * localFontSize * 0.4;
    const maxHeight = localAvailableHeight - 10;
    const calculatedHeight = 60 * localFontSize;

    let scale = 1;
    if (calculatedWidth > maxWidth) {
      scale = Math.min(scale, maxWidth / calculatedWidth);
    }
    if (calculatedHeight > maxHeight) {
      scale = Math.min(scale, maxHeight / calculatedHeight);
    }

    localAA.style.transform = `scale(${scale})`;
  }

  console.log('モバイルAAサイズ調整:', {
    remote: remoteFontSize + 'px',
    local: localFontSize + 'px',
    scale: localAA ? localAA.style.transform : 'none',
    keyboardVisible: isKeyboardVisible,
    baseHeight: baseHeight,
    containerHeight: containerHeight
  });
}

// リサイズイベントでフォントサイズ調整（スロットリング）
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    uiManager.adjustAAFontSize();
  }, 1000);
});

// Visual Viewport API対応（iOSキーボード表示時の対応）
let viewportResizeTimeout;
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    clearTimeout(viewportResizeTimeout);
    viewportResizeTimeout = setTimeout(() => {
      uiManager.adjustAAFontSize();
    }, 1000);
  });
}

// ダイアログ制御
function openDeviceDialog() {
  Elm.deviceDialog.style.display = 'flex';
}

function closeDeviceDialog() {
  Elm.deviceDialog.style.display = 'none';
}

async function applyDeviceSelection() {
  await mediaManager.applyDeviceSelection(sessionManager, webRTCManager, closeDeviceDialog);
}

// イベントリスナー設定
Elm.deviceBtn.addEventListener('click', openDeviceDialog);
Elm.mobileDeviceBtn.addEventListener('click', openDeviceDialog);
Elm.closeDialog.addEventListener('click', closeDeviceDialog);
Elm.applyDevices.addEventListener('click', applyDeviceSelection);
Elm.refreshDevices.addEventListener('click', () => mediaManager.getAvailableDevices());
Elm.refreshDevicesDialog.addEventListener('click', () => mediaManager.getAvailableDevices());

// ヘルプダイアログのイベントリスナー
Elm.helpBtn.addEventListener('click', () => {
  Elm.helpDialog.style.display = 'flex';
});

Elm.mobileHelpBtn.addEventListener('click', () => {
  Elm.helpDialog.style.display = 'flex';
});

Elm.closeHelpDialog.addEventListener('click', () => {
  Elm.helpDialog.style.display = 'none';
});

// ヘルプダイアログ外側クリックで閉じる
Elm.helpDialog.addEventListener('click', (e) => {
  if (e.target === Elm.helpDialog) {
    Elm.helpDialog.style.display = 'none';
  }
});

// ダイアログ外クリックで閉じる
Elm.deviceDialog.addEventListener('click', (e) => {
  if (e.target === Elm.deviceDialog) {
    closeDeviceDialog();
  }
});

Elm.videoSelect.addEventListener('change', () => {
  if (mediaManager.getLocalStream()) {
    console.log('ビデオデバイス変更:', Elm.videoSelect.options[Elm.videoSelect.selectedIndex].text);
  }
});

Elm.audioSelect.addEventListener('change', () => {
  if (mediaManager.getLocalStream()) {
    console.log('音声デバイス変更:', Elm.audioSelect.options[Elm.audioSelect.selectedIndex].text);
  }
});

// iOS キーボード対策
if (window.visualViewport) {
  let initialViewportHeight = window.visualViewport.height;
  let keyboardVisible = false;

  window.visualViewport.addEventListener('resize', () => {
    const currentHeight = window.visualViewport.height;
    const heightDifference = initialViewportHeight - currentHeight;

    // キーボード表示判定（高さが大幅に減った場合）
    const wasKeyboardVisible = keyboardVisible;
    keyboardVisible = heightDifference > 150; // 150px以上減った場合

    // キーボードが非表示になった時
    if (wasKeyboardVisible && !keyboardVisible) {
      // ズームリセット
      setTimeout(() => {
        window.scrollTo(0, 0);
        // viewportを強制リセット
        const viewport = Elm.viewport;
        if (viewport) {
          viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        }
      }, 100);
    }

    // AAサイズも再調整
    if (!keyboardVisible) {
      setTimeout(() => {
        uiManager.adjustAAFontSize();
      }, 200);
    }
  });
}

// ページ読み込み時に実行
uiManager.loadKeywordFromURL();
asciiConverter.startConversion(Elm.localVideo, Elm.remoteVideo, Elm.localAA, Elm.remoteAA);
uiManager.adjustAAFontSize();
mediaManager.getAvailableDevices();
