import { Component, Show } from 'solid-js';
import { VideoContainer } from './VideoContainer';
import { StatusBar } from './StatusBar';
import { appStore } from '@/store/app';

interface ChatAreaProps {
  localVideoRef?: (el: HTMLVideoElement) => void;
  remoteVideoRef?: (el: HTMLVideoElement) => void;
  showRemote?: boolean;
}

const AA_FONT_SIZE = 'var(--aa-font-size, 10px)';

export const ChatArea: Component<ChatAreaProps> = (props) => {
  const showRemote = () => props.showRemote !== false;

  return (
    <div class="chat-area flex flex-col md:flex-row items-center md:items-start justify-center gap-0 md:gap-5 mx-0 md:mx-1 px-0.5 md:px-0 h-[calc(var(--actual-vh,100vh)-100px)] md:h-[calc(100vh-120px)] overflow-hidden md:overflow-y-auto overscroll-none bg-neutral-900 md:bg-transparent">
      <Show when={showRemote()}>
        <VideoContainer
          title="Peer"
          asciiContent={appStore.remoteAscii()}
          audioLevel={appStore.remoteAudioLevel}
          fontSize={AA_FONT_SIZE}
          muted={false}
          videoRef={props.remoteVideoRef}
        />

        <StatusBar variant="mobile" />
      </Show>

      <VideoContainer
        title="You"
        asciiContent={appStore.localAscii()}
        audioLevel={appStore.localAudioLevel}
        fontSize={AA_FONT_SIZE}
        muted={true}
        videoRef={props.localVideoRef}
      />
    </div>
  );
};
