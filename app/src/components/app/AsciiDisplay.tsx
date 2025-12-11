import { Component } from 'solid-js';

interface AsciiDisplayProps {
  content: string;
  variant?: 'local' | 'remote';
}

export const AsciiDisplay: Component<AsciiDisplayProps> = (props) => {
  const variant = () => props.variant ?? 'local';

  // Use CSS custom properties for font sizing
  // Desktop: 10px, Mobile remote: 8px, Mobile local: 4px
  const fontSizeVar = () =>
    variant() === 'remote' ? 'var(--remote-aa-font-size, 8px)' : 'var(--aa-font-size, 10px)';

  return (
    <pre
      class="aa-display bg-black border border-gray-700 rounded-sm p-0 m-0 mx-auto font-mono font-normal text-white whitespace-pre overflow-hidden leading-none block box-border"
      style={{
        'font-size': fontSizeVar(),
        'letter-spacing': `calc(${fontSizeVar()} * 0.4)`,
        width: `calc(80 * ${fontSizeVar()} * 0.6 + 79 * ${fontSizeVar()} * 0.4)`,
        height: `calc(60 * ${fontSizeVar()})`,
        'max-width': '100%',
        'max-height': '100%',
      }}
    >
      {props.content}
    </pre>
  );
};
