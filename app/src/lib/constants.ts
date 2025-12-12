// App info
export const APP_TITLE = 'AACHAT';

// Piping Server URL
export const PPNG_SERVER = atob('aHR0cHM6Ly9wcG5nLnVydGVsbC5jb20vcA==');

// STUN Servers for WebRTC
export const STUN_SERVERS: RTCIceServer[] = JSON.parse(
  atob(
    'W3sidXJscyI6InN0dW46c3R1bi5zLmdvb2dsZS5jb206MTkzMDIifSx7InVybHMiOiJzdHVuOnN0dW4xLmwuZ29vZ2xlLmNvbToxOTMwMiJ9LHsidXJscyI6InN0dW46c3R1bjIubC5nb29nbGUuY29tOjE5MzAyIn0seyJ1cmxzIjoic3R1bjpzdHVuMy5zLmdvb2dsZS5jb206MTkzMDIifSx7InVybHMiOiJzdHVuOnN0dW40LmwuZ29vZ2xlLmNvbToxOTMwMiJ9LHsidXJscyI6InN0dW46c3R1bi5zdHVucHJvdG9jb2wub3JnOjM0NzgifSx7InVybHMiOiJzdHVuOnN0dW4udm9pcGJ1c3Rlci5jb206MzQ3OCJ9LHsidXJscyI6InN0dW46c3R1bi52b2lwc3R1bnQuY29tOjM0NzgifV0='
  )
);

// ASCII Art settings
export const ASCII_CHARS = ' .,:;ico%k0S@QNW';
export const CHAR_COUNT = ASCII_CHARS.length;
export const AA_WIDTH = 40;
export const AA_HEIGHT = 30;

// Signaling timeouts (seconds)
export const TIMEOUT_OFFER_PUT = 60; // H:OFFER_PUT - waiting for guest
export const TIMEOUT_SIGNALING = 5; // Other operations
export const MAX_OFFER_PUT_RETRIES = 30; // Max retries for H_OFFER_PUT (30 min total)

// Retry/Timer settings (milliseconds)
export const ICE_GATHERING_TIMEOUT = 3000;
export const RETRY_DELAY = 1000;
export const CONNECT_MAX_RETRIES = 3;
export const KEYWORD_TIMER_MAX = 10 * 60 * 1000; // 10 minutes
export const MAX_DIRECT_CONNECT_RETRIES = 5; // Auto-retry limit for /direct/:keyword

// Session states
export const SessionState = {
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
  CONNECTED: 'CONN',
} as const;

export type SessionStateType = (typeof SessionState)[keyof typeof SessionState];
