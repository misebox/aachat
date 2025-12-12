import { onMount, createEffect, on } from 'solid-js';
import { useParams } from '@solidjs/router';
import { Button } from '@/components/ui/button';
import {
  Header,
  StatusBar,
  ChatArea,
} from '@/components/app';
import { appStore } from '@/store/app';
import { useConnectionContext } from '@/context/connection';

export const DirectPage = () => {
  const params = useParams<{ keyword: string }>();
  const connection = useConnectionContext();

  onMount(() => {
    const keyword = decodeURIComponent(params.keyword);
    appStore.setKeyword(keyword);
    appStore.setIsKeywordFromURL(true);
  });

  // Auto-connect when camera is ready
  createEffect(on(appStore.cameraReady, (ready) => {
    if (ready && appStore.isIdle()) {
      connection.connect();
    }
  }));

  // Auto-retry on error (e.g., ICE exchange failed)
  createEffect(on(appStore.connectionState, (state) => {
    if (state === 'error' && appStore.cameraReady()) {
      // Reset to idle and retry after short delay
      setTimeout(() => {
        appStore.setConnectionState('idle');
        connection.connect();
      }, 2000);
    }
  }));

  return (
    <>
      <Header />
      <div class="controls flex items-center justify-center gap-2 py-2 px-2 md:static md:bg-transparent md:border-none fixed bottom-0 left-0 right-0 bg-black border-t border-gray-700 z-50">
        <Show
          when={appStore.isConnected() || appStore.isConnecting()}
          fallback={
            <Button
              variant="outline"
              onClick={connection.connect}
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
      </div>
      <StatusBar variant="desktop" />
      <ChatArea
        localVideoRef={connection.setLocalVideoRef}
        remoteVideoRef={connection.setRemoteVideoRef}
      />
    </>
  );
};
