import { Component } from 'solid-js';
import { VideoContainer } from './VideoContainer';
import { StatusBar } from './StatusBar';
import { appStore } from '@/store/app';

interface ChatAreaProps {
  localVideoRef?: (el: HTMLVideoElement) => void;
  remoteVideoRef?: (el: HTMLVideoElement) => void;
}

export const ChatArea: Component<ChatAreaProps> = (props) => {
  return (
    <div class="chat-area flex flex-col md:flex-row items-center justify-center gap-0 md:gap-5 mx-0 md:mx-1 px-0.5 md:px-0 h-[calc(100vh-100px)] md:h-[calc(100vh-120px)] overflow-hidden md:overflow-y-auto overscroll-none bg-neutral-900 md:bg-transparent">
      <VideoContainer
        title="Peer"
        asciiContent={appStore.remoteAscii()}
        variant="remote"
        videoRef={props.remoteVideoRef}
      />

      <StatusBar variant="mobile" />

      <VideoContainer
        title="You"
        asciiContent={appStore.localAscii()}
        variant="local"
        videoRef={props.localVideoRef}
      />
    </div>
  );
};
