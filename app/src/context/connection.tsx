import { createContext, useContext, JSX } from 'solid-js';

interface ConnectionContextValue {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshDevices: () => Promise<void>;
  applyDevices: (videoDeviceId: string, audioDeviceId: string, fps: number) => Promise<void>;
  setLocalVideoRef: (el: HTMLVideoElement) => void;
  setRemoteVideoRef: (el: HTMLVideoElement) => void;
  toggleVideo: () => void;
  toggleAudio: () => void;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

const ConnectionContext = createContext<ConnectionContextValue>();

interface ConnectionProviderProps {
  value: ConnectionContextValue;
  children: JSX.Element;
}

export const ConnectionProvider = (props: ConnectionProviderProps) => {
  return (
    <ConnectionContext.Provider value={props.value}>
      {props.children}
    </ConnectionContext.Provider>
  );
};

export const useConnectionContext = () => {
  const context = useContext(ConnectionContext);
  if (!context) {
    throw new Error('useConnectionContext must be used within ConnectionProvider');
  }
  return context;
};
