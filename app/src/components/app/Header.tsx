import { Component, Show } from 'solid-js';
import { Button } from '@/components/ui/button';
import { APP_TITLE } from '@/lib/constants';

interface HeaderProps {
  onNavigateHome?: () => void;
  subtitle?: string;
}

export const Header: Component<HeaderProps> = (props) => {
  const title = () => props.subtitle ? `${APP_TITLE} - ${props.subtitle}` : APP_TITLE;

  return (
    <header class="text-center py-2">
      <h1 class="text-xl font-normal text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
        <Show
          when={props.onNavigateHome}
          fallback={
            <a href="/" class="text-white no-underline hover:opacity-80">
              {title()}
            </a>
          }
        >
          <Button
            variant="ghost"
            onClick={props.onNavigateHome}
            class="text-white text-xl font-normal p-0 h-auto hover:bg-transparent hover:opacity-80"
          >
            {title()}
          </Button>
        </Show>
      </h1>
    </header>
  );
};
