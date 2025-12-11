import { createSignal, onCleanup } from 'solid-js';
import { ASCII_CHARS, CHAR_COUNT, AA_WIDTH, AA_HEIGHT } from '@/lib/constants';

/**
 * Hook for video to ASCII art conversion
 */
export function useAscii() {
  const [localAscii, setLocalAscii] = createSignal('');
  const [remoteAscii, setRemoteAscii] = createSignal('');
  const [dynamicRangeEnabled, setDynamicRangeEnabled] = createSignal(true);

  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let contrastTimer: number | null = null;
  let conversionTimer: number | null = null;

  // Dynamic range for contrast adjustment
  let minBrightness = 0;
  let maxBrightness = 255;
  let lastRemoteVideoLogTime = 0;

  onCleanup(() => {
    stopConversion();
  });

  /**
   * Initialize canvas for conversion
   */
  function initCanvas(canvasElement: HTMLCanvasElement): void {
    canvas = canvasElement;
    ctx = canvas.getContext('2d', { willReadFrequently: true });
  }

  /**
   * Convert video frame to ASCII art
   */
  function videoToAscii(video: HTMLVideoElement): string {
    if (!canvas || !ctx || !video.videoWidth || !video.videoHeight) {
      return '';
    }

    canvas.width = AA_WIDTH;
    canvas.height = AA_HEIGHT;

    ctx.drawImage(video, 0, 0, AA_WIDTH, AA_HEIGHT);
    const imageData = ctx.getImageData(0, 0, AA_WIDTH, AA_HEIGHT);
    const pixels = imageData.data;

    let ascii = '';

    for (let y = 0; y < AA_HEIGHT; y++) {
      for (let x = 0; x < AA_WIDTH; x++) {
        const i = (y * AA_WIDTH + x) * 4;
        let brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;

        // Apply dynamic range normalization if enabled
        if (dynamicRangeEnabled() && maxBrightness > minBrightness) {
          brightness = (brightness - minBrightness) / (maxBrightness - minBrightness);
          brightness = Math.max(0, Math.min(1, brightness));
          const charIndex = Math.floor(brightness * (CHAR_COUNT - 1));
          ascii += ASCII_CHARS[charIndex];
        } else {
          const charIndex = Math.floor((brightness / 255) * (CHAR_COUNT - 1));
          ascii += ASCII_CHARS[charIndex];
        }
      }
      ascii += '\n';
    }

    return ascii;
  }

  /**
   * Analyze video for contrast adjustment
   */
  function analyzeContrast(video: HTMLVideoElement): void {
    if (!canvas || !ctx || !video.videoWidth || !video.videoHeight) {
      return;
    }

    const sampleWidth = 64;
    const sampleHeight = 64;
    canvas.width = sampleWidth;
    canvas.height = sampleHeight;

    ctx.drawImage(video, 0, 0, sampleWidth, sampleHeight);
    const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const pixels = imageData.data;

    let min = 255;
    let max = 0;
    let sum = 0;
    const brightnessValues: number[] = [];

    for (let i = 0; i < pixels.length; i += 4) {
      const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      brightnessValues.push(brightness);
      min = Math.min(min, brightness);
      max = Math.max(max, brightness);
      sum += brightness;
    }

    const count = brightnessValues.length;
    const mean = sum / count;

    // Calculate standard deviation
    let variance = 0;
    for (const brightness of brightnessValues) {
      variance += Math.pow(brightness - mean, 2);
    }
    variance /= count;
    const stdDev = Math.sqrt(variance);

    // Calculate percentiles
    brightnessValues.sort((a, b) => a - b);
    const percentile5 = brightnessValues[Math.floor(count * 0.05)];
    const percentile95 = brightnessValues[Math.floor(count * 0.95)];

    // Adjust range based on image characteristics
    if (stdDev < 20) {
      // Low contrast image
      minBrightness = Math.max(0, mean - stdDev * 3);
      maxBrightness = Math.min(255, mean + stdDev * 3);
    } else if (stdDev > 60) {
      // High contrast image
      minBrightness = Math.max(0, percentile5 - 10);
      maxBrightness = Math.min(255, percentile95 + 10);
    } else {
      // Normal contrast
      const margin = stdDev * 0.5;
      minBrightness = Math.max(0, min - margin);
      maxBrightness = Math.min(255, max + margin);
    }

    // Ensure minimum range
    if (maxBrightness - minBrightness < 30) {
      const center = (minBrightness + maxBrightness) / 2;
      minBrightness = Math.max(0, center - 15);
      maxBrightness = Math.min(255, center + 15);
    }
  }

  /**
   * Start continuous conversion
   */
  function startConversion(localVideo: HTMLVideoElement, remoteVideo?: HTMLVideoElement): void {
    stopConversion();

    // Contrast analysis every second
    contrastTimer = window.setInterval(() => {
      if (localVideo.srcObject && localVideo.videoWidth > 0) {
        analyzeContrast(localVideo);
      }
    }, 1000);

    // ASCII conversion at ~60fps
    conversionTimer = window.setInterval(() => {
      if (localVideo.srcObject && localVideo.videoWidth > 0) {
        setLocalAscii(videoToAscii(localVideo));
      }

      if (remoteVideo && remoteVideo.srcObject && remoteVideo.videoWidth > 0) {
        setRemoteAscii(videoToAscii(remoteVideo));
      } else if (remoteVideo && remoteVideo.srcObject && remoteVideo.videoWidth === 0) {
        const now = Date.now();
        if (now - lastRemoteVideoLogTime > 5000) {
          console.log('Remote video has stream but no dimensions:', {
            readyState: remoteVideo.readyState,
            paused: remoteVideo.paused,
          });
          lastRemoteVideoLogTime = now;
        }
      }
    }, 16);
  }

  /**
   * Stop conversion
   */
  function stopConversion(): void {
    if (contrastTimer !== null) {
      clearInterval(contrastTimer);
      contrastTimer = null;
    }
    if (conversionTimer !== null) {
      clearInterval(conversionTimer);
      conversionTimer = null;
    }
  }

  return {
    localAscii,
    remoteAscii,
    setLocalAscii,
    setRemoteAscii,
    dynamicRangeEnabled,
    setDynamicRangeEnabled,
    initCanvas,
    videoToAscii,
    startConversion,
    stopConversion,
  };
}
