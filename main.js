const PPNG_SERVER = 'https://ppng.io';
const STUN_SERVERS = [
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

// セッショントークン生成
function generateSessionToken() {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 16; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

function generateSuggestedKeyword(baseKeyword) {
    const suffixes = ['2', '3', 'b', 'alt', 'new', 'x'];
    const randomSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return baseKeyword + randomSuffix;
}

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
let sessionToken = null;
let currentAbortController = null;

const elements = {
    keyword: document.getElementById('keyword'),
    clearBtn: document.getElementById('clearBtn'),
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
        
        // ローカルビデオの適切な再生処理
        await playVideoSafely(elements.localVideo, 'ローカル');
        
        return true;
    } catch (error) {
        console.error('カメラアクセスエラー:', error);
        updateStatus('カメラアクセスが拒否されました: ' + error.message);
        return false;
    }
}

// ダイナミックレンジ調整パラメータ
let minBrightness = 0;
let maxBrightness = 255;
let dynamicRangeEnabled = true;

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
            let brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
            
            // ダイナミックレンジ調整
            if (dynamicRangeEnabled && maxBrightness > minBrightness) {
                // 現在の輝度を0-1の範囲に正規化
                brightness = (brightness - minBrightness) / (maxBrightness - minBrightness);
                brightness = Math.max(0, Math.min(1, brightness)); // クリップ
                
                // ASCII_CHARSのインデックスに変換
                const charIndex = Math.floor(brightness * (ASCII_CHARS.length - 1));
                ascii += ASCII_CHARS[charIndex];
            } else {
                // 通常の変換
                const charIndex = Math.floor((brightness / 255) * (ASCII_CHARS.length - 1));
                ascii += ASCII_CHARS[charIndex];
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
    
    // AA変換タイマー（100msごと）
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
        const response = await fetch(`${PPNG_SERVER}/aachat/${keyword}`, {
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
        const decrypted = xorDecrypt(encrypted, keyword);
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

async function createPeerConnection() {
    peerConnection = new RTCPeerConnection({ 
        iceServers: STUN_SERVERS,
        iceCandidatePoolSize: 10, // ICE候補のプールサイズを増やす
        bundlePolicy: 'max-bundle', // メディアバンドル最大化
        rtcpMuxPolicy: 'require' // RTCP多重化
    });
    
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
        // リモートビデオの適切な再生処理
        playVideoSafely(elements.remoteVideo, 'リモート');
    };
    
    let iceGatheringTimeout = null;
    peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
            console.log('ICE候補収集:', event.candidate.type, event.candidate.address);
            iceCandidates.push(event.candidate);
            
            // タイムアウトをリセット
            if (iceGatheringTimeout) clearTimeout(iceGatheringTimeout);
            
            // 3秒待ってから送信（より多くの候補を収集）
            iceGatheringTimeout = setTimeout(async () => {
                console.log('ICE候補収集タイムアウト. 候補数:', iceCandidates.length);
                if (iceCandidates.length > 0) {
                    const keyword = elements.keyword.value;
                    const iceKey = sessionToken ? 
                        `${keyword}/${sessionToken}/ice-${isHost ? 'host' : 'guest'}` :
                        `${keyword}-ice-${isHost ? 'host' : 'guest'}`;
                    console.log('ICE候補送信:', iceKey);
                    await sendSignal(iceKey, {
                        type: 'ice-batch',
                        candidates: iceCandidates,
                        isHost: isHost
                    });
                }
            }, 3000);
        } else {
            // ICE候補収集完了
            if (iceGatheringTimeout) clearTimeout(iceGatheringTimeout);
            console.log('ICE候補収集完了. 候補数:', iceCandidates.length);
            if (iceCandidates.length > 0) {
                const keyword = elements.keyword.value;
                const iceKey = sessionToken ? 
                    `${keyword}/${sessionToken}/ice-${isHost ? 'host' : 'guest'}` :
                    `${keyword}-ice-${isHost ? 'host' : 'guest'}`;
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
            sessionActive = true;
            connectionEstablished = true;
            isWaitingForGuest = false;
            reconnectAttempts = 0;
            clearKeywordTimer();
            stopAllPolling(); // 接続完了時にポーリング停止
            
            // 接続方法を取得してステータスに表示
            setTimeout(() => updateConnectionInfo(true), 1000);
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
        updateConnectionInfo();
    };
    
    // ICE収集状態の監視
    peerConnection.onicegatheringstatechange = () => {
        console.log('ICE収集状態:', peerConnection.iceGatheringState);
        updateConnectionInfo();
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
    
    // オファー作成時のオプションを追加
    const offer = await peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart: false
    });
    await peerConnection.setLocalDescription(offer);
    
    // セッショントークンを生成
    sessionToken = generateSessionToken();
    
    console.log('オファーを送信中:', keyword, 'トークン:', sessionToken);
    try {
        await sendSignal(keyword, {
            type: 'offer',
            offer: offer,
            token: sessionToken
        });
        console.log('オファー送信完了');
    } catch (error) {
        // 400エラーをチェック（既存ホストの検出）
        if (error.message.includes('シグナル送信エラー')) {
            try {
                const response = await fetch(`${PPNG_SERVER}/aachat/${keyword}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'text/plain' },
                    body: JSON.stringify({type: 'offer', offer: offer, token: sessionToken})
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    if (errorText.includes('Another sender has been connected')) {
                        // 既存ホストが存在
                        const suggestedKeyword = generateSuggestedKeyword(keyword);
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
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    iceCandidates = [];
    connectionEstablished = false;
    isWaitingForGuest = false;
    sessionToken = generateSessionToken();
    
    // 新しいセッションを開始
    await createPeerConnection();
    setupDataChannel();
    
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    
    // 新しいトークンでオファーを送信
    console.log('新しいオファーを送信中:', currentKeyword, 'トークン:', sessionToken);
    await sendSignal(currentKeyword, {
        type: 'offer',
        offer: offer,
        token: sessionToken
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
            // トークンベースのパスと旧形式の両方をチェック
            const answerPath = sessionToken ? 
                `${keyword}/${sessionToken}/answer` : 
                `${keyword}-answer`;
            
            const signal = await receiveSignal(answerPath);
            if (signal && signal.type === 'answer') {
                clearInterval(pollInterval);
                updateStatus('参加者からの応答を受信 - ICE候補を交換中...');
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
                updateStatus('オファー受信 - 応答を準備中...');
                
                // ホストからのトークンを保存
                if (signal.token) {
                    sessionToken = signal.token;
                    console.log('セッショントークン受信:', sessionToken);
                }
                
                await createPeerConnection();
                setupDataChannel();
                
                await peerConnection.setRemoteDescription(signal.offer);
                updateStatus('応答を作成中...');
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                
                // トークンを使用した安全なパスで応答
                const answerPath = sessionToken ? 
                    `${keyword}/${sessionToken}/answer` : 
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
    const keyword = elements.keyword.value;
    const targetKey = sessionToken ? 
        `${keyword}/${sessionToken}/ice-${isHost ? 'guest' : 'host'}` :
        `${keyword}-ice-${isHost ? 'guest' : 'host'}`;
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
                updateStatus('ICE候補を受信 - 接続を確立中...');
                for (const candidate of signal.candidates) {
                    console.log('ICE候補追加:', candidate.type);
                    try {
                        await peerConnection.addIceCandidate(candidate);
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
    
    // クリーンアップ完了後、接続をリセットするためページをリロード
    location.reload();
}

function cleanup() {
    stopAllPolling(); // 全ポーリング停止
    
    // 進行中のppng.io接続をキャンセル
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
        console.log('ppng.io接続をキャンセルしました');
    }
    
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
    sessionToken = null;
    clearKeywordTimer();
    clearReconnectInterval();
    
    toggleButtons(true);
}

function updateStatus(text) {
    elements.statusText.textContent = text;
}

async function getConnectionType() {
    if (!peerConnection) return null;
    
    try {
        const stats = await peerConnection.getStats();
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
    if (!peerConnection) return;
    
    const connectionState = peerConnection.connectionState;
    const iceConnectionState = peerConnection.iceConnectionState;
    const iceGatheringState = peerConnection.iceGatheringState;
    
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

// ページ読み込み時に実行
loadKeywordFromURL();
startAAConversion();