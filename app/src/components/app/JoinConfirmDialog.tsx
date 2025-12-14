import { Component } from 'solid-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

interface JoinConfirmDialogProps {
  open: boolean;
  keyword: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const JoinConfirmDialog: Component<JoinConfirmDialogProps> = (props) => {
  const { t } = useTranslation();

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onCancel()}>
      <DialogContent class="bg-neutral-900 border-gray-600 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>{t('joinRoom')}</DialogTitle>
        </DialogHeader>

        <div class="space-y-4 text-sm leading-relaxed">
          <p class="text-gray-300">{t('joinConfirmMessage')}</p>

          <p class="text-center text-lg font-mono text-white bg-neutral-800 px-4 py-2 rounded break-all">
            {props.keyword}
          </p>

          <p class="text-gray-300">{t('joinConfirmWarning')}</p>

          <div class="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={props.onCancel}
              class="border-gray-600 text-white hover:bg-gray-800"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={props.onConfirm}
              class="bg-white text-black hover:bg-gray-200"
            >
              {t('join')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
