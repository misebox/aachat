import { Component } from 'solid-js';
import { appStore } from '@/store/app';

interface KeywordInputProps {
  value: string;
  onInput: (value: string) => void;
  placeholder?: string;
  readonly?: boolean;
  disabled?: boolean;
}

const sanitize = (value: string) => value.replace(/[^A-Za-z0-9_\-.]/g, '');

export const KeywordInput: Component<KeywordInputProps> = (props) => {
  let isComposing = false;

  const applyValue = (target: HTMLInputElement) => {
    const original = target.value;
    const sanitized = sanitize(original);
    if (original !== sanitized) {
      appStore.setStatusText('Only [ A-Z a-z 0-9 _ - . ] allowed');
      setTimeout(() => appStore.setStatusText(''), 5000);
    }
    props.onInput(sanitized);
    target.value = sanitized;
  };

  const handleInput = (e: Event) => {
    if (isComposing) return;
    applyValue(e.target as HTMLInputElement);
  };

  const handleCompositionStart = () => {
    isComposing = true;
  };

  const handleCompositionEnd = (e: CompositionEvent) => {
    isComposing = false;
    applyValue(e.target as HTMLInputElement);
  };

  return (
    <input
      type="text"
      inputmode="latin"
      value={props.value}
      onInput={handleInput}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      placeholder={props.placeholder ?? 'keyword'}
      readonly={props.readonly}
      disabled={props.disabled}
      class="px-3 py-2 bg-transparent border border-gray-600 text-white font-mono text-base flex-1 min-w-0 max-w-[30ch] focus:outline-none focus:border-white disabled:opacity-50 disabled:cursor-not-allowed"
    />
  );
};
