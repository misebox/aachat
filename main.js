const PPNG_SERVER = 'https://ppng.io';
const STUN_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
];

// XOR暗号化用の関数
function xorEncrypt(text, key) {
    const encrypted = [];
    for (let i = 0; i < text.length; i++) {
        encrypted.push(String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length)));
    }
    return btoa(encrypted.join(''));
}

function xorDecrypt(encryptedBase64, key) {
    const encrypted = atob(encryptedBase64);
    const decrypted = [];
    for (let i = 0; i < encrypted.length; i++) {
        decrypted.push(String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length)));
    }
    return decrypted.join('');
}

const ASCII_CHARS = ' .`\':,^;-~+<*O#@';
const AA_WIDTH = 80;
const AA_HEIGHT = 60;

let localStream = null;
let peerConnection = null;
let dataChannel = null;
let isHost = false;
let sessionActive = false;
let keywordTimer = null;
let sessionStartTime = null;
let iceCandidates = [];
let reconnectAttempts = 0;
let maxReconnectAttempts = 5;
let reconnectInterval = null;
let currentKeyword = null;
let activePollingIntervals = [];
let connectionEstablished = false;
let isWaitingForGuest = false;

const elements = {
    keyword: document.getElementById('keyword'),
    hostBtn: document.getElementById('hostBtn'),
    joinBtn: document.getElementById('joinBtn'),
    leaveBtn: document.getElementById('leaveBtn'),
    statusText: document.getElementById('statusText'),
    timer: document.getElementById('timer'),
    localVideo: document.getElementById('localVideo'),
    remoteVideo: document.getElementById('remoteVideo'),
    localAA: document.getElementById('localAA'),
    remoteAA: document.getElementById('remoteAA'),
    canvas: document.getElementById('canvas')
};

const ctx = elements.canvas.getContext('2d');

async function startCamera() {
    try {
        // スマホ対応のため制約を緩和
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 640, max: 1280 }, 
                height: { ideal: 480, max: 720 },
                facingMode: 'user'
            }, 
            audio: true 
        });
        elements.localVideo.srcObject = localStream;
        
        // ローカルビデオの再生を明示的に開始
        elements.localVideo.play().catch(e => console.log('ローカル動画再生エラー:', e));
        
        return true;
    } catch (error) {
        console.error('カメラアクセスエラー:', error);
        updateStatus('カメラアクセスが拒否されました: ' + error.message);
        return false;
    }
}

function videoToAscii(video) {
    if (!video.videoWidth || !video.videoHeight) return '';
    
    elements.canvas.width = AA_WIDTH;
    elements.canvas.height = AA_HEIGHT;
    
    ctx.drawImage(video, 0, 0, AA_WIDTH, AA_HEIGHT);
    const imageData = ctx.getImageData(0, 0, AA_WIDTH, AA_HEIGHT);
    const pixels = imageData.data;
    
    let ascii = '';
    for (let y = 0; y < AA_HEIGHT; y++) {
        for (let x = 0; x < AA_WIDTH; x++) {
            const i = (y * AA_WIDTH + x) * 4;
            const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
            const charIndex = Math.floor((brightness / 255) * (ASCII_CHARS.length - 1));
            ascii += ASCII_CHARS[charIndex];
        }
        ascii += '\n';
    }
    
    return ascii;
}

