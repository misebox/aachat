import { Component } from 'solid-js';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MediaDevice } from '@/types';

interface DeviceSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  devices: MediaDevice[];
  placeholder?: string;
}

export const DeviceSelector: Component<DeviceSelectorProps> = (props) => {
  return (
    <div class="space-y-2">
      <label class="text-sm text-white">{props.label}</label>
      <Select
        value={props.value}
        onChange={props.onChange}
        options={props.devices.map((d) => d.deviceId)}
        placeholder={props.placeholder ?? `Select ${props.label.toLowerCase()}`}
        itemComponent={(itemProps) => (
          <SelectItem item={itemProps.item}>
            {props.devices.find((d) => d.deviceId === itemProps.item.rawValue)?.label ||
              itemProps.item.rawValue}
          </SelectItem>
        )}
      >
        <SelectTrigger class="bg-transparent border-gray-600 text-white">
          <SelectValue<string>>
            {(state) =>
              props.devices.find((d) => d.deviceId === state.selectedOption())?.label ||
              state.selectedOption()
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent class="bg-neutral-800 border-gray-600" />
      </Select>
    </div>
  );
};
