import { Component } from 'solid-js';

interface KeywordInputProps {
  value: string;
  onInput: (value: string) => void;
  placeholder?: string;
  readonly?: boolean;
  disabled?: boolean;
}

export const KeywordInput: Component<KeywordInputProps> = (props) => {
  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    props.onInput(target.value);
  };

  return (
    <input
      type="text"
      value={props.value}
      onInput={handleInput}
      placeholder={props.placeholder ?? 'keyword'}
      readonly={props.readonly}
      disabled={props.disabled}
      class="px-3 py-2 bg-transparent border border-gray-600 text-white font-mono text-base flex-1 min-w-0 max-w-[200px] md:max-w-none md:w-auto focus:outline-none focus:border-white disabled:opacity-50 disabled:cursor-not-allowed"
    />
  );
};
