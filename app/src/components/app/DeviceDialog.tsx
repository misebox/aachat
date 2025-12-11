import { Component, createSignal, createEffect } from 'solid-js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DeviceSelector } from './DeviceSelector';
import { appStore } from '@/store/app';

interface DeviceDialogProps {
  onRefresh: () => Promise<void>;
  onApply: (videoDeviceId: string, audioDeviceId: string) => void;
}

export const DeviceDialog: Component<DeviceDialogProps> = (props) => {
  const [tempVideoDevice, setTempVideoDevice] = createSignal('');
  const [tempAudioDevice, setTempAudioDevice] = createSignal('');

  // When dialog opens, refresh devices and sync current selection
  createEffect(() => {
    if (appStore.deviceDialogOpen()) {
      // Sync current selection first
      setTempVideoDevice(appStore.selectedVideoDevice());
      setTempAudioDevice(appStore.selectedAudioDevice());
      // Then refresh device list
      props.onRefresh();
    }
  });

  // Sync when selected device changes (e.g., after camera starts)
  createEffect(() => {
    if (appStore.deviceDialogOpen()) {
      const videoId = appStore.selectedVideoDevice();
      if (videoId && !tempVideoDevice()) {
        setTempVideoDevice(videoId);
      }
    }
  });

  createEffect(() => {
    if (appStore.deviceDialogOpen()) {
      const audioId = appStore.selectedAudioDevice();
      if (audioId && !tempAudioDevice()) {
        setTempAudioDevice(audioId);
      }
    }
  });

  const handleApply = () => {
    props.onApply(tempVideoDevice(), tempAudioDevice());
    appStore.setDeviceDialogOpen(false);
  };

  return (
    <Dialog open={appStore.deviceDialogOpen()} onOpenChange={appStore.setDeviceDialogOpen}>
      <DialogContent class="bg-neutral-900 border-gray-600 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Device Settings</DialogTitle>
        </DialogHeader>

        <div class="space-y-4 py-4">
          <DeviceSelector
            label="Video"
            value={tempVideoDevice()}
            onChange={setTempVideoDevice}
            devices={appStore.videoDevices()}
          />
          <DeviceSelector
            label="Audio"
            value={tempAudioDevice()}
            onChange={setTempAudioDevice}
            devices={appStore.audioDevices()}
          />
        </div>

        <DialogFooter class="gap-2">
          <Button
            variant="outline"
            onClick={props.onRefresh}
            class="border-gray-600 text-white hover:bg-gray-800"
          >
            Refresh
          </Button>
          <Button onClick={handleApply} class="bg-white text-black hover:bg-gray-200">
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
