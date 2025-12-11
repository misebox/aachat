import { createSignal, onCleanup } from 'solid-js';
import type { MediaDevice } from '@/types';

export interface MediaConstraints {
  video: MediaTrackConstraints | boolean;
  audio: MediaTrackConstraints | boolean;
}

/**
 * Hook for managing media devices and streams
 */
export function useMedia() {
  const [localStream, setLocalStream] = createSignal<MediaStream | null>(null);
  const [videoDevices, setVideoDevices] = createSignal<MediaDevice[]>([]);
  const [audioDevices, setAudioDevices] = createSignal<MediaDevice[]>([]);
  const [selectedVideoId, setSelectedVideoId] = createSignal<string>('');
  const [selectedAudioId, setSelectedAudioId] = createSignal<string>('');

  onCleanup(() => {
    stopCamera();
  });

  /**
   * Enumerate available media devices
   */
  async function getAvailableDevices(): Promise<void> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      setVideoDevices(
        devices
          .filter((d) => d.kind === 'videoinput')
          .map((d) => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 4)}` }))
      );

      setAudioDevices(
        devices
          .filter((d) => d.kind === 'audioinput')
          .map((d) => ({ deviceId: d.deviceId, label: d.label || `Mic ${d.deviceId.slice(0, 4)}` }))
      );
    } catch (error) {
      console.error('Device enumeration error:', error);
    }
  }

  /**
   * Get video constraints with resolution fallbacks
   */
  function getVideoConstraints(deviceId?: string): MediaTrackConstraints {
    const base: MediaTrackConstraints = {
      frameRate: { ideal: 60, min: 30 },
      facingMode: 'user',
    };

    if (deviceId) {
      return { ...base, deviceId: { exact: deviceId }, facingMode: undefined };
    }

    return base;
  }

  /**
   * Start camera with resolution fallback
   */
  async function startCamera(videoDeviceId?: string, audioDeviceId?: string): Promise<boolean> {
    try {
      const resolutions = [
        { width: 80, height: 60 },
        { width: 160, height: 120 },
        { width: 320, height: 240 },
      ];

      let stream: MediaStream | null = null;

      for (const res of resolutions) {
        try {
          const constraints: MediaConstraints = {
            video: {
              ...getVideoConstraints(videoDeviceId),
              width: { exact: res.width },
              height: { exact: res.height },
            },
            audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
          };

          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch {
          continue;
        }
      }

      if (!stream) {
        throw new Error('Failed to get media stream');
      }

      setLocalStream(stream);

      // Update selected device IDs from actual tracks
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      if (videoTrack) {
        const settings = videoTrack.getSettings();
        if (settings.deviceId) setSelectedVideoId(settings.deviceId);
      }
      if (audioTrack) {
        const settings = audioTrack.getSettings();
        if (settings.deviceId) setSelectedAudioId(settings.deviceId);
      }

      console.log('Camera started:', videoTrack?.label || '-', '/', audioTrack?.label || '-');
      return true;
    } catch (error) {
      console.error('Camera start error:', error);
      return false;
    }
  }

  /**
   * Stop camera and release stream
   */
  function stopCamera(): void {
    const stream = localStream();
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
  }

  /**
   * Switch device during active call
   */
  async function switchDevice(
    kind: 'video' | 'audio',
    deviceId: string,
    peerConnection?: RTCPeerConnection
  ): Promise<void> {
    const stream = localStream();
    if (!stream) return;

    const constraints: MediaConstraints =
      kind === 'video'
        ? {
            video: { ...getVideoConstraints(deviceId), width: { exact: 80 }, height: { exact: 60 } },
            audio: false,
          }
        : {
            video: false,
            audio: { deviceId: { exact: deviceId } },
          };

    const newStream = await navigator.mediaDevices.getUserMedia(constraints);
    const newTrack = newStream.getTracks()[0];

    // Replace track in peer connection
    if (peerConnection) {
      const sender = peerConnection.getSenders().find((s) => s.track?.kind === kind);
      if (sender && newTrack) {
        await sender.replaceTrack(newTrack);
      }
    }

    // Update local stream
    const oldTrack = stream.getTracks().find((t) => t.kind === kind);
    if (oldTrack) {
      oldTrack.stop();
      stream.removeTrack(oldTrack);
    }
    stream.addTrack(newTrack);

    // Update selected device ID
    if (kind === 'video') {
      setSelectedVideoId(deviceId);
    } else {
      setSelectedAudioId(deviceId);
    }

    // Clean up unused tracks
    newStream.getTracks().forEach((track) => {
      if (!stream.getTracks().includes(track)) {
        track.stop();
      }
    });

    console.log(`Device switched: ${kind}`);
  }

  return {
    localStream,
    videoDevices,
    audioDevices,
    selectedVideoId,
    selectedAudioId,
    setSelectedVideoId,
    setSelectedAudioId,
    getAvailableDevices,
    startCamera,
    stopCamera,
    switchDevice,
  };
}
