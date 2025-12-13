import { createSignal, createEffect, onCleanup } from 'solid-js';
import { ASCII_CHARS, CHAR_COUNT, AA_WIDTH, AA_HEIGHT } from '@/lib/constants';
import { appStore } from '@/store/app';

interface BrightnessRange {
  min: number;
  max: number;
}

/**
 * Hook for video to ASCII art conversion
 */
export function useAscii() {
  const [localAscii, setLocalAscii] = createSignal('');
  const [remoteAscii, setRemoteAscii] = createSignal('');
  const [dynamicRangeEnabled, setDynamicRangeEnabled] = createSignal(true);

  let canvas: HTMLCanvasElement | null = null;
  let ctx: CanvasRenderingContext2D | null = null;
  let contrastTimer: ReturnType<typeof setInterval> | null = null;
  let conversionTimer: ReturnType<typeof setInterval> | null = null;

  // Dynamic range for contrast adjustment (separate for local and remote)
  let localBrightness: BrightnessRange = { min: 0, max: 255 };
  let remoteBrightness: BrightnessRange = { min: 0, max: 255 };
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
  function videoToAscii(video: HTMLVideoElement, brightness: BrightnessRange): string {
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
        let pixelBrightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;

        // Apply dynamic range normalization if enabled
        if (dynamicRangeEnabled() && brightness.max > brightness.min) {
          pixelBrightness = (pixelBrightness - brightness.min) / (brightness.max - brightness.min);
          pixelBrightness = Math.max(0, Math.min(1, pixelBrightness));
          const charIndex = Math.floor(pixelBrightness * (CHAR_COUNT - 1));
          ascii += ASCII_CHARS[charIndex];
        } else {
          const charIndex = Math.floor((pixelBrightness / 255) * (CHAR_COUNT - 1));
          ascii += ASCII_CHARS[charIndex];
        }
      }
      ascii += '\n';
    }

    return ascii;
  }

  /**
   * Analyze video for contrast adjustment
   * Returns the calculated brightness range
   */
  function analyzeContrast(video: HTMLVideoElement): BrightnessRange | null {
    if (!canvas || !ctx || !video.videoWidth || !video.videoHeight) {
      return null;
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

    let newMin: number;
    let newMax: number;

    // Adjust range based on image characteristics
    if (stdDev < 20) {
      // Low contrast image
      newMin = Math.max(0, mean - stdDev * 3);
      newMax = Math.min(255, mean + stdDev * 3);
    } else if (stdDev > 60) {
      // High contrast image
      newMin = Math.max(0, percentile5 - 10);
      newMax = Math.min(255, percentile95 + 10);
    } else {
      // Normal contrast
      const margin = stdDev * 0.5;
      newMin = Math.max(0, min - margin);
      newMax = Math.min(255, max + margin);
    }

    // Ensure minimum range
    if (newMax - newMin < 30) {
      const center = (newMin + newMax) / 2;
      newMin = Math.max(0, center - 15);
      newMax = Math.min(255, center + 15);
    }

    return { min: newMin, max: newMax };
  }

  let localVideoRef: HTMLVideoElement | null = null;
  let remoteVideoRef: HTMLVideoElement | null = null;
  let currentFps = 30;

  /**
   * Start continuous conversion
   */
  function startConversion(localVideo: HTMLVideoElement, remoteVideo?: HTMLVideoElement): void {
    localVideoRef = localVideo;
    remoteVideoRef = remoteVideo ?? null;
    restartConversionTimer();

    // Contrast analysis every second
    if (contrastTimer !== null) {
      clearInterval(contrastTimer);
    }
    contrastTimer = setInterval(() => {
      if (localVideo.srcObject && localVideo.videoWidth > 0) {
        const range = analyzeContrast(localVideo);
        if (range) localBrightness = range;
      }
      if (remoteVideo && remoteVideo.srcObject && remoteVideo.videoWidth > 0) {
        const range = analyzeContrast(remoteVideo);
        if (range) remoteBrightness = range;
      }
    }, 1000);
  }

  /**
   * Restart conversion timer with current FPS
   */
  function restartConversionTimer(): void {
    if (conversionTimer !== null) {
      clearInterval(conversionTimer);
      conversionTimer = null;
    }

    if (!localVideoRef) return;

    const fps = appStore.fps();
    currentFps = fps;
    const interval = Math.round(1000 / fps);

    conversionTimer = setInterval(() => {
      if (localVideoRef && localVideoRef.srcObject && localVideoRef.videoWidth > 0) {
        setLocalAscii(videoToAscii(localVideoRef, localBrightness));
      }

      if (remoteVideoRef && remoteVideoRef.srcObject && remoteVideoRef.videoWidth > 0) {
        setRemoteAscii(videoToAscii(remoteVideoRef, remoteBrightness));
      } else if (remoteVideoRef && remoteVideoRef.srcObject && remoteVideoRef.videoWidth === 0) {
        const now = Date.now();
        if (now - lastRemoteVideoLogTime > 5000) {
          console.log('Remote video has stream but no dimensions:', {
            readyState: remoteVideoRef.readyState,
            paused: remoteVideoRef.paused,
          });
          lastRemoteVideoLogTime = now;
        }
      }
    }, interval);
  }

  // Watch for FPS changes and restart timer
  createEffect(() => {
    const fps = appStore.fps();
    if (fps !== currentFps && localVideoRef) {
      restartConversionTimer();
    }
  });

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
    startConversion,
    stopConversion,
  };
}
