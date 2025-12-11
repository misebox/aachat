import { createSignal } from 'solid-js';
import { SessionState, TIMEOUT_OFFER_PUT, TIMEOUT_SIGNALING } from '@/lib/constants';
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

  const webrtc = useWebRTC({
    onConnected: () => {
      session.setConnectionEstablished(true);
      session.setState(SessionState.CONNECTED);
      callbacks.onConnected?.();
      callbacks.onStatusChange?.('Connected');
    },
    onDisconnected: () => {
      if (session.connectionEstablished()) {
        callbacks.onStatusChange?.('Peer disconnected. Reconnecting...');
        // Could implement reconnect logic here
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
   * Main connect function - determines role and starts appropriate session
   */
  async function connect(keyword: string): Promise<boolean> {
    if (!keyword.trim()) {
      callbacks.onError?.('Please enter a keyword');
      return false;
    }

    logger.log('Connect requested with keyword:', keyword);

    // HEAD check to determine role (no hash, just keyword/offer)
    session.setState(SessionState.HEAD_CHECK);
    callbacks.onStatusChange?.('Checking room...');

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
  }

  /**
   * Cleanup all resources
   */
  function cleanup(): void {
    logger.log('Cleanup');
    signaling.abort();
    webrtc.close();
    media.stopCamera();
    ascii.stopConversion();
    session.reset();
    setRemoteStream(null);
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
