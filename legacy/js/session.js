import { Utility } from './utility.js';

// SessionManager class for session state management
export class SessionManager {
  static State = {
    IDLE: 'IDLE',
    HEAD_CHECK: 'HEAD',
    H_OFFER_PUT: 'H:OFFER_PUT',
    H_ANSWER_GET: 'H:ANS_GET',
    H_ICE_SEND: 'H:ICE_PUT',
    H_ICE_RECV: 'H:ICE_GET',
    G_OFFER_GET: 'G:OFFER_GET',
    G_ANSWER_PUT: 'G:ANS_PUT',
    G_ICE_SEND: 'G:ICE_PUT',
    G_ICE_RECV: 'G:ICE_GET',
    CONNECTED: 'CONN'
  };

  constructor() {
    this.state = SessionManager.State.IDLE;
    this.isHost = false;
    this.sessionToken = null;
    this.sessionHash = null;
    this.currentKeyword = null;
    this.sessionActive = false;
    this.startTime = null;
    this.connectionEstablished = false;
  }

  setState(state) {
    this.state = state;
  }

  reset() {
    this.state = SessionManager.State.IDLE;
    this.isHost = false;
    this.sessionToken = null;
    this.sessionHash = null;
    this.currentKeyword = null;
    this.sessionActive = false;
    this.startTime = null;
    this.connectionEstablished = false;
  }

  startSession(isHost, keyword, sessionHash = null) {
    this.isHost = isHost;
    this.currentKeyword = keyword;
    this.sessionHash = sessionHash || Utility.generateSessionToken();
    this.sessionActive = true;
    this.startTime = Date.now();
    this.sessionToken = Utility.generateSessionToken();
  }

  getChannelPath(suffix) {
    return `${this.currentKeyword}/${this.sessionHash}/${suffix}`;
  }

  endSession() {
    this.sessionActive = false;
    this.connectionEstablished = false;
    this.sessionHash = null;
  }

  getSessionDuration() {
    if (!this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  isSessionExpired(maxDuration = 600) {
    return this.getSessionDuration() >= maxDuration;
  }

  getRemainingTime(maxDuration = 600) {
    const elapsed = this.getSessionDuration();
    return Math.max(0, maxDuration - elapsed);
  }
}
