import { createSignal } from 'solid-js';
import { SessionState, type SessionStateType } from '@/lib/constants';
import { generateSessionToken } from '@/lib/utils';

/**
 * Hook for session state management
 */
export function useSession() {
  const [state, setState] = createSignal<SessionStateType>(SessionState.IDLE);
  const [isHost, setIsHost] = createSignal(false);
  const [sessionToken, setSessionToken] = createSignal<string | null>(null);
  const [sessionHash, setSessionHash] = createSignal<string | null>(null);
  const [currentKeyword, setCurrentKeyword] = createSignal<string | null>(null);
  const [sessionActive, setSessionActive] = createSignal(false);
  const [startTime, setStartTime] = createSignal<number | null>(null);
  const [connectionEstablished, setConnectionEstablished] = createSignal(false);

  /**
   * Reset session to initial state
   */
  function reset(): void {
    setState(SessionState.IDLE);
    setIsHost(false);
    setSessionToken(null);
    setSessionHash(null);
    setCurrentKeyword(null);
    setSessionActive(false);
    setStartTime(null);
    setConnectionEstablished(false);
  }

  /**
   * Start a new session
   */
  function startSession(host: boolean, keyword: string): void {
    setIsHost(host);
    setCurrentKeyword(keyword);
    setSessionActive(true);
    setStartTime(Date.now());
    setSessionToken(generateSessionToken());
  }

  /**
   * Get channel path for signaling (simple: keyword/suffix)
   */
  function getChannelPath(suffix: string): string {
    const keyword = currentKeyword();
    if (!keyword) {
      throw new Error('Session not started');
    }
    return `${keyword}/${suffix}`;
  }

  /**
   * End current session
   */
  function endSession(): void {
    setSessionActive(false);
    setConnectionEstablished(false);
    setSessionHash(null);
  }

  /**
   * Get session duration in seconds
   */
  function getSessionDuration(): number {
    const start = startTime();
    if (!start) return 0;
    return Math.floor((Date.now() - start) / 1000);
  }

  /**
   * Check if session is expired
   */
  function isSessionExpired(maxDuration = 600): boolean {
    return getSessionDuration() >= maxDuration;
  }

  /**
   * Get remaining time in seconds
   */
  function getRemainingTime(maxDuration = 600): number {
    const elapsed = getSessionDuration();
    return Math.max(0, maxDuration - elapsed);
  }

  /**
   * Get session info for logger
   */
  function getSessionInfo() {
    return {
      isHost: isHost(),
      state: state(),
    };
  }

  return {
    state,
    setState,
    isHost,
    setIsHost,
    sessionToken,
    sessionHash,
    currentKeyword,
    sessionActive,
    setSessionActive,
    connectionEstablished,
    setConnectionEstablished,
    reset,
    startSession,
    getChannelPath,
    endSession,
    getSessionDuration,
    isSessionExpired,
    getRemainingTime,
    getSessionInfo,
  };
}
