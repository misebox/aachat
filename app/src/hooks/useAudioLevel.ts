import { createSignal, createEffect, onCleanup, Accessor } from 'solid-js';

/**
 * Hook for analyzing audio level from a MediaStream
 * Returns a signal with the current audio level (0-100)
 */
export function useAudioLevel(streamAccessor: Accessor<MediaStream | null>) {
  const [audioLevel, setAudioLevel] = createSignal(0);
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  let animationId: number | null = null;

  const cleanup = () => {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    if (source) {
      source.disconnect();
      source = null;
    }
    if (analyser) {
      analyser.disconnect();
      analyser = null;
    }
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
      audioContext = null;
    }
    setAudioLevel(0);
  };

  createEffect(() => {
    const stream = streamAccessor();

    // Cleanup previous
    cleanup();

    if (!stream) return;

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    try {
      audioContext = new AudioContext();
      analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.3;

      source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyser) return;

        analyser.getByteFrequencyData(dataArray);

        // Calculate RMS (root mean square) for better level representation
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length);

        // Normalize to 0-100 range
        const level = Math.min(100, Math.round((rms / 128) * 100));
        setAudioLevel(level);

        animationId = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (error) {
      console.error('Audio level analysis error:', error);
    }
  });

  onCleanup(cleanup);

  return audioLevel;
}
