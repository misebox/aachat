import { Component } from 'solid-js';
import { AA_WIDTH, AA_HEIGHT } from '@/lib/constants';

interface AsciiDisplayProps {
  content: string;
  variant?: 'local' | 'remote';
}

export const AsciiDisplay: Component<AsciiDisplayProps> = (props) => {
  const variant = () => props.variant ?? 'local';

  // Use CSS custom properties for font sizing
  const fontSizeVar = () =>
    variant() === 'remote' ? 'var(--remote-aa-font-size, 8px)' : 'var(--aa-font-size, 10px)';

  return (
    <pre
      class="aa-display bg-black border border-gray-700 rounded-sm p-0 m-0 mx-auto font-mono font-normal text-white whitespace-pre overflow-hidden leading-none block box-border"
      style={{
        'font-size': fontSizeVar(),
        'line-height': '1em',
        'letter-spacing': `calc(${fontSizeVar()} * 0.4)`,
        width: `calc(${AA_WIDTH} * ${fontSizeVar()} * 0.6 + ${AA_WIDTH - 1} * ${fontSizeVar()} * 0.4)`,
        height: `calc(${AA_HEIGHT} * 1em)`,
        'max-width': '100%',
      }}
    >
      {props.content}
    </pre>
  );
};
