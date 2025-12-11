import { getTimestamp } from '@/lib/utils';
import { SessionState, type SessionStateType } from '@/lib/constants';

export interface SessionInfo {
  isHost: boolean;
  state: SessionStateType;
}

type SessionInfoGetter = () => SessionInfo;

const defaultSessionInfo: SessionInfo = { isHost: false, state: SessionState.IDLE };

let sessionInfoGetter: SessionInfoGetter = () => defaultSessionInfo;

export function setSessionInfoGetter(getter: SessionInfoGetter) {
  sessionInfoGetter = getter;
}

function getRole(): string {
  const info = sessionInfoGetter();
  if (info.state === SessionState.IDLE || info.state === SessionState.HEAD_CHECK) {
    return '-';
  }
  return info.isHost ? 'H' : 'G';
}

function getState(): string {
  return sessionInfoGetter().state || SessionState.IDLE;
}

function format(category: string, msg: string): string {
  return `[${getTimestamp()}][${getRole()}][${getState()}][${category}] ${msg}`;
}

function toStr(args: unknown[]): string {
  return args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
}

export const logger = {
  sig: (...args: unknown[]) => console.log(format('SIG', toStr(args))),
  rtc: (...args: unknown[]) => console.log(format('RTC', toStr(args))),
  ice: (...args: unknown[]) => console.log(format('ICE', toStr(args))),
  log: (...args: unknown[]) => console.log(format('---', toStr(args))),
  error: (category: string, ...args: unknown[]) => console.error(format(category, toStr(args))),
};

/**
 * Hook to use logger with session context
 */
export function useLogger() {
  return logger;
}
