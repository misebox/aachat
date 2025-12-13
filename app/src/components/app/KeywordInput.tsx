import { Component } from 'solid-js';

interface KeywordInputProps {
  value: string;
  onInput: (value: string) => void;
  onEnter: () => void;
  onValidationError?: (message: string) => void;
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
    if (original !== sanitized && props.onValidationError) {
      props.onValidationError('Only [ A-Z a-z 0-9 _ - . ] allowed');
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

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !isComposing) {
      e.preventDefault();
      props.onEnter();
    }
  };

  return (
    <input
      type="text"
      inputMode="text"
      value={props.value}
      onInput={handleInput}
      onKeyDown={handleKeyDown}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      placeholder={props.placeholder ?? 'keyword'}
      readonly={props.readonly}
      disabled={props.disabled}
      class="px-3 py-2 bg-transparent border border-gray-600 text-white font-mono text-base flex-1 min-w-0 max-w-[30ch] focus:outline-none focus:border-white disabled:opacity-50 disabled:cursor-not-allowed"
    />
  );
};
