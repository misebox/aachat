import { Component, Show } from 'solid-js';
import { appStore } from '@/store/app';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

interface StatusBarProps {
  variant?: 'desktop' | 'mobile';
}

export const StatusBar: Component<StatusBarProps> = (props) => {
  const variant = () => props.variant ?? 'desktop';

  const baseClass = 'text-center text-sm';
  const desktopClass = 'hidden md:block py-1';
  const mobileClass =
    'md:hidden flex items-center justify-center bg-black/80 border border-gray-700 rounded px-3 py-2 text-xs min-h-[36px]';

  return (
    <div class={`${baseClass} ${variant() === 'desktop' ? desktopClass : mobileClass}`}>
      <span class="mr-5 text-white">{appStore.statusText()}</span>
      <Show when={appStore.isConnected()}>
        <span class="text-yellow-400">{formatTime(appStore.elapsedTime())}</span>
      </Show>
    </div>
  );
};
