import { Component } from 'solid-js';
import { APP_TITLE } from '@/lib/constants';

export const Header: Component = () => {
  return (
    <header class="text-center py-2">
      <h1 class="text-xl font-normal text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
        <a href="/" class="text-white no-underline hover:opacity-80">
          {APP_TITLE}
        </a>
      </h1>
    </header>
  );
};
