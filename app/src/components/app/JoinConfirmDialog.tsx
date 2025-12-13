import { Component } from 'solid-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface JoinConfirmDialogProps {
  open: boolean;
  keyword: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const JoinConfirmDialog: Component<JoinConfirmDialogProps> = (props) => {
  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onCancel()}>
      <DialogContent class="bg-neutral-900 border-gray-600 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>Join Room</DialogTitle>
        </DialogHeader>

        <div class="space-y-4 text-sm leading-relaxed">
          <p class="text-gray-300">
            You are about to join a video chat room with keyword:
          </p>

          <p class="text-center text-lg font-mono text-white bg-neutral-800 px-4 py-2 rounded">
            {props.keyword}
          </p>

          <p class="text-gray-300">
            Anyone who accesses the same URL will be connected to you.
            Your camera and microphone will be activated.
          </p>

          <div class="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={props.onCancel}
              class="border-gray-600 text-white hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={props.onConfirm}
              class="bg-white text-black hover:bg-gray-200"
            >
              Join
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
