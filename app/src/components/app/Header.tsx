import { Component, Show } from 'solid-js';
import { FiHelpCircle } from 'solid-icons/fi';
import { Button } from '@/components/ui/button';
import { IconButton } from './IconButton';
import { APP_TITLE } from '@/lib/constants';

interface HeaderProps {
  onNavigateHome: () => void;
  subtitle?: string;
  onHelpClick: () => void;
}

export const Header: Component<HeaderProps> = (props) => {
  return (
    <header class="relative flex items-center">
      {/* Left: AACHAT */}
      <h1 class="text-base font-normal text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] pl-2 py-0">
        <Button
          variant="ghost"
          onClick={props.onNavigateHome}
          class="text-white text-lg font-normal px-2 h-auto hover:bg-gray-800 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
        >
          {APP_TITLE}
        </Button>
      </h1>

      {/* Center: Subtitle (DirectPage only) */}
      <Show when={props.subtitle}>
        <span class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-xl font-normal text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
          {props.subtitle}
        </span>
      </Show>

      {/* Right: Help button */}
      <IconButton
        onClick={props.onHelpClick}
        icon={<FiHelpCircle size={24} />}
        class="hidden md:inline-flex absolute right-2 top-1/2 -translate-y-1/2"
      />
    </header>
  );
};
