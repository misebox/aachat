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
   * Enumerate available media devices (requests permission if needed)
   */
  async function getAvailableDevices(): Promise<void> {
    try {
      // First check if we have permission by enumerating
      let devices = await navigator.mediaDevices.enumerateDevices();

      // If deviceId is empty, we need to request permission
      const hasPermission = devices.some((d) => d.deviceId !== '');

      if (!hasPermission) {
        // Request permission with temporary stream
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        // Stop tracks immediately - we just needed permission
        tempStream.getTracks().forEach((track) => track.stop());
        // Re-enumerate with permission
        devices = await navigator.mediaDevices.enumerateDevices();
      }

      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      const audioInputs = devices.filter((d) => d.kind === 'audioinput');

      setVideoDevices(
        videoInputs.map((d, i) => ({
          deviceId: d.deviceId || `__video_${i}__`,
          label: d.label || `Camera ${i + 1}`,
        }))
      );

      setAudioDevices(
        audioInputs.map((d, i) => ({
          deviceId: d.deviceId || `__audio_${i}__`,
          label: d.label || `Mic ${i + 1}`,
        }))
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

  interface StartCameraOptions {
    videoDeviceId?: string;
    audioDeviceId?: string;
    videoEnabled?: boolean;
    audioEnabled?: boolean;
  }

  /**
   * Start camera with resolution fallback
   */
  async function startCamera(options: StartCameraOptions = {}): Promise<boolean> {
    const { videoDeviceId, audioDeviceId, videoEnabled = true, audioEnabled = true } = options;
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

      // Update selected device IDs from actual tracks
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      // Apply enabled state immediately on the tracks
      if (videoTrack) {
        videoTrack.enabled = videoEnabled;
        const settings = videoTrack.getSettings();
        if (settings.deviceId) setSelectedVideoId(settings.deviceId);
      }
      if (audioTrack) {
        audioTrack.enabled = audioEnabled;
        const settings = audioTrack.getSettings();
        if (settings.deviceId) setSelectedAudioId(settings.deviceId);
      }

      setLocalStream(stream);

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
   * Toggle video track enabled state
   */
  function setVideoEnabled(enabled: boolean): void {
    const stream = localStream();
    if (stream) {
      stream.getVideoTracks().forEach((track) => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Toggle audio track enabled state
   */
  function setAudioEnabled(enabled: boolean): void {
    const stream = localStream();
    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = enabled;
      });
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

    // Create new MediaStream to trigger signal update (for audio level indicator)
    const updatedStream = new MediaStream(stream.getTracks());
    setLocalStream(updatedStream);

    // Update selected device ID
    if (kind === 'video') {
      setSelectedVideoId(deviceId);
    } else {
      setSelectedAudioId(deviceId);
    }

    // Clean up unused tracks
    newStream.getTracks().forEach((track) => {
      if (!updatedStream.getTracks().includes(track)) {
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
    setVideoEnabled,
    setAudioEnabled,
  };
}
