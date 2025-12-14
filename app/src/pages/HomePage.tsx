import { onMount, onCleanup, Show } from 'solid-js';
import { useSearchParams, useNavigate, useLocation } from '@solidjs/router';
import { FiSettings, FiShare2, FiVideo, FiVideoOff, FiMic, FiMicOff } from 'solid-icons/fi';
import { Button } from '@/components/ui/button';
import {
  Header,
  StatusBar,
  VideoContainer,
  KeywordInput,
  IconButton,
  Typewriter,
} from '@/components/app';
import { appStore } from '@/store/app';
import { useConnectionContext } from '@/context/connection';
import { useTranslation } from '@/lib/i18n';
import { AA_HEIGHT, AA_WIDTH } from '@/lib';

export const HomePage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const connection = useConnectionContext();

  onMount(() => {
    appStore.setVideoAreaCount(1);
    // Stop camera on home page by default
    connection.stopCamera();
    const keyword = ((k) => (Array.isArray(k) ? k[0] : k))(searchParams.k);
    if (keyword) {
      appStore.setKeyword(keyword);
      appStore.setIsKeywordFromURL(true);
    }
  });

  onCleanup(() => {
    appStore.setVideoAreaCount(2);
  });

  const handleToggleCamera = () => {
    if (appStore.cameraReady()) {
      connection.stopCamera();
    } else {
      connection.startCamera();
    }
  };

  const handleEnter = () => {
    const keyword = appStore.keyword().trim();
    if (!keyword) {
      appStore.setStatusText(t('pleaseEnterKeyword'));
      return;
    }
    navigate(`/direct/${encodeURIComponent(keyword)}`);
  };

  const handleClear = () => {
    appStore.setKeyword('');
    appStore.setIsKeywordFromURL(false);
    history.replaceState(null, '', location.pathname);
  };
  
  const descriptionTagline = () => t('tagline');

  return (
    <div class="flex flex-col flex-1">
      <Header onHelpClick={() => appStore.setHelpDialogOpen(true)} />

      {/* Icon controls - PC: row 1, Mobile: footer */}
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

        <IconButton
          onClick={() => appStore.setShareDialogOpen(true)}
          icon={<FiShare2 size={36} />}
          disabled={!appStore.keyword().trim()}
        />

        <IconButton
          onClick={() => appStore.setDeviceDialogOpen(true)}
          icon={<FiSettings size={36} />}
        />
      </div>

      {/* Keyword controls - PC: row 2, Mobile: above footer */}
      <div class="flex items-center justify-center gap-2 py-2 px-2 md:static fixed bottom-[65px] left-0 right-0 bg-black md:bg-transparent z-40">
        <KeywordInput
          value={appStore.keyword()}
          onInput={appStore.setKeyword}
          onEnter={handleEnter}
          onValidationError={(msg) => {
            appStore.setStatusText(msg);
            setTimeout(() => appStore.setStatusText(''), 5000);
          }}
          readonly={appStore.isKeywordFromURL()}
        />

        <Button
          variant="outline"
          onClick={handleEnter}
          disabled={!appStore.keyword().trim()}
          class="border-gray-600 text-white text-base hover:bg-gray-800 hover:border-white disabled:opacity-50"
        >
          {t('enter')}
        </Button>

        <Button
          variant="outline"
          onClick={handleClear}
          disabled={appStore.keyword().length === 0}
          class="border-gray-600 text-white text-base hover:bg-gray-800 hover:border-white disabled:opacity-50"
        >
          {t('clear')}
        </Button>
      </div>

      <StatusBar variant="desktop" />

      {/* Main content area */}
      <div class="flex flex-col justify-start items-center gap-2 pt-4">
        <Show
          when={appStore.cameraReady()}
          fallback={
            <div class="relative text-center shrink-0 max-w-full overflow-hidden">
              <h3 class="absolute top-1 left-1 z-10 bg-black/80 px-2 py-1 rounded text-white text-sm drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] m-0 md:relative md:top-auto md:left-auto md:bg-transparent md:mb-1 invisible">
                &nbsp;
              </h3>
              <div
                class="flex items-center justify-center text-center px-4 text-gray-400"
                style={{
                  width: `calc(${AA_WIDTH} * var(--aa-font-size, 10px) * 0.6 + ${AA_WIDTH - 1} * var(--aa-font-size, 10px) * 0.4 + 4px)`,
                  height: `calc(${AA_HEIGHT}lh + 4px)`,
                  'font-size': 'var(--aa-font-size, 10px)',
                  'line-height': 'var(--aa-font-size, 10px)',
                }}
              >
                <Typewriter
                  class="text-lg md:text-xl"
                  text={descriptionTagline()}
                  speed={80}
                />
              </div>
            </div>
          }
        >
          <VideoContainer
            title={t('you')}
            asciiContent={appStore.localAscii()}
            audioLevel={appStore.localAudioLevel}
            fontSize="var(--aa-font-size, 10px)"
            muted={true}
            videoRef={connection.setLocalVideoRef}
          />
        </Show>

        <Button
          variant="outline"
          onClick={handleToggleCamera}
          class="border-gray-600 text-white hover:bg-gray-800 hover:border-white"
        >
          {appStore.cameraReady() ? t('stopTest') : t('testDevice')}
        </Button>
      </div>
    </div>
  );
};
