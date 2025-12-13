import { Component } from 'solid-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { appStore } from '@/store/app';
import { useTranslation } from '@/lib/i18n';

export const HelpDialog: Component = () => {
  const { t } = useTranslation();

  return (
    <Dialog open={appStore.helpDialogOpen()} onOpenChange={appStore.setHelpDialogOpen}>
      <DialogContent class="bg-neutral-900 border-gray-600 text-white max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('help')}</DialogTitle>
        </DialogHeader>

        <div class="space-y-4 text-sm leading-relaxed">
          <section>
            <h4 class="text-white font-medium mb-2">{t('about')}</h4>
            <p class="text-gray-300">{t('aboutDescription')}</p>
          </section>

          <section>
            <h4 class="text-white font-medium mb-2">{t('howToUse')}</h4>
            <ol class="list-decimal list-inside space-y-2 text-gray-300">
              <li>{t('howToUse1')}</li>
              <li>{t('howToUse2')}</li>
              <li>{t('howToUse3')}</li>
              <li>{t('howToUse4')}</li>
            </ol>
          </section>

          <section>
            <h4 class="text-white font-medium mb-2">{t('share')}</h4>
            <p class="text-gray-300">{t('shareDescription')}</p>
          </section>

          <section>
            <h4 class="text-white font-medium mb-2">{t('settings')}</h4>
            <ul class="list-disc list-inside space-y-1 text-gray-300">
              <li><span class="text-white">{t('device')}:</span> {t('deviceDescription')}</li>
              <li><span class="text-white">{t('fps')}:</span> {t('fpsDescription')}</li>
            </ul>
          </section>

          <section>
            <h4 class="text-white font-medium mb-2">{t('notes')}</h4>
            <ul class="list-disc list-inside space-y-1 text-gray-300">
              <li>{t('note1')}</li>
              <li>{t('note2')}</li>
            </ul>
          </section>

          <p class="text-center text-xs text-gray-500 pt-4">{t('copyright')}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
