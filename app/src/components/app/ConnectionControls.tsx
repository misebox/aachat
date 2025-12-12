import { Component, Show } from 'solid-js';
import { FiSettings, FiHelpCircle } from 'solid-icons/fi';
import { Button } from '@/components/ui/button';
import { KeywordInput } from './KeywordInput';
import { IconButton } from './IconButton';
import { appStore } from '@/store/app';

interface ConnectionControlsProps {
  onConnect: () => void;
  onLeave: () => void;
}

export const ConnectionControls: Component<ConnectionControlsProps> = (props) => {
  const isKeywordLocked = () =>
    appStore.isKeywordFromURL() || appStore.isConnecting() || appStore.isConnected();

  return (
    <div class="controls flex items-center justify-center gap-2 py-2 px-2 md:static md:bg-transparent md:border-none fixed bottom-0 left-0 right-0 bg-black border-t border-gray-700 z-50">
      <Show when={!appStore.isDirectMode()}>
        <KeywordInput
          value={appStore.keyword()}
          onInput={appStore.setKeyword}
          readonly={isKeywordLocked()}
        />

        <Show when={appStore.keyword().length > 0 && appStore.isIdle()}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              appStore.setKeyword('');
              appStore.setIsKeywordFromURL(false);
              // Clear URL parameter
              history.replaceState(null, '', window.location.pathname);
            }}
            class="border-gray-600 text-white hover:bg-gray-800 hover:border-white"
          >
            Clear
          </Button>
        </Show>

        <Show
          when={!appStore.isConnected() && !appStore.isConnecting()}
          fallback={
            <Button
              variant="outline"
              onClick={props.onLeave}
              class="border-gray-600 text-white hover:bg-gray-800 hover:border-white"
            >
              Leave
            </Button>
          }
        >
          <Button
            variant="outline"
            onClick={props.onConnect}
            disabled={appStore.isConnecting()}
            class="border-gray-600 fill-gray-600 text-md text-white hover:bg-gray-800 hover:border-white disabled:opacity-50"
          >
            Connect
          </Button>
        </Show>
      </Show>

      <Show when={appStore.isDirectMode() && appStore.isConnected()}>
        <Button
          variant="outline"
          onClick={props.onLeave}
          class="border-gray-600 text-white hover:bg-gray-800 hover:border-white"
        >
          Leave
        </Button>
      </Show>

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
  );
};
