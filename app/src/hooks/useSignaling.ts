import { createSignal, onCleanup } from 'solid-js';
import { xorEncrypt, xorDecrypt } from '@/lib/crypto';
import { PPNG_SERVER, TIMEOUT_SIGNALING } from '@/lib/constants';

export interface SendResult {
  success: boolean;
  timedOut: boolean;
}

/**
 * Hook for Piping Server signaling operations
 */
export function useSignaling(baseUrl: string = PPNG_SERVER) {
  const [cancelKey, setCancelKey] = createSignal<string | null>(null);
  const activeControllers = new Set<AbortController>();

  onCleanup(() => {
    abort();
  });

  /**
   * Check if a channel exists (HEAD request)
   */
  async function exists(path: string): Promise<boolean> {
    try {
      const response = await fetch(`${baseUrl}/${path}`, {
        method: 'HEAD',
      });
      return response.ok && response.status === 200;
    } catch (error) {
      console.error('exists error:', error);
      return false;
    }
  }

  /**
   * Send data to a channel (PUT request)
   */
  async function send(
    path: string,
    data: unknown,
    key: string,
    timeout: number = TIMEOUT_SIGNALING
  ): Promise<SendResult> {
    const controller = new AbortController();
    activeControllers.add(controller);

    const json = JSON.stringify(data);
    const body = xorEncrypt(json, key);

    const headers: HeadersInit = {
      'Content-Type': 'text/plain',
      'X-Timeout': String(timeout),
    };

    const currentCancelKey = cancelKey();
    if (currentCancelKey) {
      headers['X-Cancel-Key'] = currentCancelKey;
    }

    console.log('[Signaling] PUT start:', path);

    try {
      const response = await fetch(`${baseUrl}/${path}`, {
        method: 'PUT',
        headers,
        body,
        signal: controller.signal,
      });

      activeControllers.delete(controller);

      if (!response.ok) {
        console.error('[Signaling] PUT error:', path, response.status);
        const error = new Error(`send failed: ${response.status}`) as Error & { status: number };
        error.status = response.status;
        throw error;
      }

      const text = await response.text();
      const success = text.includes('[OK]');
      const timedOut = text.includes('[TIMEOUT]');

      if (success) {
        console.log('[Signaling] PUT success:', path);
      } else if (timedOut) {
        console.log('[Signaling] PUT timeout:', path);
      } else {
        console.log('[Signaling] PUT response:', path, text);
      }

      return { success, timedOut };
    } catch (error) {
      activeControllers.delete(controller);
      throw error;
    }
  }

  /**
   * Receive data from a channel (GET request)
   */
  async function receive<T>(
    path: string,
    key: string,
    timeout: number = TIMEOUT_SIGNALING
  ): Promise<T | null> {
    const controller = new AbortController();
    activeControllers.add(controller);

    const headers: HeadersInit = {
      'X-Timeout': String(timeout),
    };

    const currentCancelKey = cancelKey();
    if (currentCancelKey) {
      headers['X-Cancel-Key'] = currentCancelKey;
    }

    console.log('[Signaling] GET start:', path);

    try {
      const response = await fetch(`${baseUrl}/${path}`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      activeControllers.delete(controller);

      if (!response.ok) {
        console.log('[Signaling] GET error:', path, response.status);
        return null;
      }

      const text = await response.text();
      console.log('[Signaling] GET complete:', path, 'length:', text.length);

      // Empty response or timeout
      if (!text || text.length === 0 || text.includes('[TIMEOUT]')) {
        console.log('[Signaling] GET empty/timeout:', path);
        return null;
      }

      try {
        const decrypted = xorDecrypt(text, key);
        return JSON.parse(decrypted) as T;
      } catch (e) {
        console.error('[Signaling] parse error:', path, e);
        return null;
      }
    } catch (error) {
      activeControllers.delete(controller);
      if ((error as Error).name === 'AbortError') {
        console.log('[Signaling] GET cancelled:', path);
        return null;
      }
      throw error;
    }
  }

  /**
   * Abort all active requests
   */
  function abort() {
    for (const controller of activeControllers) {
      controller.abort();
    }
    activeControllers.clear();
  }

  /**
   * Cancel server-side waiting request
   */
  async function cancelOnServer(path: string): Promise<void> {
    const currentCancelKey = cancelKey();
    if (!currentCancelKey) return;

    try {
      await fetch(`${baseUrl}/${path}`, {
        method: 'DELETE',
        headers: {
          'X-Cancel-Key': currentCancelKey,
        },
      });
      console.log('[Signaling] DELETE channel:', path);
    } catch {
      // ignore
    }
  }

  return {
    exists,
    send,
    receive,
    abort,
    cancelOnServer,
    setCancelKey,
    clearCancelKey: () => setCancelKey(null),
  };
}
