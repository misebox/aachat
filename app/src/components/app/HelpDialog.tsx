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
            <h4 class="text-white font-medium mb-2">About AA Phone</h4>
            <p class="text-gray-300">
              Real-time video chat app that converts video to ASCII art.
            </p>
            <p class="text-gray-300">
              Users with the same keyword can connect.
            </p>
          </section>

          <section>
            <h4 class="text-white font-medium mb-2">How to Start</h4>
            <ol class="list-decimal list-inside space-y-2 text-gray-300">
              <li>
                <strong class="text-white">Host:</strong>
                <ul class="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>Enter a keyword (or use auto-generated)</li>
                  <li>Click &quot;Connect&quot;</li>
                  <li>Share keyword with peer</li>
                  <li>Click &quot;Leave&quot; to end</li>
                </ul>
              </li>
              <li>
                <strong class="text-white">Guest:</strong>
                <ul class="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li>Enter keyword from host</li>
                  <li>Click &quot;Connect&quot;</li>
                  <li>Click &quot;Leave&quot; to end</li>
                  <li>Guest can rejoin after leaving</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h4 class="text-white font-medium mb-2">Notes</h4>
            <ul class="list-disc list-inside space-y-1 text-gray-300">
              <li>Guest must join within 10 minutes</li>
              <li>Camera and microphone permission required</li>
              <li>Use a unique keyword</li>
            </ul>
          </section>

          <section>
            <h4 class="text-white font-medium mb-2">Device Settings</h4>
            <p class="text-gray-300">
              Use the settings button to switch camera and microphone (available during call).
            </p>
          </section>

          <p class="text-center text-xs text-gray-500 pt-4">misebox 2025.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
