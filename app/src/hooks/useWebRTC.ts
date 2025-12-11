import { createSignal, onCleanup } from 'solid-js';
import { STUN_SERVERS, ICE_GATHERING_TIMEOUT } from '@/lib/constants';
import { logger } from './useLogger';

export interface WebRTCCallbacks {
  onConnected?: () => void;
  onDisconnected?: () => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  onIceConnectionStateChange?: (state: RTCIceConnectionState) => void;
}

/**
 * Hook for WebRTC peer connection management
 */
export function useWebRTC(callbacks: WebRTCCallbacks = {}) {
  const [peerConnection, setPeerConnection] = createSignal<RTCPeerConnection | null>(null);
  const [dataChannel, setDataChannel] = createSignal<RTCDataChannel | null>(null);
  const [iceCandidates, setIceCandidates] = createSignal<RTCIceCandidate[]>([]);
  const [iceCandidatesSent, setIceCandidatesSent] = createSignal(false);

  let iceGatheringTimeout: number | null = null;

  onCleanup(() => {
    close();
  });

  /**
   * Create a new peer connection
   */
  async function createPeerConnection(localStream: MediaStream): Promise<RTCPeerConnection> {
    const pc = new RTCPeerConnection({
      iceServers: STUN_SERVERS,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });

    // Add local tracks
    localStream.getTracks().forEach((track) => {
      if (track.readyState === 'live') {
        pc.addTrack(track, localStream);
      }
    });
    logger.rtc('tracks added');

    // Set video encoding parameters
    setTimeout(async () => {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        const params = sender.getParameters();
        if (params.encodings && params.encodings.length > 0) {
          params.encodings[0].maxBitrate = 50000;
          params.encodings[0].maxFramerate = 60;
          await sender.setParameters(params);
        }
      }
    }, 1000);

    // Handle remote track
    pc.ontrack = (event) => {
      logger.rtc('remote track:', event.track.kind);
      if (event.streams[0]) {
        callbacks.onRemoteStream?.(event.streams[0]);
      }
    };

    // Collect ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        setIceCandidates((prev) => [...prev, event.candidate!]);
      } else {
        logger.ice('gathering complete, count:', iceCandidates().length);
      }
    };

    // Connection state handlers
    pc.onconnectionstatechange = () => {
      logger.rtc('state:', pc.connectionState);
      callbacks.onConnectionStateChange?.(pc.connectionState);

      if (pc.connectionState === 'connected') {
        callbacks.onConnected?.();
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        callbacks.onDisconnected?.();
      }
    };

    pc.oniceconnectionstatechange = () => {
      logger.ice('conn:', pc.iceConnectionState);
      callbacks.onIceConnectionStateChange?.(pc.iceConnectionState);
    };

    pc.onicegatheringstatechange = () => {
      logger.ice('gather:', pc.iceGatheringState);
    };

    setPeerConnection(pc);
    return pc;
  }

  /**
   * Wait for ICE candidates and return them
   */
  async function waitForIceCandidates(): Promise<RTCIceCandidate[]> {
    const waitStart = Date.now();

    while (iceCandidates().length === 0 && Date.now() - waitStart < ICE_GATHERING_TIMEOUT) {
      await new Promise((r) => setTimeout(r, 100));
    }

    return iceCandidates();
  }

  /**
   * Setup data channel
   */
  function setupDataChannel(isHost: boolean): void {
    const pc = peerConnection();
    if (!pc) return;

    if (isHost) {
      const dc = pc.createDataChannel('aa-data');
      setupDataChannelEvents(dc);
      setDataChannel(dc);
    } else {
      pc.ondatachannel = (event) => {
        setupDataChannelEvents(event.channel);
        setDataChannel(event.channel);
      };
    }
  }

  function setupDataChannelEvents(dc: RTCDataChannel): void {
    dc.onopen = () => {
      console.log('Data channel opened');
    };
    dc.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log('Data channel message:', message);
    };
    dc.onerror = (error) => {
      console.error('Data channel error:', error);
    };
  }

  /**
   * Create and return an offer
   */
  async function createOffer(): Promise<RTCSessionDescriptionInit> {
    const pc = peerConnection();
    if (!pc) throw new Error('PeerConnection not created');

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return offer;
  }

  /**
   * Create and return an answer
   */
  async function createAnswer(): Promise<RTCSessionDescriptionInit> {
    const pc = peerConnection();
    if (!pc) throw new Error('PeerConnection not created');

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }

  /**
   * Set remote description
   */
  async function setRemoteDescription(description: RTCSessionDescriptionInit): Promise<void> {
    const pc = peerConnection();
    if (!pc) return;
    await pc.setRemoteDescription(description);
  }

  /**
   * Add ICE candidate
   */
  async function addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    const pc = peerConnection();
    if (!pc) return;
    await pc.addIceCandidate(candidate);
  }

  /**
   * Add multiple ICE candidates
   */
  async function addIceCandidates(candidates: RTCIceCandidateInit[]): Promise<void> {
    for (const candidate of candidates) {
      await addIceCandidate(candidate);
    }
  }

  /**
   * Close connection and cleanup
   */
  function close(): void {
    if (iceGatheringTimeout !== null) {
      clearTimeout(iceGatheringTimeout);
      iceGatheringTimeout = null;
    }

    const dc = dataChannel();
    if (dc) {
      dc.close();
      setDataChannel(null);
    }

    const pc = peerConnection();
    if (pc) {
      pc.close();
      setPeerConnection(null);
    }

    setIceCandidates([]);
    setIceCandidatesSent(false);
  }

  return {
    peerConnection,
    dataChannel,
    iceCandidates,
    iceCandidatesSent,
    setIceCandidatesSent,
    createPeerConnection,
    waitForIceCandidates,
    setupDataChannel,
    createOffer,
    createAnswer,
    setRemoteDescription,
    addIceCandidate,
    addIceCandidates,
    close,
  };
}
