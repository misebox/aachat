import { Config } from './constants.js';

// ASCIIConverter class for video processing
export class ASCIIConverter {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.minBrightness = 0;
    this.maxBrightness = 255;
    this.dynamicRangeEnabled = true;
    this.contrastTimer = null;
    this.conversionTimer = null;
    this.lastRemoteVideoLogTime = 0;
  }

  videoToAscii(video) {
    if (!video.videoWidth || !video.videoHeight) return '';

    this.canvas.width = Config.AA_WIDTH;
    this.canvas.height = Config.AA_HEIGHT;

    this.ctx.drawImage(video, 0, 0, Config.AA_WIDTH, Config.AA_HEIGHT);
    const imageData = this.ctx.getImageData(0, 0, Config.AA_WIDTH, Config.AA_HEIGHT);
    const pixels = imageData.data;

    let ascii = '';
    for (let y = 0; y < Config.AA_HEIGHT; y++) {
      for (let x = 0; x < Config.AA_WIDTH; x++) {
        const i = (y * Config.AA_WIDTH + x) * 4;
        let brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;

        if (this.dynamicRangeEnabled && this.maxBrightness > this.minBrightness) {
          brightness = (brightness - this.minBrightness) / (this.maxBrightness - this.minBrightness);
          brightness = Math.max(0, Math.min(1, brightness));
          const charIndex = Math.floor(brightness * (Config.CHAR_COUNT - 1));
          ascii += Config.ASCII_CHARS[charIndex];
        } else {
          const charIndex = Math.floor((brightness / 255) * (Config.CHAR_COUNT - 1));
          ascii += Config.ASCII_CHARS[charIndex];
        }
      }
      ascii += '\n';
    }

    return ascii;
  }

  analyzeAndAdjustContrast(video) {
    if (!video.videoWidth || !video.videoHeight) return;

    const sampleWidth = 64;
    const sampleHeight = 64;
    this.canvas.width = sampleWidth;
    this.canvas.height = sampleHeight;

    this.ctx.drawImage(video, 0, 0, sampleWidth, sampleHeight);
    const imageData = this.ctx.getImageData(0, 0, sampleWidth, sampleHeight);
    const pixels = imageData.data;

    let min = 255;
    let max = 0;
    let sum = 0;
    let count = 0;
    const brightnessValues = [];

    for (let i = 0; i < pixels.length; i += 4) {
      const brightness = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
      brightnessValues.push(brightness);
      min = Math.min(min, brightness);
      max = Math.max(max, brightness);
      sum += brightness;
      count++;
    }

    const mean = sum / count;

    let variance = 0;
    for (const brightness of brightnessValues) {
      variance += Math.pow(brightness - mean, 2);
    }
    variance /= count;
    const stdDev = Math.sqrt(variance);

    brightnessValues.sort((a, b) => a - b);
    const percentile5 = brightnessValues[Math.floor(count * 0.05)];
    const percentile95 = brightnessValues[Math.floor(count * 0.95)];

    if (stdDev < 20) {
      this.minBrightness = Math.max(0, mean - stdDev * 3);
      this.maxBrightness = Math.min(255, mean + stdDev * 3);
    } else if (stdDev > 60) {
      this.minBrightness = Math.max(0, percentile5 - 10);
      this.maxBrightness = Math.min(255, percentile95 + 10);
    } else {
      const margin = stdDev * 0.5;
      this.minBrightness = Math.max(0, min - margin);
      this.maxBrightness = Math.min(255, max + margin);
    }

    if (this.maxBrightness - this.minBrightness < 30) {
      const center = (this.minBrightness + this.maxBrightness) / 2;
      this.minBrightness = Math.max(0, center - 15);
      this.maxBrightness = Math.min(255, center + 15);
    }
  }

  startConversion(localVideo, remoteVideo, localAA, remoteAA) {
    this.stopConversion();

    this.contrastTimer = setInterval(() => {
      if (localVideo.srcObject && localVideo.videoWidth > 0) {
        this.analyzeAndAdjustContrast(localVideo);
      }
    }, 1000);

    this.conversionTimer = setInterval(() => {
      if (localVideo.srcObject && localVideo.videoWidth > 0) {
        const localAAText = this.videoToAscii(localVideo);
        localAA.textContent = localAAText;
      }

      if (remoteVideo.srcObject && remoteVideo.videoWidth > 0) {
        const remoteAAText = this.videoToAscii(remoteVideo);
        remoteAA.textContent = remoteAAText;
      } else if (remoteVideo.srcObject && remoteVideo.videoWidth === 0) {
        const now = Date.now();
        if (now - this.lastRemoteVideoLogTime > 5000) {
          console.log('Remote video has stream but no dimensions:', {
            readyState: remoteVideo.readyState,
            paused: remoteVideo.paused,
            videoWidth: remoteVideo.videoWidth,
            videoHeight: remoteVideo.videoHeight
          });
          this.lastRemoteVideoLogTime = now;
        }
      }
    }, 16);
  }

  stopConversion() {
    if (this.contrastTimer) {
      clearInterval(this.contrastTimer);
      this.contrastTimer = null;
    }
    if (this.conversionTimer) {
      clearInterval(this.conversionTimer);
      this.conversionTimer = null;
    }
  }
}
