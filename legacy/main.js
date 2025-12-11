import { Config, AAChat, SessionManager, Logger, Elm } from './js/aachat.js';

// グローバルエラーハンドラ
window.onerror = function(msg, url, line) {
  console.error('エラー:', msg, url, line);
};

// Logger初期化
const logger = new Logger();

// ヘルパー関数
function updateSelectOptions(selectElement, devices, prefix) {
  selectElement.innerHTML = '';
  devices.forEach((device, index) => {
    const option = document.createElement('option');
    option.value = device.deviceId;
    option.text = device.label || `${prefix} ${index + 1}`;
    selectElement.appendChild(option);
  });
}

async function playVideoSafely(videoElement, label) {
  if (videoElement.readyState >= 2) {
    try {
      await videoElement.play();
    } catch (e) {
      console.warn(`${label}ビデオ再生保留:`, e.message);
    }
  } else {
    videoElement.addEventListener('loadeddata', async () => {
      try {
        await videoElement.play();
      } catch (e) {
        console.warn(`${label}ビデオ再生保留:`, e.message);
      }
    }, { once: true });

    setTimeout(() => {
      if (videoElement.paused && videoElement.srcObject) {
        videoElement.play().catch(() => {});
      }
    }, 5000);
  }
}

// AAChat初期化
const aaChat = new AAChat({
  logger,
  Elm,
  callbacks: {
    playVideoSafely,
    updateSelectOptions
  }
});

// LoggerにセッションInfo取得関数を設定
logger.setSessionInfoGetter(() => ({
  isHost: aaChat.sessionManager?.isHost ?? false,
  state: aaChat.sessionManager?.state ?? 'IDLE'
}));

// ショートカット参照
const mediaManager = aaChat.mediaManager;
const sessionManager = aaChat.sessionManager;
const signalingManager = aaChat.signalingManager;
const asciiConverter = aaChat.asciiConverter;
const uiManager = aaChat.uiManager;

// ===== セッション関数 =====

async function connectSession(retryCount = 0) {
  const maxRetries = Config.CONNECT_MAX_RETRIES;
  const keyword = Elm.keyword.value.trim();
  if (!keyword) {
    uiManager.updateStatus('キーワードを入力してください');
    return;
  }

  // カメラが起動していなければ起動
  if (!mediaManager.getLocalStream()) {
    const cameraStarted = await mediaManager.startCamera();
    if (!cameraStarted) {
      logger.error('CAM', 'カメラ起動失敗');
      uiManager.updateStatus('カメラの起動に失敗しました');
      return;
    }
    logger.log('カメラ起動成功');
  }

  uiManager.toggleButtons(false);
  uiManager.updateStatus('接続中...');

  try {
    sessionManager.setState(SessionManager.State.HEAD_CHECK);
    const offerExists = await signalingManager.exists(keyword);
    logger.sig('HEAD:', offerExists ? '200 → ゲスト' : '404 → ホスト');

    if (offerExists) {
      await guestSession(keyword);
    } else {
      await hostSession(keyword);
    }
  } catch (error) {
    logger.error('SIG', 'connectSession error:', error.message);
    await cleanup();

    if (retryCount < maxRetries) {
      logger.sig('リトライ:', retryCount + 1);
      await new Promise(r => setTimeout(r, Config.RETRY_DELAY));
      await connectSession(retryCount + 1);
    } else {
      uiManager.updateStatus('接続に失敗しました');
      uiManager.toggleButtons(true);
    }
  }
}

