import { Component, createSignal, createEffect, For } from 'solid-js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DeviceSelector } from './DeviceSelector';
import { appStore } from '@/store/app';
import { useTranslation, type Language } from '@/lib/i18n';

const FPS_OPTIONS = [5, 10, 30, 60] as const;

interface DeviceDialogProps {
  onRefresh: () => Promise<void>;
  onApply: (videoDeviceId: string, audioDeviceId: string, fps: number) => void;
}

export const DeviceDialog: Component<DeviceDialogProps> = (props) => {
  const { t, language, setLanguage } = useTranslation();
  const [tempVideoDevice, setTempVideoDevice] = createSignal('');
  const [tempAudioDevice, setTempAudioDevice] = createSignal('');
  const [tempFps, setTempFps] = createSignal(30);

  // When dialog opens, refresh devices and sync current selection
  createEffect(() => {
    if (appStore.deviceDialogOpen()) {
      // Sync current selection first
      setTempVideoDevice(appStore.selectedVideoDevice());
      setTempAudioDevice(appStore.selectedAudioDevice());
      setTempFps(appStore.fps());
      // Then refresh device list
      props.onRefresh();
    }
  });

  // Sync when selected device or device list changes
  createEffect(() => {
    if (!appStore.deviceDialogOpen()) return;

    const videoId = appStore.selectedVideoDevice();
    const videoDevices = appStore.videoDevices();

    if (videoId) {
      setTempVideoDevice(videoId);
    } else if (videoDevices.length > 0 && !tempVideoDevice()) {
      // Default to first device if no selection
      setTempVideoDevice(videoDevices[0].deviceId);
    }
  });

  createEffect(() => {
    if (!appStore.deviceDialogOpen()) return;

    const audioId = appStore.selectedAudioDevice();
    const audioDevices = appStore.audioDevices();

    if (audioId) {
      setTempAudioDevice(audioId);
    } else if (audioDevices.length > 0 && !tempAudioDevice()) {
      // Default to first device if no selection
      setTempAudioDevice(audioDevices[0].deviceId);
    }
  });

  const handleApply = () => {
    props.onApply(tempVideoDevice(), tempAudioDevice(), tempFps());
    appStore.setDeviceDialogOpen(false);
  };

  return (
    <Dialog open={appStore.deviceDialogOpen()} onOpenChange={appStore.setDeviceDialogOpen}>
      <DialogContent class="bg-neutral-900 border-gray-600 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>{t('settings')}</DialogTitle>
        </DialogHeader>

        <div class="space-y-6 py-4">
          {/* Device Section */}
          <div class="space-y-3">
            <h3 class="text-base uppercase tracking-wider text-gray-500">{t('device')}</h3>
            <DeviceSelector
              label={t('video')}
              value={tempVideoDevice()}
              onChange={setTempVideoDevice}
              devices={appStore.videoDevices()}
            />
            <DeviceSelector
              label={t('audio')}
              value={tempAudioDevice()}
              onChange={setTempAudioDevice}
              devices={appStore.audioDevices()}
            />
          </div>

          {/* Quality Section */}
          <div class="space-y-3">
            <h3 class="text-base uppercase tracking-wider text-gray-500">{t('quality')}</h3>
            <div class="space-y-1">
              <label class="text-sm text-gray-300">{t('fps')}</label>
              <div class="flex gap-2">
                <For each={FPS_OPTIONS}>
                  {(fps) => (
                    <button
                      type="button"
                      class={`flex-1 px-3 py-2 rounded text-sm transition-colors ${
                        tempFps() === fps
                          ? 'bg-white text-black'
                          : 'bg-gray-800 text-white hover:bg-gray-700'
                      }`}
                      onClick={() => setTempFps(fps)}
                    >
                      {fps}
                    </button>
                  )}
                </For>
              </div>
            </div>
          </div>

          {/* UI Section */}
          <div class="space-y-3">
            <h3 class="text-base uppercase tracking-wider text-gray-500">{t('ui')}</h3>
            <div class="space-y-2">
              <label class="text-sm text-white">{t('language')}</label>
              <Select
                value={language()}
                onChange={(value) => value && setLanguage(value as Language)}
                options={['en', 'ja'] as Language[]}
                itemComponent={(itemProps) => (
                  <SelectItem item={itemProps.item}>
                    {itemProps.item.rawValue === 'en' ? t('english') : t('japanese')}
                  </SelectItem>
                )}
              >
                <SelectTrigger class="bg-transparent border-gray-600 text-white">
                  <SelectValue<Language>>
                    {(state) => {
                      const selected = state.selectedOption();
                      if (selected === 'en') return t('english');
                      if (selected === 'ja') return t('japanese');
                      return t('language');
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent class="bg-neutral-800 border-gray-600" />
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter class="flex flex-row gap-2">
          <Button
            variant="outline"
            onClick={props.onRefresh}
            class="flex-1 border-gray-600 text-white hover:bg-gray-800"
          >
            {t('refresh')}
          </Button>
          <Button onClick={handleApply} class="flex-1 bg-white text-black hover:bg-gray-200">
            {t('apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
