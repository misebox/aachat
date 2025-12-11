import { createSignal, onCleanup } from 'solid-js';
import {
  SessionState,
  TIMEOUT_OFFER_PUT,
  TIMEOUT_SIGNALING,
  KEYWORD_TIMER_MAX,
  RETRY_DELAY,
  CONNECT_MAX_RETRIES,
} from '@/lib/constants';
import { generateSessionToken } from '@/lib/utils';
import { useSignaling } from './useSignaling';
import { useSession } from './useSession';
import { useWebRTC } from './useWebRTC';
import { useMedia } from './useMedia';
import { useAscii } from './useAscii';
import { logger, setSessionInfoGetter } from './useLogger';

export interface ConnectionCallbacks {
  onStatusChange?: (status: string) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: string) => void;
  onTimerUpdate?: (remaining: string) => void;
  onConnectionTypeChange?: (type: string | null) => void;
}

/**
 * Hook for managing the complete connection flow
 */
export function useConnection(callbacks: ConnectionCallbacks = {}) {
  const signaling = useSignaling();
  const session = useSession();
  const media = useMedia();
  const ascii = useAscii();

  const [remoteStream, setRemoteStream] = createSignal<MediaStream | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = createSignal(0);
  const maxReconnectAttempts = 3;

  let keywordTimer: ReturnType<typeof setTimeout> | null = null;
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  onCleanup(() => {
    clearKeywordTimer();
  });

  const webrtc = useWebRTC({
    onConnected: async () => {
      clearKeywordTimer();
      setReconnectAttempts(0);
      session.setConnectionEstablished(true);
      session.setState(SessionState.CONNECTED);

      // Get connection type
      const connectionType = await webrtc.getConnectionType();
      callbacks.onConnectionTypeChange?.(connectionType);
      callbacks.onConnected?.();
      callbacks.onStatusChange?.(connectionType ? `Connected (${connectionType})` : 'Connected');
    },
    onDisconnected: () => {
      if (session.connectionEstablished()) {
        const keyword = session.currentKeyword();
        if (keyword) {
          callbacks.onStatusChange?.('Peer disconnected. Reconnecting...');
          reconnect(keyword);
          return;
        }
      }
      callbacks.onDisconnected?.();
    },
    onRemoteStream: (stream) => {
      setRemoteStream(stream);
    },
  });

  // Set logger session info getter
  setSessionInfoGetter(() => session.getSessionInfo());

  /**
   * Host session flow:
   * 1. Start camera
   * 2. Create PeerConnection
   * 3. Setup DataChannel
   * 4. Create Offer
   * 5. PUT offer (wait for guest up to 60s)
   * 6. GET answer
   * 7. Set remote description
   * 8. Exchange ICE candidates
   */
  async function hostSession(keyword: string): Promise<boolean> {
    logger.log('=== HOST SESSION START ===');
    callbacks.onStatusChange?.('Starting camera...');

    // 1. Start camera
    const cameraStarted = await media.startCamera();
    if (!cameraStarted) {
      callbacks.onError?.('Failed to start camera');
      return false;
    }
    logger.log('Camera started');

    // Initialize session (no hash, simple paths)
    session.startSession(true, keyword);
    signaling.setCancelKey(session.sessionToken() || generateSessionToken());

    // 3. Create PeerConnection
    callbacks.onStatusChange?.('Setting up connection...');
    const localStream = media.localStream();
    if (!localStream) {
      callbacks.onError?.('No local stream');
      cleanup();
      return false;
    }

    await webrtc.createPeerConnection(localStream);
    logger.rtc('PeerConnection created');

    // 4. Setup DataChannel
    webrtc.setupDataChannel(true);
    logger.rtc('DataChannel setup');

    // 5. Create Offer
    session.setState(SessionState.H_OFFER_PUT);
    callbacks.onStatusChange?.('Waiting for guest...');
    startKeywordTimer();

    const offer = await webrtc.createOffer();
    logger.sig('Offer created');

    // 6. PUT offer (wait up to 60s for guest)
    const offerPath = session.getChannelPath('offer');
    const putResult = await signaling.send(
      offerPath,
      { type: 'offer', sdp: offer.sdp },
      keyword,
      TIMEOUT_OFFER_PUT
    );

    if (!putResult.success) {
      if (putResult.timedOut) {
        callbacks.onError?.('No guest joined within timeout');
      } else {
        callbacks.onError?.('Failed to send offer');
      }
      cleanup();
      return false;
    }
    logger.sig('Offer consumed by guest');

    // Check if session was cancelled
    if (!session.sessionActive()) {
      logger.log('Session cancelled');
      return false;
    }

    // 7. GET answer
    session.setState(SessionState.H_ANSWER_GET);
    callbacks.onStatusChange?.('Receiving answer...');

    const answerPath = session.getChannelPath('answer');
    const answerData = await signaling.receive<{ type: string; sdp: string }>(
      answerPath,
      keyword,
      TIMEOUT_SIGNALING
    );

    if (!answerData) {
      callbacks.onError?.('Failed to receive answer');
      cleanup();
      return false;
    }
    logger.sig('Answer received');

    // Check if session was cancelled
    if (!session.sessionActive()) {
      return false;
    }

    // 8. Set remote description
    await webrtc.setRemoteDescription({ type: 'answer', sdp: answerData.sdp });
    logger.rtc('Remote description set');

    // 9. Exchange ICE candidates (parallel)
    const iceSuccess = await exchangeIceCandidates(keyword, true);
    if (!iceSuccess) {
      callbacks.onError?.('ICE exchange failed');
      cleanup();
      return false;
    }

    logger.log('=== HOST SESSION COMPLETE ===');
    return true;
  }

  /**
   * Guest session flow:
   * 1. Start camera
   * 2. GET offer
   * 3. Create PeerConnection
   * 4. Set remote description
   * 5. Setup DataChannel
   * 6. Create Answer
   * 7. PUT answer
   * 8. Exchange ICE candidates
   */
  async function guestSession(keyword: string): Promise<boolean> {
    logger.log('=== GUEST SESSION START ===');
    callbacks.onStatusChange?.('Starting camera...');

    // 1. Start camera
    const cameraStarted = await media.startCamera();
    if (!cameraStarted) {
      callbacks.onError?.('Failed to start camera');
      return false;
    }
    logger.log('Camera started');

    // Initialize session
    session.startSession(false, keyword);
    signaling.setCancelKey(session.sessionToken() || generateSessionToken());

    // 2. GET offer
    session.setState(SessionState.G_OFFER_GET);
    callbacks.onStatusChange?.('Connecting to host...');
    startKeywordTimer();

    const offerPath = session.getChannelPath('offer');
    const offerData = await signaling.receive<{ type: string; sdp: string }>(
      offerPath,
      keyword,
      TIMEOUT_SIGNALING
    );

    if (!offerData) {
      callbacks.onError?.('No host found or offer timed out');
      cleanup();
      return false;
    }
    logger.sig('Offer received');

    // Check if session was cancelled
    if (!session.sessionActive()) {
      return false;
    }

    // 4. Create PeerConnection
    callbacks.onStatusChange?.('Setting up connection...');
    const localStream = media.localStream();
    if (!localStream) {
      callbacks.onError?.('No local stream');
      cleanup();
      return false;
    }

    await webrtc.createPeerConnection(localStream);
    logger.rtc('PeerConnection created');

    // 5. Set remote description (offer)
    await webrtc.setRemoteDescription({ type: 'offer', sdp: offerData.sdp });
    logger.rtc('Remote description set');

    // 6. Setup DataChannel
    webrtc.setupDataChannel(false);
    logger.rtc('DataChannel setup');

    // 7. Create Answer
    session.setState(SessionState.G_ANSWER_PUT);
    callbacks.onStatusChange?.('Sending answer...');

    const answer = await webrtc.createAnswer();
    logger.sig('Answer created');

    // 8. PUT answer
    const answerPath = session.getChannelPath('answer');
    const putResult = await signaling.send(
      answerPath,
      { type: 'answer', sdp: answer.sdp },
      keyword,
      TIMEOUT_SIGNALING
    );

    if (!putResult.success) {
      callbacks.onError?.('Failed to send answer');
      cleanup();
      return false;
    }
    logger.sig('Answer sent');

    // Check if session was cancelled
    if (!session.sessionActive()) {
      return false;
    }

    // 9. Exchange ICE candidates (parallel)
    const iceSuccess = await exchangeIceCandidates(keyword, false);
    if (!iceSuccess) {
      callbacks.onError?.('ICE exchange failed');
      cleanup();
      return false;
    }

    logger.log('=== GUEST SESSION COMPLETE ===');
    return true;
  }

  /**
   * Exchange ICE candidates (runs in parallel: PUT own, GET peer's)
   */
  async function exchangeIceCandidates(keyword: string, isHost: boolean): Promise<boolean> {
    const role = isHost ? 'host' : 'guest';
    const peerRole = isHost ? 'guest' : 'host';

    session.setState(isHost ? SessionState.H_ICE_SEND : SessionState.G_ICE_SEND);

    // Wait for local ICE candidates to be gathered
    const candidates = await webrtc.waitForIceCandidates();
    if (candidates.length === 0) {
      logger.ice('No candidates gathered');
      return false;
    }
    logger.ice(`Gathered ${candidates.length} candidates`);

    // PUT own ICE candidates and GET peer's ICE candidates in parallel
    const ownIcePath = session.getChannelPath(`ice-${role}`);
    const peerIcePath = session.getChannelPath(`ice-${peerRole}`);

    const [putResult, peerCandidates] = await Promise.all([
      signaling.send(
        ownIcePath,
        { type: 'ice-batch', candidates, isHost },
        keyword,
        TIMEOUT_SIGNALING
      ),
      signaling.receive<{ type: string; candidates: RTCIceCandidateInit[]; isHost: boolean }>(
        peerIcePath,
        keyword,
        TIMEOUT_SIGNALING
      ),
    ]);

    if (!putResult.success) {
      logger.ice('Failed to send ICE candidates');
      return false;
    }
    logger.ice('ICE candidates sent');

    if (!peerCandidates || !peerCandidates.candidates) {
      logger.ice('Failed to receive peer ICE candidates');
      return false;
    }
    logger.ice(`Received ${peerCandidates.candidates.length} peer candidates`);

    // Add peer's ICE candidates
    await webrtc.addIceCandidates(peerCandidates.candidates);
    logger.ice('Peer ICE candidates added');

    return true;
  }

  /**
   * Start keyword timer (10 min timeout)
   */
  function startKeywordTimer(): void {
    updateTimer();
    timerInterval = setInterval(() => {
      updateTimer();
    }, 1000);

    keywordTimer = setTimeout(() => {
      if (!session.connectionEstablished()) {
        logger.sig('keyword timer expired');
        cleanup();
        callbacks.onError?.('Connection timeout');
        callbacks.onTimerUpdate?.('');
      }
    }, KEYWORD_TIMER_MAX);
  }

  /**
   * Clear keyword timer
   */
  function clearKeywordTimer(): void {
    if (keywordTimer) {
      clearTimeout(keywordTimer);
      keywordTimer = null;
    }
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    callbacks.onTimerUpdate?.('');
  }

  /**
   * Update timer display
   */
  function updateTimer(): void {
    const remaining = session.getRemainingTime(KEYWORD_TIMER_MAX / 1000);
    if (!session.connectionEstablished() && remaining > 0) {
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      const timerText = `${minutes}:${String(seconds).padStart(2, '0')}`;
      callbacks.onTimerUpdate?.(timerText);
    }
  }

  /**
   * Reconnect to session
   */
  async function reconnect(keyword: string): Promise<void> {
    logger.sig('reconnect:', keyword);

    const attempts = reconnectAttempts() + 1;
    setReconnectAttempts(attempts);

    if (attempts > maxReconnectAttempts) {
      logger.sig('max reconnect attempts reached');
      cleanup();
      callbacks.onError?.('Reconnection failed');
      callbacks.onDisconnected?.();
      return;
    }

    // Close existing connection
    webrtc.close();
    session.reset();
    signaling.abort();

    try {
      session.setState(SessionState.HEAD_CHECK);
      const offerPath = `${keyword}/offer`;
      const exists = await signaling.exists(offerPath);
      logger.sig('reconnect HEAD:', exists ? '200 → guest' : '404 → host');

      if (exists) {
        await guestSession(keyword);
      } else {
        await hostSession(keyword);
      }
    } catch (error) {
      logger.error('SIG', 'reconnect error:', error);
      callbacks.onStatusChange?.('Reconnection failed');
      setTimeout(() => reconnect(keyword), RETRY_DELAY);
    }
  }

  /**
   * Main connect function - determines role and starts appropriate session
   */
  async function connect(keyword: string, retryCount = 0): Promise<boolean> {
    if (!keyword.trim()) {
      callbacks.onError?.('Please enter a keyword');
      return false;
    }

    logger.log('Connect requested with keyword:', keyword);

    // HEAD check to determine role (no hash, just keyword/offer)
    session.setState(SessionState.HEAD_CHECK);
    callbacks.onStatusChange?.('Checking room...');

    try {
      const offerPath = `${keyword}/offer`;
      const exists = await signaling.exists(offerPath);

      if (exists) {
        // Offer exists = join as guest
        logger.log('Offer found, joining as guest');
        return await guestSession(keyword);
      } else {
        // No offer = become host
        logger.log('No offer found, becoming host');
        return await hostSession(keyword);
      }
    } catch (error) {
      logger.error('SIG', 'connect error:', error);
      cleanup();

      if (retryCount < CONNECT_MAX_RETRIES) {
        logger.sig('retry:', retryCount + 1);
        await new Promise((r) => setTimeout(r, RETRY_DELAY));
        return connect(keyword, retryCount + 1);
      } else {
        callbacks.onError?.('Connection failed');
        return false;
      }
    }
  }

  /**
   * Cleanup all resources
   */
  function cleanup(): void {
    logger.log('Cleanup');
    clearKeywordTimer();
    signaling.abort();
    webrtc.close();
    media.stopCamera();
    ascii.stopConversion();
    session.reset();
    setRemoteStream(null);
    setReconnectAttempts(0);
  }

  /**
   * Leave/disconnect
   */
  function disconnect(): void {
    logger.log('Disconnect requested');
    session.endSession();
    cleanup();
    callbacks.onStatusChange?.('Disconnected');
  }

  return {
    // Session state
    session,
    media,
    ascii,
    webrtc,
    remoteStream,

    // Actions
    connect,
    hostSession,
    guestSession,
    disconnect,
    cleanup,
  };
}
