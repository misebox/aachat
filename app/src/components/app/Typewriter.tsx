import { Component, createSignal, createEffect, createMemo, onCleanup } from 'solid-js';

interface TypewriterProps {
  text: string;
  speed?: number;
  class?: string;
}

export const Typewriter: Component<TypewriterProps> = (props) => {
  const [displayedLength, setDisplayedLength] = createSignal(0);

  const lineCount = createMemo(() => props.text.split('\n').length);

  createEffect(() => {
    const text = props.text;
    setDisplayedLength(0);

    const speed = props.speed ?? 50;
    const timer = setInterval(() => {
      setDisplayedLength((prev) => {
        if (prev >= text.length) {
          clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, speed);

    onCleanup(() => clearInterval(timer));
  });

  return (
    <div
      class={`whitespace-pre-wrap ${props.class ?? ''}`}
      style={{ height: `${lineCount() * 1.5}em` }}
    >
      {props.text.slice(0, displayedLength())}
      <span class="animate-pulse">|</span>
    </div>
  );
};
