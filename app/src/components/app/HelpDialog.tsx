import { Component } from 'solid-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { appStore } from '@/store/app';

export const HelpDialog: Component = () => {
  return (
    <Dialog open={appStore.helpDialogOpen()} onOpenChange={appStore.setHelpDialogOpen}>
      <DialogContent class="bg-neutral-900 border-gray-600 text-white max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Help</DialogTitle>
        </DialogHeader>

        <div class="space-y-4 text-sm leading-relaxed">
          <section>
            <h4 class="text-white font-medium mb-2">About</h4>
            <p class="text-gray-300">
              Real-time video chat app that converts video to ASCII art.
            </p>
          </section>

          <section>
            <h4 class="text-white font-medium mb-2">How to Use</h4>
            <ol class="list-decimal list-inside space-y-2 text-gray-300">
              <li>Enter a keyword and click Enter to join the room</li>
              <li>Share the URL with your peer</li>
              <li>Anyone with the same URL can join the call</li>
              <li>Click Leave to end the call</li>
            </ol>
          </section>

          <section>
            <h4 class="text-white font-medium mb-2">Share</h4>
            <p class="text-gray-300">
              Click the Share button to copy the current URL. Send it to your peer - they can join by opening the link directly.
            </p>
          </section>

          <section>
            <h4 class="text-white font-medium mb-2">Settings</h4>
            <ul class="list-disc list-inside space-y-1 text-gray-300">
              <li><span class="text-white">Device:</span> Switch camera and microphone</li>
              <li><span class="text-white">FPS:</span> Adjust display refresh rate (lower = less CPU)</li>
            </ul>
          </section>

          <section>
            <h4 class="text-white font-medium mb-2">Notes</h4>
            <ul class="list-disc list-inside space-y-1 text-gray-300">
              <li>Camera and microphone permission required</li>
              <li>Use a unique keyword to avoid conflicts</li>
            </ul>
          </section>

          <p class="text-center text-xs text-gray-500 pt-4">misebox 2025.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
