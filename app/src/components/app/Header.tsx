import { Component, Show } from 'solid-js';
import { FiHelpCircle } from 'solid-icons/fi';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { IconButton } from './IconButton';
import { APP_TITLE } from '@/lib/constants';

interface HeaderProps {
  onNavigateHome?: () => void;
  subtitle?: string;
  onHelpClick?: () => void;
}

export const Header: Component<HeaderProps> = (props) => {
  return (
    <header class="relative flex items-center">
      {/* Left: AACHAT */}
      <h1 class="text-base font-normal text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] pl-2 py-0">
        <Button
          variant="ghost"
          onClick={props.onNavigateHome ?? (() => {})}
          class="text-white text-lg font-normal px-2 h-auto hover:bg-gray-800 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
        >
          {APP_TITLE}
        </Button>
      </h1>

      {/* Center: Subtitle (DirectPage only) */}
      <Show when={props.subtitle}>
        <Popover>
          <PopoverTrigger
            as={Button}
            variant="ghost"
            class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-base font-normal text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] max-w-[40vw] h-auto px-2 hover:bg-gray-800"
          >
            <span class="truncate block">{props.subtitle}</span>
          </PopoverTrigger>
          <PopoverContent class="bg-neutral-900 border-gray-600 text-white font-mono break-all max-w-[80vw] w-auto">
            {props.subtitle}
          </PopoverContent>
        </Popover>
      </Show>

      {/* Right: Help button */}
      <Show when={props.onHelpClick}>
        {(handler) => (
          <IconButton
            onClick={handler()}
            icon={<FiHelpCircle size={24} />}
            class="hidden md:inline-flex absolute right-2 top-1/2 -translate-y-1/2"
          />
        )}
      </Show>
    </header>
  );
};