function startAAConversion() {
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
    }, 100);
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
    const encrypted = xorEncrypt(json, keyword);
    
    const response = await fetch(`${PPNG_SERVER}/aachat/${keyword}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
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
    const response = await fetch(`${PPNG_SERVER}/aachat/${keyword}`);
    
    if (!response.ok) {
        if (response.status === 400) {
            console.log('受信結果: データなし (400)');
            return null;
        }
        console.error('受信エラー:', response.status, response.statusText);
        throw new Error('シグナル受信エラー');
    }
    
    const encrypted = await response.text();
    const decrypted = xorDecrypt(encrypted, keyword);
    const data = JSON.parse(decrypted);
    console.log('受信成功:', keyword, 'データタイプ:', data.type);
    return data;
}

async function createPeerConnection() {
    peerConnection = new RTCPeerConnection({ iceServers: STUN_SERVERS });
    
    console.log('ローカルストリーム追加開始');
    localStream.getTracks().forEach(track => {
        console.log('トラック追加:', track.kind, track.enabled);
        peerConnection.addTrack(track, localStream);
    });
    console.log('ローカルストリーム追加完了');
    
    peerConnection.ontrack = (event) => {
        console.log('リモートトラック受信:', event.track.kind);
        elements.remoteVideo.srcObject = event.streams[0];
        elements.remoteVideo.onloadedmetadata = () => {
            console.log('リモートビデオサイズ:', elements.remoteVideo.videoWidth, 'x', elements.remoteVideo.videoHeight);
        };
        // リモートビデオの再生を明示的に開始
        elements.remoteVideo.play().catch(e => console.log('リモート動画再生エラー:', e));
    };
    
    peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
            console.log('ICE候補収集:', event.candidate.type);
            iceCandidates.push(event.candidate);
        } else {
            // ICE候補収集完了
            console.log('ICE候補収集完了. 候補数:', iceCandidates.length);
            if (iceCandidates.length > 0) {
                const keyword = elements.keyword.value;
                const iceKey = `${keyword}-ice-${isHost ? 'host' : 'guest'}`;
                console.log('ICE候補送信:', iceKey);
                await sendSignal(iceKey, {
                    type: 'ice-batch',
                    candidates: iceCandidates,
                    isHost: isHost
                });
            }
        }
    };
    
    peerConnection.onconnectionstatechange = () => {
        console.log('接続状態:', peerConnection.connectionState);
        updateStatus(`接続状態: ${peerConnection.connectionState}`);
        
        if (peerConnection.connectionState === 'connected') {
            updateStatus('接続完了');
            sessionActive = true;
            connectionEstablished = true;
            isWaitingForGuest = false;
            reconnectAttempts = 0;
            clearKeywordTimer();
            stopAllPolling(); // 接続完了時にポーリング停止
        } else if (peerConnection.connectionState === 'disconnected' || 
                   peerConnection.connectionState === 'failed') {
            if (connectionEstablished) {
                // 一度接続した後の切断の場合
                connectionEstablished = false;
                sessionActive = false;
                
                if (isHost) {
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
    peerConnection.oniceconnectionstatechange = () => {
        console.log('ICE接続状態:', peerConnection.iceConnectionState);
    };
    
    // ICE収集状態の監視
    peerConnection.onicegatheringstatechange = () => {
        console.log('ICE収集状態:', peerConnection.iceGatheringState);
    };
}

function setupDataChannel() {
    if (isHost) {
        dataChannel = peerConnection.createDataChannel('aa-data');
        setupDataChannelEvents();
    } else {
        peerConnection.ondatachannel = (event) => {
            dataChannel = event.channel;
            setupDataChannelEvents();
        };
    }
}

function setupDataChannelEvents() {
    dataChannel.onopen = () => {
        console.log('データチャンネル開通');
    };
    
    dataChannel.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'aa') {
            elements.remoteAA.textContent = message.data;
        }
    };
    
    dataChannel.onerror = (error) => {
        console.error('データチャンネルエラー:', error);
    };
}

async function hostSession() {
    const keyword = elements.keyword.value.trim();
    if (!keyword) {
        alert('キーワードを入力してください');
        return;
    }
    
    currentKeyword = keyword;
    
    if (!await startCamera()) return;
    
    isHost = true;
    updateStatus('接続準備中...');
    toggleButtons(false);
    
    await createPeerConnection();
    setupDataChannel();
    
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    console.log('オファーを送信中:', keyword);
    await sendSignal(keyword, {
        type: 'offer',
        offer: offer
    });
    console.log('オファー送信完了');
    
    updateStatus('参加者を待っています...');
    startKeywordTimer();
    
    pollForAnswer();
}

async function restartHostSession() {
    console.log('ホストセッション再開');
    
    // 既存の接続をクリーンアップ
    stopAllPolling();
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    iceCandidates = [];
    connectionEstablished = false;
    isWaitingForGuest = false;
    
    // 新しいセッションを開始
    await createPeerConnection();
    setupDataChannel();
    
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    console.log('新しいオファーを送信中:', currentKeyword);
    await sendSignal(currentKeyword, {
        type: 'offer',
        offer: offer
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
    
    currentKeyword = keyword;
    
    if (!await startCamera()) return;
    
    isHost = false;
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
        if (attempts > maxAttempts || connectionEstablished) {
            clearInterval(pollInterval);
            if (!connectionEstablished) {
                updateStatus('タイムアウト: 参加者が見つかりませんでした');
            }
            return;
        }
        
        try {
            const signal = await receiveSignal(`${keyword}-answer`);
            if (signal && signal.type === 'answer') {
                clearInterval(pollInterval);
                await peerConnection.setRemoteDescription(signal.answer);
                pollForIceCandidates();
            }
        } catch (error) {
            // 応答待ち
        }
    }, 2000);
    
    addPollingInterval(pollInterval);
}

async function startJoinPolling() {
    const keyword = currentKeyword;
    let attempts = 0;
    const maxAttempts = 30;
    
    updateStatus('オファーを検索しています...');
    
    const pollInterval = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts || connectionEstablished) {
            clearInterval(pollInterval);
            if (!connectionEstablished) {
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
                updateStatus('オファー受信 - 接続中...');
                
                await createPeerConnection();
                setupDataChannel();
                
                await peerConnection.setRemoteDescription(signal.offer);
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                
                await sendSignal(`${keyword}-answer`, {
                    type: 'answer',
                    answer: answer
                });
                
                pollForIceCandidates();
            }
        } catch (error) {
            console.log('参加ポーリングエラー:', error.message);
        }
    }, 2000);
    
    addPollingInterval(pollInterval);
}

async function pollForIceCandidates() {
    const keyword = elements.keyword.value;
    const targetKey = `${keyword}-ice-${isHost ? 'guest' : 'host'}`;
    console.log('ICE候補ポーリング開始:', targetKey);
    
    let attempts = 0;
    const maxAttempts = 10;
    
    const pollInterval = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts || connectionEstablished) {
            console.log('ICE候補ポーリング終了');
            clearInterval(pollInterval);
            return;
        }
        
        try {
            const signal = await receiveSignal(targetKey);
            if (signal && signal.type === 'ice-batch' && signal.isHost !== isHost) {
                console.log('ICE候補受信:', signal.candidates.length, '個');
                clearInterval(pollInterval);
                for (const candidate of signal.candidates) {
                    console.log('ICE候補追加:', candidate.type);
                    await peerConnection.addIceCandidate(candidate);
                }
                console.log('ICE候補追加完了');
            }
        } catch (error) {
            console.log('ICE候補受信エラー:', error.message);
        }
    }, 2000);
    
    addPollingInterval(pollInterval);
}

function startKeywordTimer() {
    sessionStartTime = Date.now();
    updateTimer();
    
    keywordTimer = setTimeout(() => {
        if (!sessionActive) {
            updateStatus('キーワードの有効期限が切れました');
            cleanup();
        }
    }, 10 * 60 * 1000);
    
    const timerInterval = setInterval(() => {
        if (!sessionStartTime) {
            clearInterval(timerInterval);
            return;
        }
        updateTimer();
    }, 1000);
}

function updateTimer() {
    if (!sessionStartTime) return;
    
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    const remaining = Math.max(0, 600 - elapsed);
    
    if (!sessionActive && remaining > 0) {
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        elements.timer.textContent = `有効期限: ${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
        elements.timer.textContent = '';
    }
}

