import { onMount, createEffect, on, Show } from 'solid-js';
import { useParams, useNavigate } from '@solidjs/router';
import { FiSettings, FiShare2, FiVideo, FiVideoOff, FiMic, FiMicOff } from 'solid-icons/fi';
import { Button } from '@/components/ui/button';
import {
  Header,
  StatusBar,
  ChatArea,
  IconButton,
} from '@/components/app';
import { appStore } from '@/store/app';
import { useConnectionContext } from '@/context/connection';
import { MAX_DIRECT_CONNECT_RETRIES } from '@/lib/constants';

export const DirectPage = () => {
  const params = useParams<{ keyword: string }>();
  const navigate = useNavigate();
  const connection = useConnectionContext();
  let retryCount = 0;

  const handleNavigateHome = () => {
    connection.disconnect();
    connection.stopCamera();
    appStore.setKeyword('');
    appStore.setIsKeywordFromURL(false);
    appStore.setConnectionState('idle');
    appStore.setStatusText('');
    navigate('/');
  };

  const handleConnect = () => {
    retryCount = 0;
    connection.connect();
  };

  onMount(async () => {
    const keyword = decodeURIComponent(params.keyword);
    appStore.setKeyword(keyword);
    appStore.setIsKeywordFromURL(true);
    // Start camera for connection
    if (!appStore.cameraReady()) {
      await connection.startCamera();
    }
  });

  // Auto-connect when camera is ready
  createEffect(on(appStore.cameraReady, (ready) => {
    if (ready && appStore.isIdle()) {
      retryCount = 0;
      connection.connect();
    }
  }));

  // Reset retry count on successful connection
  createEffect(on(appStore.connectionState, (state) => {
    if (state === 'connected') {
      retryCount = 0;
    }
  }));

  // Auto-retry on error (e.g., ICE exchange failed)
  createEffect(on(appStore.connectionState, (state) => {
    if (state === 'error' && appStore.cameraReady()) {
      retryCount++;
      if (retryCount >= MAX_DIRECT_CONNECT_RETRIES) {
        // Stop retrying after max attempts
        appStore.setConnectionState('idle');
        appStore.setStatusText(`Connection failed after ${MAX_DIRECT_CONNECT_RETRIES} attempts`);
        return;
      }
      // Retry after short delay
      setTimeout(() => {
        appStore.setConnectionState('idle');
        connection.connect();
      }, 2000);
    }
  }));

  return (
    <>
      <Header onNavigateHome={handleNavigateHome} subtitle={appStore.keyword()} />
      <div class="controls flex items-center justify-center gap-2 py-2 px-2 md:static md:bg-transparent md:border-none fixed bottom-0 left-0 right-0 bg-black border-t border-gray-700 z-50">
        <IconButton
          onClick={connection.toggleVideo}
          icon={appStore.videoEnabled() ? <FiVideo size={36} /> : <FiVideoOff size={36} />}
          class={appStore.videoEnabled() ? '' : 'text-red-500'}
        />

        <IconButton
          onClick={connection.toggleAudio}
          icon={appStore.audioEnabled() ? <FiMic size={36} /> : <FiMicOff size={36} />}
          class={appStore.audioEnabled() ? '' : 'text-red-500'}
        />

        <Show
          when={appStore.isConnected() || appStore.isConnecting()}
          fallback={
            <Button
              variant="outline"
              onClick={handleConnect}
              class="border-gray-600 text-white hover:bg-gray-800 hover:border-white"
            >
              Connect
            </Button>
          }
        >
          <Button
            variant="outline"
            onClick={connection.disconnect}
            class="border-gray-600 text-white hover:bg-gray-800 hover:border-white"
          >
            Leave
          </Button>
        </Show>

        <IconButton
          onClick={() => appStore.setShareDialogOpen(true)}
          icon={<FiShare2 size={36} />}
        />

        <IconButton
          onClick={() => appStore.setDeviceDialogOpen(true)}
          icon={<FiSettings size={36} />}
        />
      </div>
      <StatusBar variant="desktop" />
      <ChatArea
        localVideoRef={connection.setLocalVideoRef}
        remoteVideoRef={connection.setRemoteVideoRef}
      />
    </>
  );
};
