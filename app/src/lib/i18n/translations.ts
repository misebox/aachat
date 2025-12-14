export const translations = {
  en: {
    // App
    appTitle: 'AACHAT',

    // Common buttons
    cancel: 'Cancel',
    apply: 'Apply',
    refresh: 'Refresh',
    copy: 'Copy',
    copied: 'Copied',
    share: 'Share',
    enter: 'Enter',
    clear: 'Clear',
    connect: 'Connect',
    leave: 'Leave',
    join: 'Join',
    testDevice: 'Test Device',
    stopTest: 'Stop Test',

    // Video labels
    you: 'You',
    peer: 'Peer',

    // Placeholders
    keyword: 'keyword',

    // Dialog titles
    settings: 'Settings',
    help: 'Help',
    joinRoom: 'Join Room',

    // Settings dialog
    device: 'Device',
    video: 'Video',
    audio: 'Audio',
    quality: 'Quality',
    fps: 'FPS',
    ui: 'UI',
    language: 'Language',
    english: 'English',
    japanese: '日本語',

    // Join confirm dialog
    joinConfirmMessage: 'You are about to join a video chat room with keyword:',
    joinConfirmWarning: 'Anyone who accesses the same URL will be connected to you. Your camera and microphone will be activated.',

    // Share dialog
    enterKeywordFirst: 'Enter a keyword first',
    url: 'URL',

    // Help dialog
    about: 'About',
    aboutDescription: 'Real-time video chat app that converts video to ASCII art.',
    howToUse: 'How to Use',
    howToUse1: 'Enter a keyword and click Enter to join the room',
    howToUse2: 'Share the URL with your peer',
    howToUse3: 'Anyone with the same URL can join the call',
    howToUse4: 'Click Leave to end the call',
    shareDescription: 'Click the Share button to copy the current URL. Send it to your peer - they can join by opening the link directly.',
    deviceDescription: 'Switch camera and microphone',
    fpsDescription: 'Adjust display refresh rate (lower = less CPU)',
    notes: 'Notes',
    note1: 'Camera and microphone permission required',
    note2: 'Use a unique keyword to avoid conflicts',
    copyright: 'misebox 2025.',

    // Status messages
    connecting: 'Connecting...',
    connectionFailed: 'Connection failed',
    callEnded: 'Call ended',
    peerLeftReconnecting: 'Peer left. Reconnecting...',
    connectionFailedAfterRetries: 'Connection failed after {count} attempts',
    connected: 'Connected',
    connectedWith: 'Connected ({label})',
    peerDisconnectedReconnecting: 'Peer disconnected. Reconnecting...',
    startingCamera: 'Starting camera...',
    settingUpConnection: 'Setting up connection...',
    waitingForGuest: 'Waiting for guest... ({attempt}/{max})',
    receivingAnswer: 'Receiving answer...',
    connectingToHost: 'Connecting to host...',
    sendingAnswer: 'Sending answer...',
    reconnectionFailed: 'Reconnection failed',
    checkingRoom: 'Checking room...',

    // Error messages
    pleaseEnterKeyword: 'Please enter a keyword',
    onlyAllowedChars: 'Only [ A-Z a-z 0-9 _ - . ] allowed',

    // Homepage tagline
    tagline: [
      'Video chat in ASCII art.',
      'Real-time peer-to-peer connection.',
      'No registration, no tracking.',
      'Share a keyword to connect.',
      'Your face becomes text.',
    ].join('\n'),
  },

  ja: {
    // App
    appTitle: 'AACHAT',

    // Common buttons
    cancel: 'キャンセル',
    apply: '適用',
    refresh: 'リフレッシュ',
    copy: 'コピー',
    copied: 'コピー済',
    share: '共有',
    enter: '入室',
    clear: 'クリア',
    connect: '接続',
    leave: '退出',
    join: '参加',
    testDevice: 'デバイステスト',
    stopTest: 'テスト停止',

    // Video labels
    you: '自分',
    peer: '相手',

    // Placeholders
    keyword: 'キーワード',

    // Dialog titles
    settings: '設定',
    help: 'ヘルプ',
    joinRoom: 'ルームに参加',

    // Settings dialog
    device: 'デバイス',
    video: 'ビデオ',
    audio: 'オーディオ',
    quality: '品質',
    fps: 'FPS',
    ui: 'UI',
    language: '言語',
    english: 'English',
    japanese: '日本語',

    // Join confirm dialog
    joinConfirmMessage: '以下のキーワードでビデオチャットルームに参加します：',
    joinConfirmWarning: '同じURLにアクセスした人と接続されます。カメラとマイクが起動します。',

    // Share dialog
    enterKeywordFirst: '先にキーワードを入力してください',
    url: 'URL',

    // Help dialog
    about: 'アプリについて',
    aboutDescription: '映像をアスキーアートに変換するリアルタイムビデオチャットアプリです。',
    howToUse: '使い方',
    howToUse1: 'キーワードを入力して「入室」をクリック',
    howToUse2: 'URLを相手に共有',
    howToUse3: '同じURLにアクセスすると通話開始',
    howToUse4: '「退出」で通話終了',
    shareDescription: '「共有」ボタンでURLをコピーできます。相手にURLを送ると、直接参加できます。',
    deviceDescription: 'カメラとマイクを切り替え',
    fpsDescription: '表示更新頻度を調整（低いほどCPU負荷軽減）',
    notes: '注意事項',
    note1: 'カメラとマイクの許可が必要です',
    note2: '他の人と被らないキーワードを使用してください',
    copyright: 'misebox 2025.',

    // Status messages
    connecting: '接続中...',
    connectionFailed: '接続に失敗しました',
    callEnded: '通話終了',
    peerLeftReconnecting: '相手が退出しました。再接続中...',
    connectionFailedAfterRetries: '{count}回の試行後、接続に失敗しました',
    connected: '接続完了',
    connectedWith: '接続完了 ({label})',
    peerDisconnectedReconnecting: '相手が切断しました。再接続中...',
    startingCamera: 'カメラ起動中...',
    settingUpConnection: '接続を準備中...',
    waitingForGuest: '接続を待ち受け中... ({attempt}/{max})',
    receivingAnswer: '応答を受信中...',
    connectingToHost: 'ホストに接続中...',
    sendingAnswer: '応答を送信中...',
    reconnectionFailed: '再接続に失敗しました',
    checkingRoom: 'ルームを確認中...',

    // Error messages
    pleaseEnterKeyword: 'キーワードを入力してください',
    onlyAllowedChars: '使用可能: A-Z a-z 0-9 _ - .',

    // Homepage tagline
    tagline: [
      'アスキーアートでビデオチャット',
      'リアルタイムでP2P接続',
      '登録不要・トラッキング無し',
      'キーワードを共有するだけ',
      '顔がアスキーアートになる',
    ].join('\n'),
  },
} as const;

export type Language = keyof typeof translations;
export type TranslationKey = keyof typeof translations.en;
