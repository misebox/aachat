import { Component, createMemo } from 'solid-js';
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
}

export const DeviceSelector: Component<DeviceSelectorProps> = (props) => {
  // Reactive map of deviceId -> label
  const deviceLabels = createMemo(() => {
    const map = new Map<string, string>();
    props.devices.forEach((d, i) => {
      map.set(d.deviceId, d.label || `${props.label} ${i + 1}`);
    });
    return map;
  });

  const options = createMemo(() => props.devices.map((d) => d.deviceId));

  // Reactive current label
  const currentLabel = createMemo(() => {
    const labels = deviceLabels();
    return labels.get(props.value) ?? props.label;
  });

  return (
    <div class="space-y-2">
      <label class="text-sm text-white">{props.label}</label>
      <Select
        value={props.value}
        onChange={value => props.onChange(value ?? '')}
        options={options()}
        itemComponent={(itemProps) => (
          <SelectItem item={itemProps.item}>
            {deviceLabels().get(itemProps.item.rawValue) ?? itemProps.item.rawValue}
          </SelectItem>
        )}
      >
        <SelectTrigger class="bg-transparent border-gray-600 text-white">
          <SelectValue<string>>
            {(state) => {
              const selected = state.selectedOption();
              if (selected == null) return currentLabel();
              return deviceLabels().get(selected) ?? currentLabel();
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent class="bg-neutral-800 border-gray-600" />
      </Select>
    </div>
  );
};