function clearKeywordTimer() {
    if (keywordTimer) {
        clearTimeout(keywordTimer);
        keywordTimer = null;
    }
    elements.timer.textContent = '';
}



function handleDisconnect() {
    clearReconnectInterval();
    if (isHost) {
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
}

function cleanup() {
    stopAllPolling(); // 全ポーリング停止
    
    if (dataChannel) {
        dataChannel.close();
        dataChannel = null;
    }
    
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    
    elements.localVideo.srcObject = null;
    elements.remoteVideo.srcObject = null;
    elements.localAA.textContent = '';
    elements.remoteAA.textContent = '';
    
    isHost = false;
    sessionActive = false;
    sessionStartTime = null;
    iceCandidates = [];
    reconnectAttempts = 0;
    currentKeyword = null;
    connectionEstablished = false;
    isWaitingForGuest = false;
    clearKeywordTimer();
    clearReconnectInterval();
    
    toggleButtons(true);
}

function updateStatus(text) {
    elements.statusText.textContent = text;
}

function toggleButtons(enabled) {
    elements.hostBtn.style.display = enabled ? 'inline-block' : 'none';
    elements.joinBtn.style.display = enabled ? 'inline-block' : 'none';
    elements.leaveBtn.style.display = enabled ? 'none' : 'inline-block';
    elements.keyword.disabled = !enabled;
}

elements.hostBtn.addEventListener('click', hostSession);
elements.joinBtn.addEventListener('click', joinSession);
elements.leaveBtn.addEventListener('click', leaveSession);

startAAConversion();