async function hostSession(keyword) {
  const { Utility } = await import('./js/utility.js');
  const sessionHash = Utility.generateSessionToken();
  sessionManager.startSession(true, keyword, sessionHash);
  signalingManager.setCancelKey(sessionHash);

  await aaChat.webRTCManager.createPeerConnection();
  if (!sessionManager.sessionActive) return;

  aaChat.webRTCManager.setupDataChannel();
  const offer = await aaChat.webRTCManager.createOffer();
  if (!sessionManager.sessionActive) return;

  uiManager.updateStatus('ホストとして参加者を待っています...');
  startKeywordTimer();

  // 1. PUT offer（ゲストが消費するまで待つ）
  sessionManager.setState(SessionManager.State.H_OFFER_PUT);
  logger.sig('offer PUT開始');

  const result = await signalingManager.send(keyword, {
    type: 'offer',
    offer: offer,
    sessionHash: sessionHash
  }, keyword, Config.TIMEOUT_OFFER_PUT);

  if (!sessionManager.sessionActive) return;
  if (result.timedOut) {
    logger.sig('offer PUT timeout, reconnect');
    throw new Error('offer_timeout');
  }

  logger.sig('offer consumed');

  // 2. GET answer（オファーが消費された後に開始）
  const answerPath = sessionManager.getChannelPath('answer');
  sessionManager.setState(SessionManager.State.H_ANSWER_GET);
  logger.sig('answer GET waiting:', answerPath);

  const signal = await signalingManager.receive(answerPath, keyword, Config.TIMEOUT_SIGNALING);
  if (!sessionManager.sessionActive) return;
  if (!signal || signal.type !== 'answer') {
    logger.sig('answer GET failed');
    throw new Error('answer_timeout');
  }

  logger.sig('answer received');
  const answer = signal.answer;

  // 3. ICE交換
  uiManager.updateStatus('応答を受信 - 接続中...');
  await aaChat.webRTCManager.setRemoteDescription(answer);
  if (!sessionManager.sessionActive) return;

  const [iceSendOk] = await Promise.all([
    aaChat.webRTCManager.sendIceCandidates(),
    receiveIceCandidates()
  ]);
  if (!iceSendOk) {
    throw new Error('ice_exchange_failed');
  }
}

async function guestSession(keyword) {
  logger.sig('guestSession start');

  uiManager.updateStatus('ホストを探しています...');
  startKeywordTimer();

  sessionManager.setState(SessionManager.State.G_OFFER_GET);
  logger.sig('offer GET waiting');
  let offer = null;
  let sessionHash = null;
  try {
    const signal = await signalingManager.receive(keyword, keyword, Config.TIMEOUT_SIGNALING);
    if (signal && signal.type === 'offer' && signal.sessionHash) {
      logger.sig('offer received, hash:', signal.sessionHash);
      offer = signal.offer;
      sessionHash = signal.sessionHash;
    } else {
      logger.sig('offer GET failed');
      throw new Error('offer_get_failed');
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      logger.sig('offer GET cancelled');
      return;
    }
    throw error;
  }

  sessionManager.startSession(false, keyword, sessionHash);
  signalingManager.setCancelKey(sessionHash);

  logger.sig('creating PeerConnection');
  await aaChat.webRTCManager.createPeerConnection();
  if (!sessionManager.sessionActive) return;

  aaChat.webRTCManager.setupDataChannel();
  await aaChat.webRTCManager.setRemoteDescription(offer);
  if (!sessionManager.sessionActive) return;

  uiManager.updateStatus('応答を作成中...');
  const answer = await aaChat.webRTCManager.createAnswer();
  if (!sessionManager.sessionActive) return;

  logger.sig('answer created');

  const answerPath = sessionManager.getChannelPath('answer');
  uiManager.updateStatus('応答を送信中...');
  sessionManager.setState(SessionManager.State.G_ANSWER_PUT);
  logger.sig('answer PUT:', answerPath);
  try {
    const result = await signalingManager.send(answerPath, {
      type: 'answer',
      answer: answer
    }, keyword, Config.TIMEOUT_SIGNALING);
    if (!sessionManager.sessionActive) return;

    if (result.success) {
      logger.sig('answer PUT success');
      uiManager.updateStatus('接続中...');
      const [iceSendOk] = await Promise.all([
        aaChat.webRTCManager.sendIceCandidates(),
        receiveIceCandidates()
      ]);
      if (!iceSendOk) {
        throw new Error('ice_exchange_failed');
      }
      return;
    }
    logger.sig('answer PUT failed');
    throw new Error('answer_put_failed');
  } catch (error) {
    if (error.name === 'AbortError') {
      logger.sig('answer PUT cancelled');
      return;
    }
    throw error;
  }
}

async function receiveIceCandidates() {
  if (!sessionManager.sessionHash) return;

  sessionManager.setState(sessionManager.isHost ? SessionManager.State.H_ICE_RECV : SessionManager.State.G_ICE_RECV);

  const keyword = sessionManager.currentKeyword;
  const iceSuffix = `ice-${sessionManager.isHost ? 'guest' : 'host'}`;
  const targetKey = sessionManager.getChannelPath(iceSuffix);
  logger.ice('GET:', targetKey);

  try {
    const signal = await signalingManager.receive(targetKey, keyword, Config.TIMEOUT_SIGNALING);
    if (signal && signal.type === 'ice-batch' && signal.isHost !== sessionManager.isHost) {
      logger.ice('received', signal.candidates.length, 'candidates');
      for (const candidate of signal.candidates) {
        try {
          await aaChat.webRTCManager.addIceCandidate(candidate);
        } catch (error) {
          // ignore
        }
      }
      logger.ice('candidates added');
    }
  } catch (error) {
    logger.error('ICE', 'GET error:', error.message);
  }
}

