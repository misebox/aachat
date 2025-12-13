import { Component } from 'solid-js';

interface AsciiDisplayProps {
  content: string;
  width: number;
  height: number;
  variant?: 'local' | 'remote';
  border?: boolean;
}

export const AsciiDisplay: Component<AsciiDisplayProps> = (props) => {
  const variant = () => props.variant ?? 'local';
  const hasBorder = () => props.border !== false;

  // Use CSS custom properties for font sizing
  const fontSizeVar = () =>
    variant() === 'remote' ? 'var(--remote-aa-font-size, 8px)' : 'var(--aa-font-size, 10px)';

  // padding(2px) + border(2px if enabled)
  const extraWidth = () => hasBorder() ? 4 : 2;

  return (
    <pre
      class={`aa-display bg-black rounded-sm font-mono font-normal text-white whitespace-pre overflow-hidden leading-none block box-border shrink-0 ${hasBorder() ? 'border border-gray-700' : ''}`}
      style={{
        'font-size': fontSizeVar(),
        'line-height': '1em',
        'letter-spacing': `calc(${fontSizeVar()} * 0.4)`,
        width: `calc(${props.width} * ${fontSizeVar()} * 0.6 + ${props.width - 1} * ${fontSizeVar()} * 0.4 + ${extraWidth()}px)`,
        height: `calc(${props.height} * 1em)`,
        margin: '1px',
        padding: '1px',
      }}
    >
      {props.content}
    </pre>
  );
};
