import { Component, Show } from 'solid-js';
import { Button } from '@/components/ui/button';
import { APP_TITLE } from '@/lib/constants';

interface HeaderProps {
  onNavigateHome?: () => void;
}

export const Header: Component<HeaderProps> = (props) => {
  return (
    <header class="text-center py-2">
      <h1 class="text-xl font-normal text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
        <Show
          when={props.onNavigateHome}
          fallback={
            <a href="/" class="text-white no-underline hover:opacity-80">
              {APP_TITLE}
            </a>
          }
        >
          <Button
            variant="ghost"
            onClick={props.onNavigateHome}
            class="text-white text-xl font-normal p-0 h-auto hover:bg-transparent hover:opacity-80"
          >
            {APP_TITLE}
          </Button>
        </Show>
      </h1>
    </header>
  );
};
