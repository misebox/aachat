import { createSignal } from 'solid-js';
import type { ConnectionState, SessionRole, MediaDevice } from '@/types';

// Connection state
const [connectionState, setConnectionState] = createSignal<ConnectionState>('idle');
const [sessionRole, setSessionRole] = createSignal<SessionRole>(null);
const [keyword, setKeyword] = createSignal('');
const [statusText, setStatusText] = createSignal('');

// Timer
const [elapsedTime, setElapsedTime] = createSignal(0);

// Devices
const [videoDevices, setVideoDevices] = createSignal<MediaDevice[]>([]);
const [audioDevices, setAudioDevices] = createSignal<MediaDevice[]>([]);
const [selectedVideoDevice, setSelectedVideoDevice] = createSignal('');
const [selectedAudioDevice, setSelectedAudioDevice] = createSignal('');

// ASCII Art
const [localAscii, setLocalAscii] = createSignal('');
const [remoteAscii, setRemoteAscii] = createSignal('');

// Dialogs
const [deviceDialogOpen, setDeviceDialogOpen] = createSignal(false);
const [helpDialogOpen, setHelpDialogOpen] = createSignal(false);

// Keyword state
const [isKeywordFromURL, setIsKeywordFromURL] = createSignal(false);
const [keywordLocked, setKeywordLocked] = createSignal(false);

// Camera state
const [cameraReady, setCameraReady] = createSignal(false);

// Computed: is connected
const isConnected = () => connectionState() === 'connected';
const isConnecting = () => connectionState() === 'connecting';
const isIdle = () => connectionState() === 'idle';

export const appStore = {
  // Connection
  connectionState,
  setConnectionState,
  sessionRole,
  setSessionRole,
  keyword,
  setKeyword,
  statusText,
  setStatusText,

  // Timer
  elapsedTime,
  setElapsedTime,

  // Devices
  videoDevices,
  setVideoDevices,
  audioDevices,
  setAudioDevices,
  selectedVideoDevice,
  setSelectedVideoDevice,
  selectedAudioDevice,
  setSelectedAudioDevice,

  // ASCII
  localAscii,
  setLocalAscii,
  remoteAscii,
  setRemoteAscii,

  // Dialogs
  deviceDialogOpen,
  setDeviceDialogOpen,
  helpDialogOpen,
  setHelpDialogOpen,

  // Keyword state
  isKeywordFromURL,
  setIsKeywordFromURL,
  keywordLocked,
  setKeywordLocked,

  // Camera state
  cameraReady,
  setCameraReady,

  // Computed
  isConnected,
  isConnecting,
  isIdle,
};
