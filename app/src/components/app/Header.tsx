import { Component, Show } from 'solid-js';
import { Button } from '@/components/ui/button';
import { APP_TITLE } from '@/lib/constants';

interface HeaderProps {
  onNavigateHome?: () => void;
  subtitle?: string;
}

export const Header: Component<HeaderProps> = (props) => {
  return (
    <header class="py-2 relative">
      {/* Left: AACHAT */}
      <h1 class="text-xl font-normal text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] pl-2">
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
            class="text-white text-xl font-normal px-2 h-auto hover:bg-gray-800 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
          >
            {APP_TITLE}
          </Button>
        </Show>
      </h1>

      {/* Center: Subtitle (DirectPage only) */}
      <Show when={props.subtitle}>
        <span class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-normal text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
          {props.subtitle}
        </span>
      </Show>
    </header>
  );
};
