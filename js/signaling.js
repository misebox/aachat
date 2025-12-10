// SignalingManager - piping server を使ったシグナリング
class SignalingManager {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.abortController = null;
  }

  // XOR暗号化 (UTF-8対応)
  _encrypt(text, key) {
    if (!key) return text;
    const encoder = new TextEncoder();
    const textBytes = encoder.encode(text);
    const keyBytes = encoder.encode(key);
    const encrypted = new Uint8Array(textBytes.length);
    for (let i = 0; i < textBytes.length; i++) {
      encrypted[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
    }
    let binary = '';
    for (let i = 0; i < encrypted.length; i++) {
      binary += String.fromCharCode(encrypted[i]);
    }
    return btoa(binary);
  }

  // XOR復号化 (UTF-8対応)
  _decrypt(encryptedBase64, key) {
    if (!key) return encryptedBase64;
    const binary = atob(encryptedBase64);
    const encrypted = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      encrypted[i] = binary.charCodeAt(i);
    }
    const keyBytes = new TextEncoder().encode(key);
    const decrypted = new Uint8Array(encrypted.length);
    for (let i = 0; i < encrypted.length; i++) {
      decrypted[i] = encrypted[i] ^ keyBytes[i % keyBytes.length];
    }
    return new TextDecoder().decode(decrypted);
  }

  // 存在チェック (HEAD)
  async exists(path) {
    try {
      const response = await fetch(`${this.baseUrl}/${path}`, {
        method: 'HEAD'
      });
      return response.ok && response.status === 200;
    } catch (error) {
      console.error('exists error:', error);
      return false;
    }
  }

  // 送信 (PUT) - 受信者が来るまで待つ
  async send(path, data, key, timeout = 600) {
    this.abortController = new AbortController();

    const json = JSON.stringify(data);
    const body = this._encrypt(json, key);

    console.log('[SignalingManager] PUT 開始:', path);
    const response = await fetch(`${this.baseUrl}/${path}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'text/plain',
        'X-Timeout': String(timeout)
      },
      body: body,
      signal: this.abortController.signal
    });

    if (!response.ok) {
      console.error('[SignalingManager] PUT エラー:', path, response.status);
      const error = new Error(`send failed: ${response.status}`);
      error.status = response.status;
      throw error;
    }

    const text = await response.text();
    const timedOut = text.includes('Timeout');
    console.log('[SignalingManager] PUT 完了:', path, 'タイムアウト:', timedOut, 'レスポンス:', text.substring(0, 100));
    return { success: !timedOut, timedOut };
  }

  // 受信 (GET) - 送信者が来るまで待つ
  async receive(path, key, timeout = 600) {
    this.abortController = new AbortController();

    console.log('[SignalingManager] GET 開始:', path);
    const response = await fetch(`${this.baseUrl}/${path}`, {
      method: 'GET',
      headers: {
        'X-Timeout': String(timeout)
      },
      signal: this.abortController.signal
    });

    if (!response.ok) {
      console.log('[SignalingManager] GET エラー:', path, response.status);
      return null;
    }

    const text = await response.text();
    console.log('[SignalingManager] GET 完了:', path, 'レスポンス長:', text.length);
    if (text.includes('Timeout')) {
      console.log('[SignalingManager] GET タイムアウト:', path);
      return null;
    }

    try {
      const decrypted = this._decrypt(text, key);
      return JSON.parse(decrypted);
    } catch (e) {
      console.error('[SignalingManager] parse error:', path, e);
      return null;
    }
  }

  // キャンセル
  abort() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}
