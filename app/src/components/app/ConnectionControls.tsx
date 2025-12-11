import { Component, Show } from 'solid-js';
import { Settings, HelpCircle } from 'lucide-solid';
import { Button } from '@/components/ui/button';
import { KeywordInput } from './KeywordInput';
import { IconButton } from './IconButton';
import { appStore } from '@/store/app';

interface ConnectionControlsProps {
  onConnect: () => void;
  onLeave: () => void;
}

export const ConnectionControls: Component<ConnectionControlsProps> = (props) => {
  return (
    <div class="flex items-center justify-center gap-2 py-2 px-2 md:static md:bg-transparent md:border-none fixed bottom-0 left-0 right-0 bg-black border-t border-gray-700 z-50">
      <KeywordInput
        value={appStore.keyword()}
        onInput={appStore.setKeyword}
      />

      <Show when={appStore.keyword().length > 0 && appStore.isIdle()}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => appStore.setKeyword('')}
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
          class="border-gray-600 text-white hover:bg-gray-800 hover:border-white disabled:opacity-50"
        >
          Connect
        </Button>
      </Show>

      <IconButton
        onClick={() => appStore.setDeviceDialogOpen(true)}
        icon={<Settings class="w-4 h-4" />}
        class="hidden md:inline-flex"
      />

      <IconButton
        onClick={() => appStore.setHelpDialogOpen(true)}
        icon={<HelpCircle class="w-4 h-4" />}
        class="hidden md:inline-flex"
      />
    </div>
  );
};
