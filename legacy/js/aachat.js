import { Config } from './constants.js';
import { SignalingManager } from './signaling.js';
import { WebRTCManager } from './webrtc.js';
import { MediaManager } from './media.js';
import { SessionManager } from './session.js';
import { ASCIIConverter } from './ascii.js';
import { UIManager } from './ui.js';

// AAChat Main Class - coordinates all managers
export class AAChat {
  constructor(deps) {
    const { logger, Elm, callbacks } = deps;

    this.logger = logger;
    this.Elm = Elm;
    this.callbacks = callbacks;

    // Initialize managers
    this.sessionManager = new SessionManager();
    this.signalingManager = new SignalingManager(Config.PPNG_SERVER + '/aachat');
    this.uiManager = new UIManager(Elm);

    // MediaManager with callbacks
    this.mediaManager = new MediaManager({
      elm: Elm,
      callbacks: {
        playVideoSafely: callbacks.playVideoSafely,
        updateSelectOptions: callbacks.updateSelectOptions,
        getWebRTCManager: () => this.webRTCManager
      }
    });

    // Initialize canvas and converters
    this.ctx = Elm.canvas.getContext('2d');
    this.asciiConverter = new ASCIIConverter(Elm.canvas, this.ctx);

    // State variables
    this.keywordTimer = null;
    this.timerInterval = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = null;
    this.isWaitingForGuest = false;

    // WebRTCManager will be created after all callbacks are defined
    this.webRTCManager = null;
  }

  setupWebRTC(webrtcCallbacks) {
    this.webRTCManager = new WebRTCManager({
      logger: this.logger,
      sessionManager: this.sessionManager,
      signalingManager: this.signalingManager,
      mediaManager: this.mediaManager,
      uiManager: this.uiManager,
      elm: this.Elm,
      callbacks: webrtcCallbacks
    });
  }
}

// Re-export classes for direct access if needed
export { Config, SignalingManager, WebRTCManager, MediaManager, SessionManager, ASCIIConverter, UIManager };
export { Logger } from './logger.js';
export { Elm } from './dom.js';
