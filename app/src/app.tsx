import { Suspense, onMount, onCleanup, createEffect } from 'solid-js';
import { HelpCircle } from 'lucide-solid';

import './app.css';
import {
  Header,
  ConnectionControls,
  StatusBar,
  ChatArea,
  DeviceDialog,
  HelpDialog,
  IconButton,
} from '@/components/app';
import { appStore } from '@/store/app';
import { useConnection } from '@/hooks';

export default function App() {
  let localVideoRef: HTMLVideoElement | undefined;
  let remoteVideoRef: HTMLVideoElement | undefined;
  let canvasRef: HTMLCanvasElement | undefined;

  const connection = useConnection({
    onStatusChange: (status) => {
      appStore.setStatusText(status);
    },
    onConnected: () => {
      appStore.setConnectionState('connected');
      // Start ASCII conversion when connected
      if (localVideoRef && remoteVideoRef) {
        connection.ascii.startConversion(localVideoRef, remoteVideoRef);
      }
    },
    onDisconnected: () => {
      appStore.setConnectionState('disconnected');
    },
    onError: (error) => {
      console.error('Connection error:', error);
      appStore.setStatusText(error);
      appStore.setConnectionState('error');
    },
  });

  // Initialize canvas for ASCII conversion
  onMount(() => {
    if (canvasRef) {
      connection.ascii.initCanvas(canvasRef);
    }
  });

  // Sync local stream to video element
  createEffect(() => {
    const stream = connection.media.localStream();
    if (localVideoRef && stream) {
      localVideoRef.srcObject = stream;
      localVideoRef.play().catch(() => {});
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

  onCleanup(() => {
    if (timerInterval) {
      clearInterval(timerInterval);
    }
    connection.cleanup();
  });

  const handleConnect = async () => {
    const keyword = appStore.keyword();
    if (!keyword.trim()) {
      appStore.setStatusText('Please enter a keyword');
      return;
    }

    appStore.setConnectionState('connecting');
    appStore.setStatusText('Connecting...');

    const success = await connection.connect(keyword);
    if (!success && appStore.connectionState() !== 'connected') {
      appStore.setConnectionState('idle');
    }
  };

  const handleLeave = () => {
    connection.disconnect();
    appStore.setConnectionState('idle');
    appStore.setStatusText('');
    appStore.setLocalAscii('');
    appStore.setRemoteAscii('');
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
  };

  return (
    <Suspense>
      <div class="min-h-screen bg-black text-white font-mono overflow-x-hidden">
        {/* Mobile help button */}
        <IconButton
          onClick={() => appStore.setHelpDialogOpen(true)}
          icon={<HelpCircle class="w-5 h-5" />}
          class="fixed top-1 right-1 z-[110] md:hidden bg-neutral-800"
        />

        <div class="container max-w-full mx-0 px-1 py-2">
          <Header />
          <ConnectionControls onConnect={handleConnect} onLeave={handleLeave} />
          <StatusBar variant="desktop" />
          <ChatArea
            localVideoRef={(el) => (localVideoRef = el)}
            remoteVideoRef={(el) => (remoteVideoRef = el)}
          />
        </div>

        {/* Hidden canvas for video processing */}
        <canvas ref={(el) => (canvasRef = el)} class="hidden" />

        {/* Dialogs */}
        <DeviceDialog onRefresh={handleRefreshDevices} onApply={handleApplyDevices} />
        <HelpDialog />
      </div>
    </Suspense>
  );
}
