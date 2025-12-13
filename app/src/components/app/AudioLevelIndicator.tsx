import { Component, Accessor } from 'solid-js';
import { AA_HEIGHT } from '@/lib/constants';

interface AudioLevelIndicatorProps {
  level: Accessor<number>;
  variant?: 'local' | 'remote';
}

export const AudioLevelIndicator: Component<AudioLevelIndicatorProps> = (props) => {
  const variant = () => props.variant ?? 'local';
  const fontSizeVar = () =>
    variant() === 'remote' ? 'var(--remote-aa-font-size, 8px)' : 'var(--aa-font-size, 10px)';

  return (
    <div
      class="audio-level-indicator flex flex-col-reverse w-1.5 bg-gray-800 rounded-sm overflow-hidden"
      style={{ height: `calc(${AA_HEIGHT} * ${fontSizeVar()})` }}
    >
      <div
        class="transition-all duration-75 ease-out w-full"
        style={{
          height: `${props.level()}%`,
          'background': props.level() > 80
            ? '#ef4444'
            : props.level() > 50
            ? '#eab308'
            : '#22c55e',
        }}
      />
    </div>
  );
};
