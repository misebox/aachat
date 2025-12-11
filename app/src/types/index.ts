// Device types
export interface MediaDevice {
  deviceId: string;
  label: string;
}

// Connection state
export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error';

// Session role
export type SessionRole = 'host' | 'guest' | null;

// App state
export interface AppState {
  // Connection
  connectionState: ConnectionState;
  sessionRole: SessionRole;
  keyword: string;
  statusText: string;

  // Timer
  elapsedTime: number;

  // Devices
  videoDevices: MediaDevice[];
  audioDevices: MediaDevice[];
  selectedVideoDevice: string;
  selectedAudioDevice: string;

  // ASCII Art
  localAscii: string;
  remoteAscii: string;
}

// Dialog state
export interface DialogState {
  deviceDialogOpen: boolean;
  helpDialogOpen: boolean;
}
