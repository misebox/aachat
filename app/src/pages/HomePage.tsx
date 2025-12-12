import { onMount, onCleanup } from 'solid-js';
import { useSearchParams, useNavigate } from '@solidjs/router';
import { FiSettings, FiHelpCircle, FiShare2, FiVideo, FiVideoOff, FiMic, FiMicOff } from 'solid-icons/fi';
import { Button } from '@/components/ui/button';
import {
  Header,
  StatusBar,
  ChatArea,
  KeywordInput,
  IconButton,
  ShareDialog,
} from '@/components/app';
import { appStore } from '@/store/app';
import { useConnectionContext } from '@/context/connection';

export const HomePage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const connection = useConnectionContext();

  onMount(() => {
    appStore.setVideoAreaCount(1);
    const keyword = searchParams.k;
    if (keyword) {
      appStore.setKeyword(keyword);
      appStore.setIsKeywordFromURL(true);
    }
  });

  onCleanup(() => {
    appStore.setVideoAreaCount(2);
  });

  const handleEnter = () => {
    const keyword = appStore.keyword().trim();
    if (!keyword) {
      appStore.setStatusText('Please enter a keyword');
      return;
    }
    navigate(`/direct/${encodeURIComponent(keyword)}`);
  };

  const handleClear = () => {
    appStore.setKeyword('');
    appStore.setIsKeywordFromURL(false);
    history.replaceState(null, '', window.location.pathname);
  };

  return (
    <>
      <Header />
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

        <KeywordInput
          value={appStore.keyword()}
          onInput={appStore.setKeyword}
          readonly={appStore.isKeywordFromURL()}
        />

        <Button
          variant="outline"
          onClick={handleClear}
          disabled={appStore.keyword().length === 0}
          class="border-gray-600 text-white text-base hover:bg-gray-800 hover:border-white disabled:opacity-50"
        >
          Clear
        </Button>

        <Button
          variant="outline"
          onClick={handleEnter}
          class="border-gray-600 text-white text-base hover:bg-gray-800 hover:border-white"
        >
          Enter
        </Button>

        <IconButton
          onClick={() => appStore.setShareDialogOpen(true)}
          icon={<FiShare2 size={36} />}
        />

        <IconButton
          onClick={() => appStore.setDeviceDialogOpen(true)}
          icon={<FiSettings size={36} />}
        />

        <IconButton
          onClick={() => appStore.setHelpDialogOpen(true)}
          icon={<FiHelpCircle size={36} />}
          class="hidden md:inline-flex"
        />
      </div>
      <StatusBar variant="desktop" />
      <ChatArea
        localVideoRef={connection.setLocalVideoRef}
        showRemote={false}
      />
    </>
  );
};
