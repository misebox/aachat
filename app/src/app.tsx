import { Suspense, onMount, onCleanup, createEffect, createSignal, ParentProps } from 'solid-js';
import { FiHelpCircle } from 'solid-icons/fi';

import './app.css';
import { DeviceDialog, HelpDialog, ShareDialog, IconButton } from '@/components/app';
import { appStore } from '@/store/app';
import { useConnection, useUI, useAudioLevel } from '@/hooks';
import { APP_TITLE } from '@/lib/constants';
import { loadSettings, saveSettings } from '@/lib/settings';
import { ConnectionProvider } from '@/context/connection';

export default function App(props: ParentProps) {
  const [localVideoRef, setLocalVideoRef] = createSignal<HTMLVideoElement | undefined>();
  const [remoteVideoRef, setRemoteVideoRef] = createSignal<HTMLVideoElement | undefined>();
  let canvasRef: HTMLCanvasElement | undefined;

  const ui = useUI();

  const connection = useConnection({
    onStatusChange: (status) => {
      // Only update status if still connecting or connected
      if (appStore.isConnecting() || appStore.isConnected()) {
        appStore.setStatusText(status);
      }
    },
    onConnected: () => {
      // Only transition to connected if still connecting
      if (appStore.isConnecting()) {
        appStore.setConnectionState('connected');
      }
    },
    onDisconnected: () => {
      appStore.setConnectionState('disconnected');
      appStore.setRemoteAscii('');
    },
    onPeerLeft: () => {
      appStore.setConnectionState('idle');
      appStore.setStatusText('Call ended');
      appStore.setRemoteAscii('');
    },
    onPeerInitiatedLeave: async () => {
      appStore.setRemoteAscii('');
      appStore.setStatusText('Peer left. Reconnecting...');
      appStore.setConnectionState('connecting');
      // Auto-reconnect with current keyword
      const keyword = appStore.keyword();
      if (keyword) {
        const success = await connection.connect(keyword);
        if (!success && appStore.connectionState() !== 'connected') {
          appStore.setConnectionState('idle');
        }
      } else {
        appStore.setConnectionState('idle');
        appStore.setStatusText('Call ended');
      }
    },
    onError: (error) => {
      console.error('Connection error:', error);
      // Only handle error if still connecting or connected
      if (appStore.isConnecting() || appStore.isConnected()) {
        appStore.setStatusText(error);
        appStore.setConnectionState('error');
      }
    },
  });

  // Initialize canvas and setup UI (camera is started by pages as needed)
  onMount(() => {
    document.title = APP_TITLE;

    // Load fps from settings
    const settings = loadSettings();
    appStore.setFps(settings.fps);

    if (canvasRef) {
      connection.ascii.initCanvas(canvasRef);
    }
    ui.setupResizeListeners();
  });

  // Audio level analysis for local and remote streams
  const localAudioLevel = useAudioLevel(() => connection.media.localStream());
  const remoteAudioLevel = useAudioLevel(() => connection.remoteStream());

  // Sync audio levels to store
  createEffect(() => {
    appStore.setLocalAudioLevel(localAudioLevel());
  });

  createEffect(() => {
    appStore.setRemoteAudioLevel(remoteAudioLevel());
  });

  // Sync local stream to video element and start ASCII conversion
  createEffect(() => {
    const stream = connection.media.localStream();
    const localVideo = localVideoRef();
    const remoteVideo = remoteVideoRef();
    if (localVideo && stream) {
      localVideo.srcObject = stream;
      localVideo.play().catch(() => {});
      // Start ASCII conversion for local video
      connection.ascii.startConversion(localVideo, remoteVideo);
    }
  });

  // Sync remote stream to video element
  createEffect(() => {
    const stream = connection.remoteStream();
    const remoteVideo = remoteVideoRef();
    if (remoteVideo) {
      if (stream) {
        remoteVideo.srcObject = stream;
        remoteVideo.play().catch(() => {});
      } else {
        // Clear when stream is null (peer disconnected)
        remoteVideo.srcObject = null;
        appStore.setRemoteAscii('');
      }
    }
  });

  // Sync ASCII output to store
  createEffect(() => {
    appStore.setLocalAscii(connection.ascii.localAscii());
  });

  createEffect(() => {
    appStore.setRemoteAscii(connection.ascii.remoteAscii());
  });

  // Sync devices to store
  createEffect(() => {
    appStore.setVideoDevices(connection.media.videoDevices());
  });

  createEffect(() => {
    appStore.setAudioDevices(connection.media.audioDevices());
  });

  // Sync selected device IDs to store
  createEffect(() => {
    const videoId = connection.media.selectedVideoId();
    if (videoId) appStore.setSelectedVideoDevice(videoId);
  });

  createEffect(() => {
    const audioId = connection.media.selectedAudioId();
    if (audioId) appStore.setSelectedAudioDevice(audioId);
  });

  // Timer for elapsed time
  let timerInterval: number | undefined;

  createEffect(() => {
    if (connection.session.connectionEstablished()) {
      timerInterval = window.setInterval(() => {
        appStore.setElapsedTime(connection.session.getSessionDuration());
      }, 1000);
    } else {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = undefined;
      }
      appStore.setElapsedTime(0);
    }
  });

  // Recalculate font size when video area count changes
  createEffect(() => {
    appStore.videoAreaCount();
    ui.adjustAAFontSize();
  });

  onCleanup(() => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    connection.cleanup();
  });

  const handleConnect = async () => {
    console.log('handleConnect called');
    const keyword = appStore.keyword();
    console.log('keyword:', keyword);

    if (!keyword.trim()) {
      appStore.setStatusText('Please enter a keyword');
      return;
    }

    appStore.setConnectionState('connecting');
    appStore.setStatusText('Connecting...');

    try {
      console.log('Calling connection.connect...');
      const success = await connection.connect(keyword);
      console.log('connection.connect returned:', success);
      if (!success && appStore.connectionState() !== 'connected') {
        appStore.setConnectionState('idle');
      }
    } catch (error) {
      console.error('handleConnect error:', error);
      appStore.setStatusText('Connection failed');
      appStore.setConnectionState('idle');
    }
  };

  const handleLeave = async () => {
    // disconnect() will send leave message and wait for ack
    // onPeerLeft callback will handle the cleanup
    await connection.disconnect();
  };

  const handleRefreshDevices = async () => {
    await connection.media.getAvailableDevices();
  };

  const handleApplyDevices = async (videoDeviceId: string, audioDeviceId: string, fps: number) => {
    const pc = connection.webrtc.peerConnection();

    if (videoDeviceId !== connection.media.selectedVideoId()) {
      await connection.media.switchDevice('video', videoDeviceId, pc || undefined);
      appStore.setSelectedVideoDevice(videoDeviceId);
    }

    if (audioDeviceId !== connection.media.selectedAudioId()) {
      await connection.media.switchDevice('audio', audioDeviceId, pc || undefined);
      appStore.setSelectedAudioDevice(audioDeviceId);
    }

    // Update FPS
    appStore.setFps(fps);

    // Save to localStorage
    saveSettings({
      selectedVideoDevice: videoDeviceId,
      selectedAudioDevice: audioDeviceId,
      fps,
    });
  };

  const handleToggleVideo = () => {
    const newState = !appStore.videoEnabled();
    appStore.setVideoEnabled(newState);
    connection.media.setVideoEnabled(newState);
  };

  const handleToggleAudio = () => {
    const newState = !appStore.audioEnabled();
    appStore.setAudioEnabled(newState);
    connection.media.setAudioEnabled(newState);
  };

  const handleStartCamera = async () => {
    const settings = loadSettings();
    const success = await connection.media.startCamera(
      settings.selectedVideoDevice,
      settings.selectedAudioDevice
    );
    if (success) {
      appStore.setCameraReady(true);
    }
  };

  const handleStopCamera = () => {
    connection.media.stopCamera();
    connection.ascii.stopConversion();
    appStore.setCameraReady(false);
    appStore.setLocalAscii('');
  };

  const connectionContextValue = {
    connect: handleConnect,
    disconnect: handleLeave,
    refreshDevices: handleRefreshDevices,
    applyDevices: handleApplyDevices,
    setLocalVideoRef,
    setRemoteVideoRef,
    toggleVideo: handleToggleVideo,
    toggleAudio: handleToggleAudio,
    startCamera: handleStartCamera,
    stopCamera: handleStopCamera,
  };

  return (
    <Suspense>
      <ConnectionProvider value={connectionContextValue}>
        <div class="min-h-screen bg-black text-white font-mono overflow-x-hidden">
          {/* Mobile help button */}
          <IconButton
            onClick={() => appStore.setHelpDialogOpen(true)}
            icon={<FiHelpCircle size={36} />}
            class="fixed top-1 right-1 z-[110] md:hidden bg-neutral-800"
          />

          <div class="flex flex-col min-h-[calc(100vh-1rem)] max-w-full mx-0 px-1 py-2">
            {props.children}
          </div>

          {/* Hidden canvas for video processing */}
          <canvas ref={(el) => (canvasRef = el)} class="hidden" />

          {/* Dialogs */}
          <DeviceDialog onRefresh={handleRefreshDevices} onApply={handleApplyDevices} />
          <HelpDialog />
          <ShareDialog
            open={appStore.shareDialogOpen()}
            onOpenChange={appStore.setShareDialogOpen}
          />
        </div>
      </ConnectionProvider>
    </Suspense>
  );
}
