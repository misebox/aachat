import { Suspense, onMount, onCleanup, createEffect, ParentProps } from 'solid-js';
import { FiHelpCircle } from 'solid-icons/fi';

import './app.css';
import { DeviceDialog, HelpDialog, ShareDialog, IconButton } from '@/components/app';
import { appStore } from '@/store/app';
import { useConnection, useUI } from '@/hooks';
import { APP_TITLE } from '@/lib/constants';
import { loadSettings, saveSettings } from '@/lib/settings';
import { ConnectionProvider } from '@/context/connection';

export default function App(props: ParentProps) {
  let localVideoRef: HTMLVideoElement | undefined;
  let remoteVideoRef: HTMLVideoElement | undefined;
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

  // Initialize canvas, setup UI, and start camera
  onMount(async () => {
    document.title = APP_TITLE;

    if (canvasRef) {
      connection.ascii.initCanvas(canvasRef);
    }
    ui.setupResizeListeners();

    // Load saved settings
    const settings = loadSettings();

    // Start camera with saved device preferences
    await connection.media.startCamera(settings.selectedVideoDevice, settings.selectedAudioDevice);
    appStore.setCameraReady(true);

    // Validate and apply saved device settings
    const videoDevices = connection.media.videoDevices();
    const audioDevices = connection.media.audioDevices();

    const validVideo = videoDevices.some(d => d.deviceId === settings.selectedVideoDevice);
    const validAudio = audioDevices.some(d => d.deviceId === settings.selectedAudioDevice);

    // Clear invalid settings
    if (!validVideo || !validAudio) {
      saveSettings({
        selectedVideoDevice: validVideo ? settings.selectedVideoDevice : '',
        selectedAudioDevice: validAudio ? settings.selectedAudioDevice : '',
      });
    }
  });

  // Sync local stream to video element and start ASCII conversion
  createEffect(() => {
    const stream = connection.media.localStream();
    if (localVideoRef && stream) {
      localVideoRef.srcObject = stream;
      localVideoRef.play().catch(() => {});
      // Start ASCII conversion for local video
      connection.ascii.startConversion(localVideoRef, remoteVideoRef);
    }
  });

  // Sync remote stream to video element
  createEffect(() => {
    const stream = connection.remoteStream();
    if (remoteVideoRef && stream) {
      remoteVideoRef.srcObject = stream;
      remoteVideoRef.play().catch(() => {});
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
    connection.disconnect();
    appStore.setConnectionState('idle');
    appStore.setStatusText('');
    appStore.setLocalAscii('');
    appStore.setRemoteAscii('');
    // Restart camera after disconnect
    await connection.media.startCamera();
  };

  const handleRefreshDevices = async () => {
    await connection.media.getAvailableDevices();
  };

  const handleApplyDevices = async (videoDeviceId: string, audioDeviceId: string) => {
    const pc = connection.webrtc.peerConnection();

    if (videoDeviceId !== connection.media.selectedVideoId()) {
      await connection.media.switchDevice('video', videoDeviceId, pc || undefined);
      appStore.setSelectedVideoDevice(videoDeviceId);
    }

    if (audioDeviceId !== connection.media.selectedAudioId()) {
      await connection.media.switchDevice('audio', audioDeviceId, pc || undefined);
      appStore.setSelectedAudioDevice(audioDeviceId);
    }

    // Save to localStorage
    saveSettings({
      selectedVideoDevice: videoDeviceId,
      selectedAudioDevice: audioDeviceId,
    });
  };

  const connectionContextValue = {
    connect: handleConnect,
    disconnect: handleLeave,
    refreshDevices: handleRefreshDevices,
    applyDevices: handleApplyDevices,
    setLocalVideoRef: (el: HTMLVideoElement) => { localVideoRef = el; },
    setRemoteVideoRef: (el: HTMLVideoElement) => { remoteVideoRef = el; },
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

          <div class="container max-w-full mx-0 px-1 py-2">
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