function startKeywordTimer() {
  updateTimer();
  aaChat.timerInterval = setInterval(() => {
    updateTimer();
  }, 1000);

  aaChat.keywordTimer = setTimeout(() => {
    if (!sessionManager.connectionEstablished) {
      logger.sig('keyword timer expired');
      cleanup();
      uiManager.updateStatus('接続タイムアウト');
      uiManager.toggleButtons(true);
    }
  }, Config.KEYWORD_TIMER_MAX);
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

function updateTimer() {
  const remaining = sessionManager.getRemainingTime(Config.KEYWORD_TIMER_MAX / 1000);
  if (!sessionManager.connectionEstablished && remaining > 0) {
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const timerText = `${minutes}:${String(seconds).padStart(2, '0')}`;
    Elm.timer.textContent = timerText;
    Elm.timer2.textContent = timerText;
  }
}

function handleDisconnect() {
  logger.sig('handleDisconnect');
  cleanup();
  uiManager.updateStatus('切断されました');
  uiManager.toggleButtons(true);
}

async function cleanup() {
  clearKeywordTimer();
  sessionManager.endSession();
  signalingManager.abort();
  signalingManager.clearCancelKey();
  aaChat.webRTCManager?.close();
}

async function reconnectSession(keyword) {
  logger.sig('reconnectSession:', keyword);

  aaChat.reconnectAttempts++;
  if (aaChat.reconnectAttempts > aaChat.maxReconnectAttempts) {
    logger.sig('max reconnect attempts reached');
    handleDisconnect();
    return;
  }

  aaChat.webRTCManager?.close();
  sessionManager.reset();
  signalingManager.abort();
  signalingManager.clearCancelKey();

  try {
    sessionManager.setState(SessionManager.State.HEAD_CHECK);
    const offerExists = await signalingManager.exists(keyword);
    logger.sig('reconnect HEAD:', offerExists ? '200 → ゲスト' : '404 → ホスト');

    if (offerExists) {
      await guestSession(keyword);
    } else {
      await hostSession(keyword);
    }
  } catch (error) {
    logger.error('SIG', 'reconnect error:', error.message);
    uiManager.updateStatus('再接続に失敗しました');
    setTimeout(() => reconnectSession(keyword), Config.RETRY_DELAY);
  }
}

async function getConnectionType() {
  if (!aaChat.webRTCManager?.getPeerConnection()) return null;

  try {
    const stats = await aaChat.webRTCManager.getPeerConnection().getStats();
    for (const report of stats.values()) {
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        const localCandidate = stats.get(report.localCandidateId);
        if (localCandidate) {
          return localCandidate.candidateType;
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

async function updateConnectionInfo(shouldUpdateStatus = false) {
  if (!aaChat.webRTCManager?.getPeerConnection()) return;

  const connectionState = aaChat.webRTCManager.getPeerConnection()?.connectionState;
  const iceConnectionState = aaChat.webRTCManager.getPeerConnection()?.iceConnectionState;
  const iceGatheringState = aaChat.webRTCManager.getPeerConnection()?.iceGatheringState;

  logger.rtc('conn:', connectionState, 'ice:', iceConnectionState, 'gather:', iceGatheringState);

  if (shouldUpdateStatus && connectionState === 'connected') {
    const connectionType = await getConnectionType();
    if (connectionType) {
      uiManager.updateStatus(`接続完了 (${connectionType})`);
    }
  }
}

async function leaveSession() {
  logger.sig('leaveSession');
  await cleanup();
  asciiConverter.stopConversion();
  aaChat.webRTCManager?.close();
  mediaManager.stopCamera();
  sessionManager.reset();

  Elm.localAA.textContent = '';
  Elm.remoteAA.textContent = '';

  uiManager.updateStatus('未接続');
  uiManager.toggleButtons(true);

  asciiConverter.startConversion(Elm.localVideo, Elm.remoteVideo, Elm.localAA, Elm.remoteAA);
}

// ===== WebRTCManagerセットアップ =====
aaChat.setupWebRTC({
  playVideoSafely,
  updateConnectionInfo,
  getConnectionType,
  handleDisconnect,
  clearKeywordTimer,
  reconnectSession,
  onConnected: () => {
    aaChat.isWaitingForGuest = false;
    aaChat.reconnectAttempts = 0;
    clearKeywordTimer();
  }
});

// ===== イベントリスナー =====
Elm.connectBtn.addEventListener('click', connectSession);
Elm.leaveBtn.addEventListener('click', leaveSession);
Elm.refreshDevices.addEventListener('click', () => mediaManager.getAvailableDevices());
Elm.deviceBtn.addEventListener('click', () => uiManager.openDeviceDialog());
Elm.mobileDeviceBtn.addEventListener('click', () => uiManager.openDeviceDialog());
Elm.closeDialog.addEventListener('click', () => uiManager.closeDeviceDialog());
Elm.refreshDevicesDialog.addEventListener('click', () => mediaManager.getAvailableDevices());
Elm.applyDevices.addEventListener('click', () => mediaManager.applyDeviceSelection(sessionManager, () => uiManager.closeDeviceDialog()));
Elm.helpBtn.addEventListener('click', () => uiManager.openHelpDialog());
Elm.mobileHelpBtn.addEventListener('click', () => uiManager.openHelpDialog());
Elm.closeHelpDialog.addEventListener('click', () => uiManager.closeHelpDialog());

Elm.helpDialog.addEventListener('click', (e) => {
  if (e.target === Elm.helpDialog) uiManager.closeHelpDialog();
});
Elm.deviceDialog.addEventListener('click', (e) => {
  if (e.target === Elm.deviceDialog) uiManager.closeDeviceDialog();
});

Elm.clearBtn.addEventListener('click', () => {
  Elm.keyword.value = '';
  Elm.clearBtn.style.display = 'none';
  history.replaceState(null, '', window.location.pathname);
  uiManager.isKeywordFromURL = false;
  uiManager.updateKeywordLockState(false);
});

// ユーザー操作によるビデオ再生許可
document.body.addEventListener('click', () => {
  if (Elm.localVideo.srcObject && Elm.localVideo.paused) {
    Elm.localVideo.play().catch(() => {});
  }
  if (Elm.remoteVideo.srcObject && Elm.remoteVideo.paused) {
    Elm.remoteVideo.play().catch(() => {});
  }
}, { once: true });

// リサイズイベント
let resizeTimeout;
window.addEventListener('resize', () => {
  if (resizeTimeout) clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => uiManager.adjustAAFontSize(), 100);
});

// Visual Viewport API対応
if (window.visualViewport) {
  let wasKeyboardVisible = false;
  window.visualViewport.addEventListener('resize', () => {
    const keyboardVisible = window.visualViewport.height < window.innerHeight * 0.75;
    if (wasKeyboardVisible && !keyboardVisible) {
      setTimeout(() => {
        window.scrollTo(0, 0);
        const viewport = Elm.viewport;
        if (viewport) {
          viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        }
      }, 100);
    }
    if (!keyboardVisible) {
      setTimeout(() => uiManager.adjustAAFontSize(), 200);
    }
    wasKeyboardVisible = keyboardVisible;
  });
}

// ページ終了時のクリーンアップ
function performCleanup() {
  console.log('Cleanup: abort requests, camera, WebRTC');
  signalingManager.abort();
  if (sessionManager.sessionHash) {
    if (sessionManager.isHost) {
      signalingManager.cancelOnServer(sessionManager.getChannelPath('answer'));
      signalingManager.cancelOnServer(sessionManager.getChannelPath('ice-guest'));
    } else {
      signalingManager.cancelOnServer(sessionManager.getChannelPath('ice-host'));
    }
  }
  if (mediaManager.getLocalStream()) {
    mediaManager.stopCamera();
  }
  aaChat.webRTCManager?.close();
}

window.addEventListener('beforeunload', performCleanup);

// 初期化
uiManager.loadKeywordFromURL();
asciiConverter.startConversion(Elm.localVideo, Elm.remoteVideo, Elm.localAA, Elm.remoteAA);
uiManager.adjustAAFontSize();
mediaManager.getAvailableDevices();
