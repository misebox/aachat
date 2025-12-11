import { Component, JSX } from 'solid-js';
import { Button } from '@/components/ui/button';

interface IconButtonProps {
  onClick: () => void;
  icon: JSX.Element;
  class?: string;
}

export const IconButton: Component<IconButtonProps> = (props) => {
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={props.onClick}
      class={`border-gray-600 text-white hover:bg-gray-800 hover:border-white rounded-full w-12 h-12 [&_svg]:size-auto ${props.class ?? ''}`}
    >
      {props.icon}
    </Button>
  );
};
