// Config class for constants
class Config {
  static get PPNG_SERVER() {
    return 'https://ppng.io';
  }
  
  static get STUN_SERVERS() {
    return [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      // 追加のSTUNサーバー
      { urls: 'stun:stun.stunprotocol.org:3478' },
      { urls: 'stun:stun.voipbuster.com:3478' },
      { urls: 'stun:stun.voipstunt.com:3478' }
    ];
  }
  
  // ASCII文字セット（明度順、暗→明）
  static get ASCII_CHARS() {
    return ' .`\'"-:;!l/tfjrxnvcXYUJ0ZMKG8#@$';
  }
  
  static get CHAR_COUNT() {
    return Config.ASCII_CHARS.length;
  }
  
  static get AA_WIDTH() {
    return 80;
  }
  
  static get AA_HEIGHT() {
    return 60;
  }
}

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
      
      updateDeviceSelects();
      
    } catch (error) {
      console.error('デバイス取得エラー:', error);
    }
  }

  getSelectedDeviceIds() {
    return {
      video: elements.videoSelect.value || undefined,
      audio: elements.audioSelect.value || undefined
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
      
      elements.localVideo.srcObject = this.localStream;
      console.log('カメラ解像度:', elements.localVideo.videoWidth, 'x', elements.localVideo.videoHeight);
      
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
      await playVideoSafely(elements.localVideo, 'ローカル');
      
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
      elements.localVideo.srcObject = null;
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
    elements.localVideo.srcObject = this.localStream;
    
    // 使用中のトラックのうち、新しいストリームに含まれないものを停止
    newStream.getTracks().forEach(track => {
      if (!this.localStream.getTracks().includes(track)) {
        track.stop();
      }
    });
    
    console.log('デバイス切り替え完了');
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

  async createPeerConnection(elements, updateStatus, sendSignal) {
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
      elements.remoteVideo.srcObject = event.streams[0];
      elements.remoteVideo.onloadedmetadata = () => {
        console.log('リモートビデオサイズ:', elements.remoteVideo.videoWidth, 'x', elements.remoteVideo.videoHeight);
      };
      // リモートビデオの適切な再生処理
      playVideoSafely(elements.remoteVideo, 'リモート');
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
            const keyword = sessionManager.currentKeyword || elements.keyword.value;
            const iceKey = sessionManager.sessionToken ? 
            `${keyword}/${sessionManager.sessionToken}/ice-${sessionManager.isHost ? 'host' : 'guest'}` :
            `${keyword}-ice-${sessionManager.isHost ? 'host' : 'guest'}`;
            console.log('ICE候補送信:', iceKey);
            await sendSignal(iceKey, {
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
          const keyword = sessionManager.currentKeyword || elements.keyword.value;
          const iceKey = sessionManager.sessionToken ? 
          `${keyword}/${sessionManager.sessionToken}/ice-${sessionManager.isHost ? 'host' : 'guest'}` :
          `${keyword}-ice-${sessionManager.isHost ? 'host' : 'guest'}`;
          console.log('ICE候補送信:', iceKey);
          await sendSignal(iceKey, {
            type: 'ice-batch',
            candidates: this.iceCandidates,
            isHost: sessionManager.isHost
          });
        }
      }
    };
    
    this.setupConnectionEventHandlers(updateStatus);
  }

  setupConnectionEventHandlers(updateStatus) {
    this.peerConnection.onconnectionstatechange = () => {
      console.log('接続状態:', this.peerConnection.connectionState);
      updateStatus(`接続状態: ${this.peerConnection.connectionState}`);
      
      if (this.peerConnection.connectionState === 'connected') {
        sessionManager.sessionActive = true;
        sessionManager.connectionEstablished = true;
        isWaitingForGuest = false;
        reconnectAttempts = 0;
        clearKeywordTimer();
        stopAllPolling(); // 接続完了時にポーリング停止
        
        // 接続方法を取得してステータスに表示
        setTimeout(() => updateConnectionInfo(true), 1000);
      } else if (this.peerConnection.connectionState === 'disconnected' || 
        this.peerConnection.connectionState === 'failed') {
          if (sessionManager.connectionEstablished) {
            // 一度接続した後の切断の場合
            sessionManager.connectionEstablished = false;
            sessionManager.sessionActive = false;
            
            if (sessionManager.isHost) {
              // ホストは最初からやり直し
              updateStatus('参加者が退室しました。新しいセッションを開始中...');
              setTimeout(() => {
                restartHostSession();
              }, 1000);
            } else {
              // ゲストは接続失敗として処理
              updateStatus('接続が切断されました');
              cleanup();
            }
          } else {
            handleDisconnect();
          }
        }
      };
      
      // ICE接続状態の監視
      this.peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE接続状態:', this.peerConnection.iceConnectionState);
        updateConnectionInfo();
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


// Global instances
const mediaManager = new MediaManager();
const webRTCManager = new WebRTCManager();
const sessionManager = new SessionManager();
let keywordTimer = null;
let reconnectAttempts = 0;
let maxReconnectAttempts = 5;
let reconnectInterval = null;
let activePollingIntervals = [];
let isWaitingForGuest = false;
let currentAbortController = null;

const elements = {
  keyword: document.getElementById('keyword'),
  clearBtn: document.getElementById('clearBtn'),
  hostBtn: document.getElementById('hostBtn'),
  joinBtn: document.getElementById('joinBtn'),
  leaveBtn: document.getElementById('leaveBtn'),
  statusText: document.getElementById('statusText'),
  timer: document.getElementById('timer'),
  statusText2: document.getElementById('statusText2'),
  timer2: document.getElementById('timer2'),
  localVideo: document.getElementById('localVideo'),
  remoteVideo: document.getElementById('remoteVideo'),
  localAA: document.getElementById('localAA'),
  remoteAA: document.getElementById('remoteAA'),
  canvas: document.getElementById('canvas'),
  videoSelect: document.getElementById('videoSelect'),
  audioSelect: document.getElementById('audioSelect'),
  refreshDevices: document.getElementById('refreshDevices'),
  deviceBtn: document.getElementById('deviceBtn'),
  mobileDeviceBtn: document.getElementById('mobileDeviceBtn'),
  deviceDialog: document.getElementById('deviceDialog'),
  closeDialog: document.getElementById('closeDialog'),
  videoSelectDialog: document.getElementById('videoSelectDialog'),
  audioSelectDialog: document.getElementById('audioSelectDialog'),
  refreshDevicesDialog: document.getElementById('refreshDevicesDialog'),
  applyDevices: document.getElementById('applyDevices'),
  helpBtn: document.getElementById('helpBtn'),
  helpDialog: document.getElementById('helpDialog'),
  closeHelpDialog: document.getElementById('closeHelpDialog'),
  mobileHelpBtn: document.getElementById('mobileHelpBtn')
};

const ctx = elements.canvas.getContext('2d');


// デバイス選択肢を更新
function updateDeviceSelects() {
  // デスクトップ用
  updateSelectOptions(elements.videoSelect, mediaManager.getAvailableVideoDevices(), 'カメラ');
  updateSelectOptions(elements.audioSelect, mediaManager.getAvailableAudioDevices(), 'マイク');
  
  // ダイアログ用
  updateSelectOptions(elements.videoSelectDialog, mediaManager.getAvailableVideoDevices(), 'カメラ');
  updateSelectOptions(elements.audioSelectDialog, mediaManager.getAvailableAudioDevices(), 'マイク');
  
  // 現在の選択を保持
  if (mediaManager.selectedDeviceIds.video) {
    elements.videoSelect.value = mediaManager.selectedDeviceIds.video;
    elements.videoSelectDialog.value = mediaManager.selectedDeviceIds.video;
  }
  if (mediaManager.selectedDeviceIds.audio) {
    elements.audioSelect.value = mediaManager.selectedDeviceIds.audio;
    elements.audioSelectDialog.value = mediaManager.selectedDeviceIds.audio;
  }
}

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


// ダイナミックレンジ調整パラメータ
let minBrightness = 0;
let maxBrightness = 255;
let dynamicRangeEnabled = true;

function videoToAscii(video) {
  if (!video.videoWidth || !video.videoHeight) return '';
  
  elements.canvas.width = Config.AA_WIDTH;
  elements.canvas.height = Config.AA_HEIGHT;
  
  ctx.drawImage(video, 0, 0, Config.AA_WIDTH, Config.AA_HEIGHT);
  const imageData = ctx.getImageData(0, 0, Config.AA_WIDTH, Config.AA_HEIGHT);
  const pixels = imageData.data;
  
  // 軽量グレースケール変換（AA変換時のみ）
  
  let ascii = '';
  for (let y = 0; y < Config.AA_HEIGHT; y++) {
    for (let x = 0; x < Config.AA_WIDTH; x++) {
      const i = (y * Config.AA_WIDTH + x) * 4;
      let brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      
      // ダイナミックレンジ調整
      if (dynamicRangeEnabled && maxBrightness > minBrightness) {
        // 現在の輝度を0-1の範囲に正規化
        brightness = (brightness - minBrightness) / (maxBrightness - minBrightness);
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

// ダイナミックレンジ分析
function analyzeAndAdjustContrast(video) {
  if (!video.videoWidth || !video.videoHeight) return;
  
  // サンプリング用の小さいキャンバス
  const sampleWidth = 64;
  const sampleHeight = 64;
  elements.canvas.width = sampleWidth;
  elements.canvas.height = sampleHeight;
  
  ctx.drawImage(video, 0, 0, sampleWidth, sampleHeight);
  const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
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
    minBrightness = Math.max(0, mean - stdDev * 3);
    maxBrightness = Math.min(255, mean + stdDev * 3);
  } else if (stdDev > 60) {
    // 高分散（コントラストが高い）: 外れ値を除外
    minBrightness = Math.max(0, percentile5 - 10);
    maxBrightness = Math.min(255, percentile95 + 10);
  } else {
    // 中分散: バランスの取れた調整
    const margin = stdDev * 0.5;
    minBrightness = Math.max(0, min - margin);
    maxBrightness = Math.min(255, max + margin);
  }
  
  // レンジが狭すぎる場合は調整
  if (maxBrightness - minBrightness < 30) {
    const center = (minBrightness + maxBrightness) / 2;
    minBrightness = Math.max(0, center - 15);
    maxBrightness = Math.min(255, center + 15);
  }
}

function startAAConversion() {
  // コントラスト調整タイマー（1秒ごと）
  setInterval(() => {
    if (elements.localVideo.srcObject && elements.localVideo.videoWidth > 0) {
      analyzeAndAdjustContrast(elements.localVideo);
    }
  }, 1000);
  
  // AA変換タイマー（60fpsに合わせて約16msごと）
  setInterval(() => {
    // ローカルビデオからAAを生成して表示
    if (elements.localVideo.srcObject && elements.localVideo.videoWidth > 0) {
      const localAA = videoToAscii(elements.localVideo);
      elements.localAA.textContent = localAA;
    }
    
    // リモートビデオからAAを生成して表示
    if (elements.remoteVideo.srcObject && elements.remoteVideo.videoWidth > 0) {
      const remoteAA = videoToAscii(elements.remoteVideo);
      elements.remoteAA.textContent = remoteAA;
    }
  }, 16); // 約60fps
}

function stopAllPolling() {
  activePollingIntervals.forEach(intervalId => clearInterval(intervalId));
  activePollingIntervals = [];
  console.log('全ポーリング停止');
}

function addPollingInterval(intervalId) {
  activePollingIntervals.push(intervalId);
}

async function sendSignal(keyword, data) {
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
    throw new Error('シグナル送信エラー');
  }
  console.log('送信成功:', keyword);
}

async function receiveSignal(keyword) {
  console.log('受信試行:', keyword);
  
  // AbortControllerを作成（既存のものがあればキャンセル）
  if (currentAbortController) {
    currentAbortController.abort();
  }
  currentAbortController = new AbortController();
  
  try {
    const response = await fetch(`${Config.PPNG_SERVER}/aachat/${keyword}`, {
      signal: currentAbortController.signal
    });
    
    if (!response.ok) {
      if (response.status === 400) {
        console.log('受信結果: データなし (400)');
        return null;
      }
      console.error('受信エラー:', response.status, response.statusText);
      throw new Error('シグナル受信エラー');
    }
    
    const encrypted = await response.text();
    const decrypted = Utility.xorDecrypt(encrypted, keyword);
    const data = JSON.parse(decrypted);
    console.log('受信成功:', keyword, 'データタイプ:', data.type);
    return data;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('受信キャンセル:', keyword);
      return null;
    }
    throw error;
  }
}

  
  async function hostSession() {
    const keyword = elements.keyword.value.trim();
    if (!keyword) {
      alert('キーワードを入力してください');
      return;
    }
    
    if (!await mediaManager.startCamera()) return;
    
    sessionManager.startSession(true, keyword);
    updateStatus('接続準備中...');
    toggleButtons(false);
    
    // セッショントークンは startSession で生成済み
    
    await webRTCManager.createPeerConnection(elements, updateStatus, sendSignal);
    webRTCManager.setupDataChannel();
    
    // オファー作成時のオプションを追加
    const offer = await webRTCManager.createOffer();
    
    console.log('オファーを送信中:', keyword, 'トークン:', sessionManager.sessionToken);
    try {
      await sendSignal(keyword, {
        type: 'offer',
        offer: offer,
        token: sessionManager.sessionToken
      });
      console.log('オファー送信完了');
    } catch (error) {
      // 400エラーをチェック（既存ホストの検出）
      if (error.message.includes('シグナル送信エラー')) {
        try {
          const response = await fetch(`${Config.PPNG_SERVER}/aachat/${keyword}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({type: 'offer', offer: offer, token: sessionToken})
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            if (errorText.includes('Another sender has been connected')) {
              // 既存ホストが存在
              const suggestedKeyword = Utility.generateSuggestedKeyword(keyword);
              updateStatus('エラー: このキーワードは既に使用されています');
              
              const message = `このキーワード「${keyword}」は既に他のユーザーがホストしています。\n\n` +
              `以下のような別のキーワードを試してください：\n` +
              `• ${suggestedKeyword}\n` +
              `• ${keyword}-room\n` +
              `• ${keyword}${Math.floor(Math.random() * 100)}\n\n` +
              `または、そのセッションに「参加する」ボタンで参加することもできます。`;
              
              alert(message);
              cleanup();
              return;
            }
          }
        } catch (checkError) {
          console.log('既存ホスト確認エラー:', checkError.message);
        }
      }
      
      // その他のエラーの場合は表示して終了
      updateStatus('接続エラー: ' + error.message);
      cleanup();
      return;
    }
    
    updateStatus('参加者を待っています...');
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
    isWaitingForGuest = false;
    sessionManager.sessionToken = Utility.generateSessionToken();
    
    // ローカルストリームが存在しない場合は再取得
    if (!mediaManager.getLocalStream()) {
      console.log('ローカルストリームを再取得中...');
      if (!await mediaManager.startCamera()) {
        updateStatus('カメラアクセスエラー');
        return;
      }
    }
    
    // 新しいセッションを開始
    await webRTCManager.createPeerConnection(elements, updateStatus, sendSignal);
    webRTCManager.setupDataChannel();
    
    const offer = await webRTCManager.createOffer();
    
    // 新しいトークンでオファーを送信
    console.log('新しいオファーを送信中:', sessionManager.currentKeyword, 'トークン:', sessionManager.sessionToken);
    await sendSignal(sessionManager.currentKeyword, {
      type: 'offer',
      offer: offer,
      token: sessionManager.sessionToken
    });
    console.log('新しいオファー送信完了');
    
    updateStatus('新しい参加者を待っています...');
    pollForAnswer();
  }
  
  async function joinSession() {
    const keyword = elements.keyword.value.trim();
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
    updateStatus('接続中...');
    toggleButtons(false);
    
    // シンプルにポーリングで検索
    startJoinPolling();
  }
  
  async function pollForAnswer() {
    const keyword = elements.keyword.value;
    let attempts = 0;
    const maxAttempts = 30;
    
    const pollInterval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts || sessionManager.connectionEstablished) {
        clearInterval(pollInterval);
        if (!sessionManager.connectionEstablished) {
          updateStatus('タイムアウト: 参加者が見つかりませんでした');
        }
        return;
      }
      
      try {
        // トークンベースのパスと旧形式の両方をチェック
        const answerPath = sessionManager.sessionToken ? 
        `${keyword}/${sessionManager.sessionToken}/answer` : 
        `${keyword}-answer`;
        
        const signal = await receiveSignal(answerPath);
        if (signal && signal.type === 'answer') {
          clearInterval(pollInterval);
          updateStatus('参加者からの応答を受信 - ICE候補を交換中...');
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
    
    updateStatus('オファーを検索しています...');
    
    const pollInterval = setInterval(async () => {
      attempts++;
      if (attempts > maxAttempts || sessionManager.connectionEstablished) {
        clearInterval(pollInterval);
        if (!sessionManager.connectionEstablished) {
          updateStatus('タイムアウト: セッションが見つかりませんでした');
          cleanup();
        }
        return;
      }
      
      try {
        // シンプルに基本キーワードのみを検索
        console.log('オファーを検索中:', keyword);
        const signal = await receiveSignal(keyword);
        
        if (signal && signal.type === 'offer') {
          clearInterval(pollInterval);
          updateStatus('オファー受信 - 応答を準備中...');
          
          // ホストからのトークンを保存
          if (signal.token) {
            sessionManager.sessionToken = signal.token;
            console.log('セッショントークン受信:', sessionManager.sessionToken);
          }
          
          await webRTCManager.createPeerConnection(elements, updateStatus, sendSignal);
          webRTCManager.setupDataChannel();
          
          await webRTCManager.setRemoteDescription(signal.offer);
          updateStatus('応答を作成中...');
          const answer = await webRTCManager.createAnswer();
          
          // トークンを使用した安全なパスで応答
          const answerPath = sessionManager.sessionToken ? 
          `${keyword}/${sessionManager.sessionToken}/answer` : 
          `${keyword}-answer`;
          
          updateStatus('応答を送信中...');
          await sendSignal(answerPath, {
            type: 'answer',
            answer: answer
          });
          
          updateStatus('ICE候補を交換中...');
          pollForIceCandidates();
        }
      } catch (error) {
        console.log('参加ポーリングエラー:', error.message);
      }
    }, 2000);
    
    addPollingInterval(pollInterval);
  }
  
  async function pollForIceCandidates() {
    const keyword = sessionManager.currentKeyword || elements.keyword.value;
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
        const signal = await receiveSignal(targetKey);
        if (signal && signal.type === 'ice-batch' && signal.isHost !== sessionManager.isHost) {
          console.log('ICE候補受信:', signal.candidates.length, '個');
          clearInterval(pollInterval);
          updateStatus('ICE候補を受信 - 接続を確立中...');
          for (const candidate of signal.candidates) {
            console.log('ICE候補追加:', candidate.type);
            try {
              await webRTCManager.addIceCandidate(candidate);
            } catch (error) {
              console.log('ICE候補追加エラー:', error.message);
            }
          }
          console.log('ICE候補追加完了');
          updateStatus('接続を確立中...');
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
    
    keywordTimer = setTimeout(() => {
      if (!sessionManager.sessionActive) {
        updateStatus('キーワードの有効期限が切れました');
        cleanup();
      }
    }, 10 * 60 * 1000);
    
    const timerInterval = setInterval(() => {
      if (!sessionManager.startTime) {
        clearInterval(timerInterval);
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
      elements.timer.textContent = timerText;
      elements.timer2.textContent = timerText;
    } else {
      elements.timer.textContent = '';
      elements.timer2.textContent = '';
    }
  }
  
  function clearKeywordTimer() {
    if (keywordTimer) {
      clearTimeout(keywordTimer);
      keywordTimer = null;
    }
    elements.timer.textContent = '';
    elements.timer2.textContent = '';
  }
  
  
  
  function handleDisconnect() {
    clearReconnectInterval();
    if (sessionManager.isHost) {
      updateStatus('セッション終了');
    } else {
      updateStatus('ホストが退室しました');
    }
    cleanup();
  }
  
  function clearReconnectInterval() {
    if (reconnectInterval) {
      clearInterval(reconnectInterval);
      reconnectInterval = null;
    }
  }
  
  function leaveSession() {
    updateStatus('退室しました');
    cleanup();
    
    // ページリロードではなく、状態をリセット
    setTimeout(() => {
      updateStatus('未接続');
      toggleButtons(true);
    }, 100);
  }
  
  function cleanup() {
    stopAllPolling(); // 全ポーリング停止
    
    // 進行中のppng.io接続をキャンセル
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
      console.log('ppng.io接続をキャンセルしました');
    }
    
    webRTCManager.close();
    
    // ローカルストリームをクリーンアップ（ホスト・ゲスト両方）
    if (mediaManager.getLocalStream()) {
      mediaManager.stopCamera();
      elements.localAA.textContent = '';
      console.log('ローカルビデオストリーム停止');
    }
    
    elements.remoteVideo.srcObject = null;
    elements.remoteAA.textContent = '';
    
    // ホスト側でない場合のみローカルAAをクリア
    if (!sessionManager.isHost) {
      elements.localAA.textContent = '';
    }
    
    // iceCandidates now managed by webRTCManager
    reconnectAttempts = 0;
    isWaitingForGuest = false;
    
    // ゲスト退室時はホスト状態を保持
    if (!sessionManager.isHost) {
      sessionManager.reset();
    } else {
      sessionManager.endSession();
    }
    
    clearKeywordTimer();
    clearReconnectInterval();
    
    toggleButtons(true);
  }
  
  function updateStatus(text) {
    elements.statusText.textContent = text;
    elements.statusText2.textContent = text;
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
          updateStatus(`接続完了 (${connectionType})`);
        }
      } else {
        if (shouldUpdateStatus) {
          updateStatus('接続完了');
        }
      }
    } else {
      // 詳細な接続情報を表示
      const info = `接続: ${connectionState} | ICE: ${iceConnectionState} | 収集: ${iceGatheringState}`;
      elements.timer.textContent = info;
      elements.timer2.textContent = info;
    }
  }
  
  function toggleButtons(enabled) {
    elements.hostBtn.style.display = enabled ? 'inline-block' : 'none';
    elements.joinBtn.style.display = enabled ? 'inline-block' : 'none';
    elements.leaveBtn.style.display = enabled ? 'none' : 'inline-block';
    elements.keyword.disabled = !enabled;
  }
  
  // ユーザー操作によるビデオ再生を許可
  function enableAutoplayAfterUserGesture() {
    // すべてのビデオ要素で自動再生を試行
    playVideoSafely(elements.localVideo, 'ローカル（ユーザー操作後）');
    playVideoSafely(elements.remoteVideo, 'リモート（ユーザー操作後）');
  }
  
  elements.hostBtn.addEventListener('click', () => {
    enableAutoplayAfterUserGesture();
    hostSession();
  });
  
  elements.joinBtn.addEventListener('click', () => {
    enableAutoplayAfterUserGesture();
    joinSession();
  });
  
  elements.leaveBtn.addEventListener('click', leaveSession);
  
  // URLパラメータからキーワードを自動入力
  function loadKeywordFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const keyword = urlParams.get('k');
    if (keyword) {
      elements.keyword.value = keyword;
      elements.keyword.readOnly = true; // 編集不可に設定
      elements.clearBtn.style.display = 'inline-block'; // クリアボタン表示
      console.log('URLからキーワードを読み込み:', keyword);
    }
  }
  
  // クリアボタンのイベントリスナー
  elements.clearBtn.addEventListener('click', () => {
    // パラメータなしのURLに遷移
    window.location.href = window.location.pathname;
  });
  
  // 文字サイズ自動調整関数
  function adjustAAFontSize() {
    const aaDisplays = document.querySelectorAll('.aa-display');
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
      adjustAAFontSize();
    }, 1000);
  });
  
  // Visual Viewport API対応（iOSキーボード表示時の対応）
  let viewportResizeTimeout;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      clearTimeout(viewportResizeTimeout);
      viewportResizeTimeout = setTimeout(() => {
        adjustAAFontSize();
      }, 1000);
    });
  }
  
  // ダイアログ制御
  function openDeviceDialog() {
    elements.deviceDialog.style.display = 'flex';
  }
  
  function closeDeviceDialog() {
    elements.deviceDialog.style.display = 'none';
  }
  
  async function applyDeviceSelection() {
    const newVideoDeviceId = elements.videoSelectDialog.value;
    const newAudioDeviceId = elements.audioSelectDialog.value;
    
    // デバイス変更があるかチェック
    const videoChanged = mediaManager.selectedDeviceIds.video !== newVideoDeviceId;
    const audioChanged = mediaManager.selectedDeviceIds.audio !== newAudioDeviceId;
    
    if (!videoChanged && !audioChanged) {
      closeDeviceDialog();
      return;
    }
    
    // 選択デバイスIDを更新
    mediaManager.selectedDeviceIds.video = newVideoDeviceId;
    mediaManager.selectedDeviceIds.audio = newAudioDeviceId;
    
    // デスクトップ用の選択も同期
    elements.videoSelect.value = mediaManager.selectedDeviceIds.video;
    elements.audioSelect.value = mediaManager.selectedDeviceIds.audio;
    
    console.log('デバイス選択適用:', {
      video: elements.videoSelectDialog.options[elements.videoSelectDialog.selectedIndex]?.text,
      audio: elements.audioSelectDialog.options[elements.audioSelectDialog.selectedIndex]?.text,
      sessionActive: sessionManager.sessionActive
    });
    
    // 通話中の場合はデバイスを切り替え
    if (sessionManager.sessionActive && mediaManager.getLocalStream() && webRTCManager.getPeerConnection()) {
      try {
        await mediaManager.switchDeviceDuringCall(videoChanged, audioChanged, webRTCManager.getPeerConnection());
      } catch (error) {
        console.error('通話中のデバイス切り替えエラー:', error);
        alert('デバイスの切り替えに失敗しました: ' + error.message);
      }
    }
    
    closeDeviceDialog();
  }
  
  // イベントリスナー設定
  elements.deviceBtn.addEventListener('click', openDeviceDialog);
  elements.mobileDeviceBtn.addEventListener('click', openDeviceDialog);
  elements.closeDialog.addEventListener('click', closeDeviceDialog);
  elements.applyDevices.addEventListener('click', applyDeviceSelection);
  elements.refreshDevices.addEventListener('click', () => mediaManager.getAvailableDevices());
  elements.refreshDevicesDialog.addEventListener('click', () => mediaManager.getAvailableDevices());
  
  // ヘルプダイアログのイベントリスナー
  elements.helpBtn.addEventListener('click', () => {
    elements.helpDialog.style.display = 'flex';
  });

  elements.mobileHelpBtn.addEventListener('click', () => {
    elements.helpDialog.style.display = 'flex';
  });
  
  elements.closeHelpDialog.addEventListener('click', () => {
    elements.helpDialog.style.display = 'none';
  });
  
  // ヘルプダイアログ外側クリックで閉じる
  elements.helpDialog.addEventListener('click', (e) => {
    if (e.target === elements.helpDialog) {
      elements.helpDialog.style.display = 'none';
    }
  });
  
  // ダイアログ外クリックで閉じる
  elements.deviceDialog.addEventListener('click', (e) => {
    if (e.target === elements.deviceDialog) {
      closeDeviceDialog();
    }
  });
  
  elements.videoSelect.addEventListener('change', () => {
    if (mediaManager.getLocalStream()) {
      console.log('ビデオデバイス変更:', elements.videoSelect.options[elements.videoSelect.selectedIndex].text);
    }
  });
  
  elements.audioSelect.addEventListener('change', () => {
    if (mediaManager.getLocalStream()) {
      console.log('音声デバイス変更:', elements.audioSelect.options[elements.audioSelect.selectedIndex].text);
    }
  });
  
  // ページ読み込み時に実行
  loadKeywordFromURL();
  startAAConversion();
  adjustAAFontSize();
  mediaManager.getAvailableDevices();
  