import { Suspense } from 'solid-js';
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

export default function App() {
  let localVideoRef: HTMLVideoElement | undefined;
  let remoteVideoRef: HTMLVideoElement | undefined;

  const handleConnect = () => {
    // TODO: Implement connection logic
    console.log('Connect clicked');
    appStore.setStatusText('Connecting...');
    appStore.setConnectionState('connecting');
  };

  const handleLeave = () => {
    // TODO: Implement leave logic
    console.log('Leave clicked');
    appStore.setStatusText('');
    appStore.setConnectionState('idle');
  };

  const handleRefreshDevices = () => {
    // TODO: Implement device refresh
    console.log('Refresh devices');
  };

  const handleApplyDevices = (videoDeviceId: string, audioDeviceId: string) => {
    // TODO: Implement device change
    console.log('Apply devices', videoDeviceId, audioDeviceId);
    appStore.setSelectedVideoDevice(videoDeviceId);
    appStore.setSelectedAudioDevice(audioDeviceId);
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
        <canvas id="canvas" class="hidden" />

        {/* Dialogs */}
        <DeviceDialog onRefresh={handleRefreshDevices} onApply={handleApplyDevices} />
        <HelpDialog />
      </div>
    </Suspense>
  );
}
