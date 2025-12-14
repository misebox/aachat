import { Component } from 'solid-js';

interface AsciiDisplayProps {
  content: string;
  width: number;
  height: number;
  fontSize: string;
  border?: boolean;
}

export const AsciiDisplay: Component<AsciiDisplayProps> = (props) => {
  const hasBorder = () => props.border !== false;
  const fontSize = () => props.fontSize;

  // padding(2px) + border(2px if enabled)
  const extraSize = () => hasBorder() ? 4 : 2;

  return (
    <pre
      class={`aa-display bg-gray-950 rounded-sm font-mono text-white whitespace-pre overflow-hidden leading-none block box-border ${hasBorder() ? 'border border-gray-700' : ''}`}
      style={{
        'font-size': fontSize(),
        'line-height': fontSize(),
        'letter-spacing': `calc(${fontSize()} * 0.4)`,
        width: `calc(${props.width} * ${fontSize()} * 0.6 + ${props.width - 1} * ${fontSize()} * 0.4 + ${extraSize()}px)`,
        height: `calc(${props.height}lh + ${extraSize()}px)`,
        margin: '1px',
        padding: '1px',
      }}
    >
      {props.content}
    </pre>
  );
};
