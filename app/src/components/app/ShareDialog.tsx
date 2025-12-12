import { Component, Show, createMemo } from 'solid-js';
import { FiShare2, FiCopy, FiCheck } from 'solid-icons/fi';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { appStore } from '@/store/app';
import { APP_TITLE } from '@/lib/constants';
import { createSignal } from 'solid-js';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShareDialog: Component<ShareDialogProps> = (props) => {
  const [copied, setCopied] = createSignal(false);

  const directUrl = createMemo(() => {
    const keyword = appStore.keyword().trim();
    if (!keyword) return '';
    const base = window.location.origin;
    return `${base}/direct/${encodeURIComponent(keyword)}`;
  });

  const qrCodeUrl = createMemo(() => {
    const url = directUrl();
    if (!url) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  });

  const handleCopy = async () => {
    const url = directUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy');
    }
  };

  const handleShare = async () => {
    const url = directUrl();
    if (!url) return;
    try {
      await navigator.share({
        title: APP_TITLE,
        text: `Video chat with ${APP_TITLE}`,
        url: url,
      });
    } catch (err) {
      // User cancelled or not supported
      console.log('Share cancelled or not supported');
    }
  };

  const canShare = () => typeof navigator.share === 'function';

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent class="bg-neutral-900 border-gray-700 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle class="text-white">Share</DialogTitle>
        </DialogHeader>

        <Show when={directUrl()} fallback={<p class="text-gray-400">Enter a keyword first</p>}>
          <div class="flex flex-col items-center gap-4">
            {/* QR Code */}
            <div class="bg-white p-2 rounded">
              <img src={qrCodeUrl()} alt="QR Code" width={200} height={200} />
            </div>

            {/* URL */}
            <div class="w-full">
              <p class="text-xs text-gray-400 mb-1">URL</p>
              <div class="flex items-center gap-2">
                <input
                  type="text"
                  value={directUrl()}
                  readonly
                  class="flex-1 bg-neutral-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  class="border-gray-600 text-white hover:bg-gray-800"
                >
                  <Show when={copied()} fallback={<FiCopy size={16} />}>
                    <FiCheck size={16} />
                  </Show>
                </Button>
              </div>
            </div>

            {/* Share button */}
            <Show when={canShare()}>
              <Button
                variant="outline"
                onClick={handleShare}
                class="border-gray-600 text-white hover:bg-gray-800 flex items-center gap-2"
              >
                <FiShare2 size={20} />
                Share
              </Button>
            </Show>
          </div>
        </Show>
      </DialogContent>
    </Dialog>
  );
};
