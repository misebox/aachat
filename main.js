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

async function sendSignal(keyword, data) {
    const json = JSON.stringify(data);
    const encrypted = xorEncrypt(json, keyword);
    
    const response = await fetch(`${PPNG_SERVER}/${keyword}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: encrypted
    });
    
    if (!response.ok) {
        throw new Error('シグナル送信エラー');
    }
}

async function receiveSignal(keyword) {
    const response = await fetch(`${PPNG_SERVER}/${keyword}`);
    
    if (!response.ok) {
        if (response.status === 400) {
            // データがまだ送信されていない
            return null;
        }
        throw new Error('シグナル受信エラー');
    }
    
    const encrypted = await response.text();
    const decrypted = xorDecrypt(encrypted, keyword);
    return JSON.parse(decrypted);
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
            reconnectAttempts = 0; // 成功時にリセット
            clearKeywordTimer();
        } else if (peerConnection.connectionState === 'disconnected' || 
                   peerConnection.connectionState === 'failed') {
            if (sessionActive) {
                // セッション中の切断の場合は再接続を試行
                attemptReconnect();
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
    
    currentKeyword = keyword; // 再接続用に保存
    
    if (!await startCamera()) return;
    
    isHost = true;
    updateStatus('接続準備中...');
    toggleButtons(false);
    
    await createPeerConnection();
    setupDataChannel();
    
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    await sendSignal(keyword, {
        type: 'offer',
        offer: offer
    });
    
    updateStatus('参加者を待っています...');
    startKeywordTimer();
    
    pollForAnswer();
}

async function joinSession() {
    const keyword = elements.keyword.value.trim();
    if (!keyword) {
        alert('キーワードを入力してください');
        return;
    }
    
    currentKeyword = keyword; // 再接続用に保存
    
    if (!await startCamera()) return;
    
    isHost = false;
    updateStatus('接続中...');
    toggleButtons(false);
    
    try {
        const signal = await receiveSignal(keyword);
        
        if (!signal || signal.type !== 'offer') {
            throw new Error('有効なセッションが見つかりません');
        }
        
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
        
    } catch (error) {
        console.error('参加エラー:', error);
        updateStatus('接続に失敗しました');
        cleanup();
    }
}

async function pollForAnswer() {
    const keyword = elements.keyword.value;
    const pollInterval = setInterval(async () => {
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
    }, 1000);
    
    setTimeout(() => clearInterval(pollInterval), 60000);
}

async function pollForIceCandidates() {
    const keyword = elements.keyword.value;
    const targetKey = `${keyword}-ice-${isHost ? 'guest' : 'host'}`;
    console.log('ICE候補ポーリング開始:', targetKey);
    
    const pollInterval = setInterval(async () => {
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
    }, 1000);
    
    setTimeout(() => {
        console.log('ICE候補ポーリングタイムアウト');
        clearInterval(pollInterval);
    }, 30000);
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

async function attemptReconnect() {
    if (reconnectAttempts >= maxReconnectAttempts) {
        updateStatus('再接続回数上限に達しました');
        handleDisconnect();
        return;
    }
    
    reconnectAttempts++;
    updateStatus(`再接続中... (${reconnectAttempts}/${maxReconnectAttempts})`);
    
    // 既存の接続をクリーンアップ
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    
    // 少し待ってから再接続
    setTimeout(async () => {
        try {
            iceCandidates = [];
            
            if (isHost) {
                await createPeerConnection();
                setupDataChannel();
                
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                
                await sendSignal(`${currentKeyword}-reconnect-${Date.now()}`, {
                    type: 'offer',
                    offer: offer
                });
                
                pollForAnswer();
            } else {
                // ゲストは新しいオファーを待つ
                pollForReconnectOffer();
            }
        } catch (error) {
            console.error('再接続エラー:', error);
            setTimeout(() => attemptReconnect(), 2000);
        }
    }, 2000);
}

async function pollForReconnectOffer() {
    const pollInterval = setInterval(async () => {
        try {
            // 再接続用のオファーをポーリング
            const signals = await Promise.all([
                receiveSignal(`${currentKeyword}-reconnect-${Date.now()}`).catch(() => null),
                receiveSignal(`${currentKeyword}-reconnect-${Date.now() - 1000}`).catch(() => null),
                receiveSignal(`${currentKeyword}-reconnect-${Date.now() - 2000}`).catch(() => null)
            ]);
            
            const signal = signals.find(s => s && s.type === 'offer');
            
            if (signal) {
                clearInterval(pollInterval);
                
                await createPeerConnection();
                setupDataChannel();
                
                await peerConnection.setRemoteDescription(signal.offer);
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                
                await sendSignal(`${currentKeyword}-answer`, {
                    type: 'answer',
                    answer: answer
                });
                
                pollForIceCandidates();
            }
        } catch (error) {
            // 再接続オファー待ち
        }
    }, 1000);
    
    setTimeout(() => {
        clearInterval(pollInterval);
        setTimeout(() => attemptReconnect(), 1000);
    }, 5000);
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