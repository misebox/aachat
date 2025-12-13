import { Component, Accessor } from 'solid-js';
import { AsciiDisplay } from './AsciiDisplay';
import { ASCII_CHARS } from '@/lib/constants';

interface AudioLevelIndicatorProps {
  level: Accessor<number>;
  height: number;
  fontSize: string;
}

export const AudioLevelIndicator: Component<AudioLevelIndicatorProps> = (props) => {
  // Generate ASCII content for the level meter
  const generateContent = () => {
    const level = props.level();
    const height = props.height;
    const charCount = ASCII_CHARS.length;

    // Character index based on level (100% divided by character count)
    // Level 0 → index 0, Level 100 → index charCount-1
    const charIndex = Math.min(
      charCount - 1,
      Math.floor((level / 100) * charCount)
    );
    const filledChar = ASCII_CHARS[charIndex];

    // Number of filled rows based on level
    const filledRows = Math.round((level / 100) * height);

    const rows: string[] = [];
    // Build from top to bottom
    for (let i = 0; i < height; i++) {
      const rowFromBottom = height - 1 - i;
      if (rowFromBottom < filledRows) {
        rows.push(filledChar);
      } else {
        rows.push(ASCII_CHARS[0]); // Empty (space)
      }
    }
    return rows.join('\n');
  };

  return (
    <AsciiDisplay
      content={generateContent()}
      width={1}
      height={props.height}
      fontSize={props.fontSize}
      border={false}
    />
  );
};
