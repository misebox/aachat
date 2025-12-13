import { Component } from 'solid-js';
import { AsciiDisplay } from './AsciiDisplay';
import { AudioLevelIndicator } from './AudioLevelIndicator';
import { appStore } from '@/store/app';
import { AA_WIDTH, AA_HEIGHT } from '@/lib/constants';

interface VideoContainerProps {
  title: string;
  asciiContent: string;
  variant: 'local' | 'remote';
  videoRef?: (el: HTMLVideoElement) => void;
}

export const VideoContainer: Component<VideoContainerProps> = (props) => {
  return (
    <div class="video-container relative text-center shrink-0 max-w-full overflow-hidden">
      <h3 class="absolute top-1 left-1 z-10 bg-black/80 px-2 py-1 rounded text-white text-sm drop-shadow-[0_0_5px_rgba(255,255,255,0.5)] m-0 md:relative md:top-auto md:left-auto md:bg-transparent md:mb-1">
        {props.title}
      </h3>
      <div class="inline-flex items-start">
        <AsciiDisplay
          content={props.asciiContent}
          width={AA_WIDTH}
          height={AA_HEIGHT}
          variant={props.variant}
        />
        <AudioLevelIndicator
          level={props.variant === 'local' ? appStore.localAudioLevel : appStore.remoteAudioLevel}
          height={AA_HEIGHT}
          variant={props.variant}
        />
      </div>
      <video
        ref={props.videoRef}
        autoplay
        muted={props.variant === 'local'}
        class="hidden"
      />
    </div>
  );
};
