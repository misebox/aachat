import { onMount } from 'solid-js';
import { useSearchParams } from '@solidjs/router';
import {
  Header,
  ConnectionControls,
  StatusBar,
  ChatArea,
} from '@/components/app';
import { appStore } from '@/store/app';
import { useConnectionContext } from '@/context/connection';

export const HomePage = () => {
  const [searchParams] = useSearchParams();
  const connection = useConnectionContext();

  onMount(() => {
    const keyword = searchParams.k;
    if (keyword) {
      appStore.setKeyword(keyword);
      appStore.setIsKeywordFromURL(true);
    }
  });

  return (
    <>
      <Header />
      <ConnectionControls
        onConnect={connection.connect}
        onLeave={connection.disconnect}
      />
      <StatusBar variant="desktop" />
      <ChatArea
        localVideoRef={connection.setLocalVideoRef}
        remoteVideoRef={connection.setRemoteVideoRef}
      />
    </>
  );
};
