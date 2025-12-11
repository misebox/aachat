import { Config } from './constants.js';

// SignalingManager - piping server を使ったシグナリング
export class SignalingManager {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.activeControllers = new Set();
    this.cancelKey = null; // セッション固有のキャンセルキー
  }

  // セッションのキャンセルキーを設定
  setCancelKey(key) {
    this.cancelKey = key;
  }

  // キャンセルキーをクリア
  clearCancelKey() {
    this.cancelKey = null;
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

  // 送信 (PUT) - 独立したAbortControllerを使用
  async send(path, data, key, timeout = Config.TIMEOUT_SIGNALING) {
    const controller = new AbortController();
    this.activeControllers.add(controller);

    const json = JSON.stringify(data);
    const body = this._encrypt(json, key);

    const headers = {
      'Content-Type': 'text/plain',
      'X-Timeout': String(timeout)
    };
    if (this.cancelKey) {
      headers['X-Cancel-Key'] = this.cancelKey;
    }

    console.log('[SignalingManager] PUT 開始:', path);
    try {
      const response = await fetch(`${this.baseUrl}/${path}`, {
        method: 'PUT',
        headers,
        body: body,
        signal: controller.signal
      });

      this.activeControllers.delete(controller);

      if (!response.ok) {
        console.error('[SignalingManager] PUT エラー:', path, response.status);
        const error = new Error(`send failed: ${response.status}`);
        error.status = response.status;
        throw error;
      }

      const text = await response.text();
      const success = text.includes('[OK]');
      const timedOut = text.includes('[TIMEOUT]');
      if (success) {
        console.log('[SignalingManager] PUT 成功:', path);
      } else if (timedOut) {
        console.log('[SignalingManager] PUT タイムアウト:', path);
      } else {
        console.log('[SignalingManager] PUT 応答:', path, text);
      }
      return { success, timedOut };
    } catch (error) {
      this.activeControllers.delete(controller);
      throw error;
    }
  }

  // 受信 (GET) - 独立したAbortControllerを使用
  async receive(path, key, timeout = Config.TIMEOUT_SIGNALING) {
    const controller = new AbortController();
    this.activeControllers.add(controller);

    const headers = {
      'X-Timeout': String(timeout)
    };
    if (this.cancelKey) {
      headers['X-Cancel-Key'] = this.cancelKey;
    }

    console.log('[SignalingManager] GET 開始:', path);
    try {
      const response = await fetch(`${this.baseUrl}/${path}`, {
        method: 'GET',
        headers,
        signal: controller.signal
      });

      this.activeControllers.delete(controller);

      if (!response.ok) {
        console.log('[SignalingManager] GET エラー:', path, response.status);
        return null;
      }

      const text = await response.text();
      console.log('[SignalingManager] GET 完了:', path, 'レスポンス長:', text.length);

      // 空レスポンスまたはタイムアウト
      if (!text || text.length === 0 || text.includes('[TIMEOUT]')) {
        console.log('[SignalingManager] GET 空/タイムアウト:', path);
        return null;
      }

      try {
        const decrypted = this._decrypt(text, key);
        return JSON.parse(decrypted);
      } catch (e) {
        console.error('[SignalingManager] parse error:', path, e);
        return null;
      }
    } catch (error) {
      this.activeControllers.delete(controller);
      if (error.name === 'AbortError') {
        console.log('[SignalingManager] GET キャンセル:', path);
        return null;
      }
      throw error;
    }
  }

  // ローカルのリクエストをキャンセル
  abort() {
    for (const controller of this.activeControllers) {
      controller.abort();
    }
    this.activeControllers.clear();
  }

  // サーバー上の待機中リクエストをキャンセル（X-Cancel-Key で登録されたもの）
  async cancelOnServer(path) {
    if (!this.cancelKey) return;
    try {
      await fetch(`${this.baseUrl}/${path}`, {
        method: 'DELETE',
        headers: {
          'X-Cancel-Key': this.cancelKey
        }
      });
      console.log('[SignalingManager] DELETE Piping Channel:', path);
    } catch (error) {
      // ignore
    }
  }
}
