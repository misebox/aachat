// Logger - セッション状態を含むログユーティリティ
export class Logger {
  constructor() {
    this.getSessionInfo = () => ({ isHost: false, state: 'IDLE' });
  }

  setSessionInfoGetter(getter) {
    this.getSessionInfo = getter;
  }

  _getTime() {
    const now = new Date();
    return now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
  }

  _getRole() {
    const info = this.getSessionInfo();
    if (info.state === 'IDLE' || info.state === 'HEAD') return '-';
    return info.isHost ? 'H' : 'G';
  }

  _getState() {
    return this.getSessionInfo().state || 'IDLE';
  }

  _format(category, msg) {
    return `[${this._getTime()}][${this._getRole()}][${this._getState()}][${category}] ${msg}`;
  }

  _toStr(args) {
    return args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
  }

  sig(...args) { console.log(this._format('SIG', this._toStr(args))); }
  rtc(...args) { console.log(this._format('RTC', this._toStr(args))); }
  ice(...args) { console.log(this._format('ICE', this._toStr(args))); }
  log(...args) { console.log(this._format('---', this._toStr(args))); }
  error(category, ...args) { console.error(this._format(category, this._toStr(args))); }
}
