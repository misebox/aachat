import { Component, createSignal, createEffect, onCleanup } from 'solid-js';

// AACHAT in block characters (█ and space) - taller version
const AACHAT_ASCII_LINES = [
  ' █████   █████    ██████  ██   ██   █████   ████████',
  ' █████   █████    ██████  ██   ██   █████   ████████',
  '██   ██ ██   ██  ██       ██   ██  ██   ██     ██   ',
  '██   ██ ██   ██  ██       ██   ██  ██   ██     ██   ',
  '███████ ███████  ██       ███████  ███████     ██   ',
  '███████ ███████  ██       ███████  ███████     ██   ',
  '██   ██ ██   ██  ██       ██   ██  ██   ██     ██   ',
  '██   ██ ██   ██  ██       ██   ██  ██   ██     ██   ',
  '██   ██ ██   ██   ██████  ██   ██  ██   ██     ██   ',
  '██   ██ ██   ██   ██████  ██   ██  ██   ██     ██   ',
];
const AACHAT_ASCII = AACHAT_ASCII_LINES.join('\n');

interface AsciiTitleProps {
  tagline: string;
  speed?: number;
  class?: string;
}

export const AsciiTitle: Component<AsciiTitleProps> = (props) => {
  const [displayedLength, setDisplayedLength] = createSignal(0);
  const [asciiOpacity, setAsciiOpacity] = createSignal(1);

  createEffect(() => {
    const text = props.tagline;
    setDisplayedLength(0);
    setAsciiOpacity(1);

    const speed = props.speed ?? 80;
    const timer = setInterval(() => {
      setDisplayedLength((prev) => {
        if (prev >= text.length) {
          clearInterval(timer);
          return prev;
        }
        const newLen = prev + 1;
        // Fade out the ASCII art as the typewriter progresses
        const progress = newLen / text.length;
        setAsciiOpacity(Math.max(0, 1 - progress * 0.8));
        return newLen;
      });
    }, speed);

    onCleanup(() => clearInterval(timer));
  });

  return (
    <div class={`relative overflow-hidden ${props.class ?? ''}`}>
      {/* ASCII Art Background - large and centered */}
      <pre
        class="font-mono text-white select-none transition-opacity duration-300"
        style={{
          'font-size': 'clamp(8px, 2.5vw, 16px)',
          'line-height': '1.4',
          'letter-spacing': '0',
          opacity: asciiOpacity(),
        }}
      >
        {AACHAT_ASCII}
      </pre>

      {/* Typewriter Tagline - overlaid on top */}
      <div
        class="absolute inset-0 flex items-center justify-center overflow-hidden p-2"
      >
        <div class="text-white text-base md:text-lg whitespace-pre-wrap bg-black/60 px-3 py-1 rounded max-w-full text-center">
          {props.tagline.slice(0, displayedLength())}
          <span class="animate-pulse">|</span>
        </div>
      </div>
    </div>
  );
};
