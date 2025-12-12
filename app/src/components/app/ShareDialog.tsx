import { Component, Show, createMemo, createEffect, createSignal } from 'solid-js';
import { FiShare2, FiCopy, FiCheck } from 'solid-icons/fi';
import QRCode from 'qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { appStore } from '@/store/app';
import { APP_TITLE } from '@/lib/constants';

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ShareDialog: Component<ShareDialogProps> = (props) => {
  const [copied, setCopied] = createSignal(false);
  const [qrDataUrl, setQrDataUrl] = createSignal('');

  const directUrl = createMemo(() => {
    const keyword = appStore.keyword().trim();
    if (!keyword) return '';
    const base = window.location.origin;
    return `${base}/direct/${encodeURIComponent(keyword)}`;
  });

  // Generate QR code locally
  createEffect(() => {
    const url = directUrl();
    if (!url) {
      setQrDataUrl('');
      return;
    }
    QRCode.toDataURL(url, { width: 200, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''));
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
            <Show when={qrDataUrl()}>
              <div class="bg-white p-2 rounded">
                <img src={qrDataUrl()} alt="QR Code" width={200} height={200} />
              </div>
            </Show>

            {/* URL */}
            <div class="w-full">
              <p class="text-xs text-gray-400 mb-1">URL</p>
              <div class="flex flex-col gap-2">
                <div class="bg-neutral-800 border border-gray-600 rounded px-2 py-2 text-sm text-white break-all">
                  {directUrl()}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  class="border-gray-600 text-white hover:bg-gray-800 self-end flex items-center gap-1"
                >
                  <Show when={copied()} fallback={<><FiCopy size={16} /> Copy</>}>
                    <FiCheck size={16} /> Copied
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
