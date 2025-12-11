// Config class for constants
export class Config {
  static PPNG_SERVER = atob('aHR0cHM6Ly9wcG5nLnVydGVsbC5jb20vcA==');
  static STUN_SERVERS = JSON.parse(atob('W3sidXJscyI6InN0dW46c3R1bi5zLmdvb2dsZS5jb206MTkzMDIifSx7InVybHMiOiJzdHVuOnN0dW4xLmwuZ29vZ2xlLmNvbToxOTMwMiJ9LHsidXJscyI6InN0dW46c3R1bjIubC5nb29nbGUuY29tOjE5MzAyIn0seyJ1cmxzIjoic3R1bjpzdHVuMy5zLmdvb2dsZS5jb206MTkzMDIifSx7InVybHMiOiJzdHVuOnN0dW40LmwuZ29vZ2xlLmNvbToxOTMwMiJ9LHsidXJscyI6InN0dW46c3R1bi5zdHVucHJvdG9jb2wub3JnOjM0NzgifSx7InVybHMiOiJzdHVuOnN0dW4udm9pcGJ1c3Rlci5jb206MzQ3OCJ9LHsidXJscyI6InN0dW46c3R1bi52b2lwc3R1bnQuY29tOjM0NzgifV0='));

  // ASCII Art
  static ASCII_CHARS = " .,:;ico%k0S@QNW";
  static CHAR_COUNT = Config.ASCII_CHARS.length;
  static AA_WIDTH = 80;
  static AA_HEIGHT = 60;

  // シグナリングタイムアウト（秒）
  static TIMEOUT_OFFER_PUT = 60;  // H:OFFER_PUT - ゲスト待ち（Cloud Run対策）
  static TIMEOUT_SIGNALING = 5;   // その他全て

  // リトライ・タイマー（ミリ秒）
  static ICE_GATHERING_TIMEOUT = 3000;
  static RETRY_DELAY = 1000;
  static CONNECT_MAX_RETRIES = 3;
  static KEYWORD_TIMER_MAX = 10 * 60 * 1000;  // 10分
}
