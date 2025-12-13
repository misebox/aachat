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
  const extraWidth = () => hasBorder() ? 4 : 2;

  return (
    <pre
      class={`aa-display bg-black rounded-sm font-mono font-normal text-white whitespace-pre overflow-hidden leading-none block box-border shrink-0 ${hasBorder() ? 'border border-gray-700' : ''}`}
      style={{
        'font-size': fontSize(),
        'line-height': '1em',
        'letter-spacing': `calc(${fontSize()} * 0.4)`,
        width: `calc(${props.width} * ${fontSize()} * 0.6 + ${props.width - 1} * ${fontSize()} * 0.4 + ${extraWidth()}px)`,
        height: `calc(${props.height} * 1em)`,
        margin: '1px',
        padding: '1px',
      }}
    >
      {props.content}
    </pre>
  );
};
