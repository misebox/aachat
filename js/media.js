// MediaManager class for device and stream management
export class MediaManager {
  constructor(deps) {
    this.deps = deps; // { elm, callbacks: { playVideoSafely, updateSelectOptions, getWebRTCManager } }
    this.localStream = null;
    this.availableDevices = {
      videoDevices: [],
      audioDevices: []
    };
    this.selectedDeviceIds = {
      video: null,
      audio: null
    };
  }

  async getAvailableDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      this.availableDevices.videoDevices = devices.filter(device => device.kind === 'videoinput');
      this.availableDevices.audioDevices = devices.filter(device => device.kind === 'audioinput');
      this.updateDeviceSelects();
    } catch (error) {
      console.error('デバイス取得エラー:', error);
    }
  }

  getSelectedDeviceIds() {
    const { elm } = this.deps;
    return {
      video: elm.videoSelect.value || undefined,
      audio: elm.audioSelect.value || undefined
    };
  }

  async startCamera() {
    const { elm, callbacks } = this.deps;
    if (!elm || !callbacks) {
      console.error('MediaManager: deps not properly initialized', { elm: !!elm, callbacks: !!callbacks });
      return false;
    }
    try {
      const deviceIds = this.getSelectedDeviceIds();

      // 80x60で試行
      try {
        const constraints = {
          video: {
            width: { exact: 80 },
            height: { exact: 60 },
            frameRate: { ideal: 60, min: 30 },
            facingMode: 'user'
          },
          audio: true
        };

        if (deviceIds.video) {
          constraints.video.deviceId = { exact: deviceIds.video };
          delete constraints.video.facingMode;
        }
        if (deviceIds.audio) {
          constraints.audio = { deviceId: { exact: deviceIds.audio } };
        }

        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        // フォールバック: 160x120
        try {
          const constraints = {
            video: {
              width: { exact: 160 },
              height: { exact: 120 },
              frameRate: { ideal: 60, min: 30 },
              facingMode: 'user'
            },
            audio: true
          };

          if (deviceIds.video) {
            constraints.video.deviceId = { exact: deviceIds.video };
            delete constraints.video.facingMode;
          }
          if (deviceIds.audio) {
            constraints.audio = { deviceId: { exact: deviceIds.audio } };
          }

          this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch {
          // 最終フォールバック: 320x240
          const constraints = {
            video: {
              width: { exact: 320 },
              height: { exact: 240 },
              frameRate: { ideal: 60, min: 30 },
              facingMode: 'user'
            },
            audio: true
          };

          if (deviceIds.video) {
            constraints.video.deviceId = { exact: deviceIds.video };
            delete constraints.video.facingMode;
          }
          if (deviceIds.audio) {
            constraints.audio = { deviceId: { exact: deviceIds.audio } };
          }

          this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
        }
      }

      elm.localVideo.srcObject = this.localStream;

      const videoTrack = this.localStream.getVideoTracks()[0];
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (videoTrack) this.selectedDeviceIds.video = videoTrack.getSettings().deviceId;
      if (audioTrack) this.selectedDeviceIds.audio = audioTrack.getSettings().deviceId;
      console.log('デバイス:', videoTrack?.label || '-', '/', audioTrack?.label || '-');

      await callbacks.playVideoSafely(elm.localVideo, 'ローカル');

      return true;
    } catch (error) {
      console.error('カメラ起動エラー:', error.name, error.message);
      return false;
    }
  }

  stopCamera() {
    const { elm } = this.deps;
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
      elm.localVideo.srcObject = null;
    }
  }

  getVideoConstraints() {
    return {
      width: { exact: 80 },
      height: { exact: 60 },
      frameRate: { ideal: 60, min: 30 },
      facingMode: 'user'
    };
  }

  async switchDeviceDuringCall(videoChanged, audioChanged) {
    const { elm, callbacks } = this.deps;
    const constraints = {};

    if (videoChanged) {
      constraints.video = this.selectedDeviceIds.video ?
        { deviceId: { exact: this.selectedDeviceIds.video }, ...this.getVideoConstraints() } :
        this.getVideoConstraints();
    }

    if (audioChanged) {
      constraints.audio = this.selectedDeviceIds.audio ?
        { deviceId: { exact: this.selectedDeviceIds.audio } } :
        true;
    }

    console.log('デバイス切り替え開始:', constraints);

    const newStream = await navigator.mediaDevices.getUserMedia(constraints);

    const pc = callbacks.getWebRTCManager()?.getPeerConnection();
    if (!pc) {
      console.error('PeerConnection is not available');
      return;
    }
    const senders = pc.getSenders();

    if (videoChanged) {
      const newVideoTrack = newStream.getVideoTracks()[0];
      const videoSender = senders.find(sender => sender.track && sender.track.kind === 'video');

      if (videoSender && newVideoTrack) {
        await videoSender.replaceTrack(newVideoTrack);

        const oldVideoTrack = this.localStream.getVideoTracks()[0];
        if (oldVideoTrack) {
          oldVideoTrack.stop();
          this.localStream.removeTrack(oldVideoTrack);
        }
        this.localStream.addTrack(newVideoTrack);
      }
    }

    if (audioChanged) {
      const newAudioTrack = newStream.getAudioTracks()[0];
      const audioSender = senders.find(sender => sender.track && sender.track.kind === 'audio');

      if (audioSender && newAudioTrack) {
        await audioSender.replaceTrack(newAudioTrack);

        const oldAudioTrack = this.localStream.getAudioTracks()[0];
        if (oldAudioTrack) {
          oldAudioTrack.stop();
          this.localStream.removeTrack(oldAudioTrack);
        }
        this.localStream.addTrack(newAudioTrack);
      }
    }

    elm.localVideo.srcObject = this.localStream;

    newStream.getTracks().forEach(track => {
      if (!this.localStream.getTracks().includes(track)) {
        track.stop();
      }
    });

    console.log('デバイス切り替え完了');
  }

  updateDeviceSelects() {
    const { elm, callbacks } = this.deps;

    callbacks.updateSelectOptions(elm.videoSelect, this.getAvailableVideoDevices(), 'カメラ');
    callbacks.updateSelectOptions(elm.audioSelect, this.getAvailableAudioDevices(), 'マイク');

    callbacks.updateSelectOptions(elm.videoSelectDialog, this.getAvailableVideoDevices(), 'カメラ');
    callbacks.updateSelectOptions(elm.audioSelectDialog, this.getAvailableAudioDevices(), 'マイク');

    if (this.selectedDeviceIds.video) {
      elm.videoSelect.value = this.selectedDeviceIds.video;
      elm.videoSelectDialog.value = this.selectedDeviceIds.video;
    }
    if (this.selectedDeviceIds.audio) {
      elm.audioSelect.value = this.selectedDeviceIds.audio;
      elm.audioSelectDialog.value = this.selectedDeviceIds.audio;
    }
  }

  getLocalStream() {
    return this.localStream;
  }

  getAvailableVideoDevices() {
    return this.availableDevices.videoDevices;
  }

  getAvailableAudioDevices() {
    return this.availableDevices.audioDevices;
  }

  async applyDeviceSelection(sessionManager, closeDialogCallback) {
    const { elm, callbacks } = this.deps;
    const newVideoDeviceId = elm.videoSelectDialog.value;
    const newAudioDeviceId = elm.audioSelectDialog.value;

    const videoChanged = this.selectedDeviceIds.video !== newVideoDeviceId;
    const audioChanged = this.selectedDeviceIds.audio !== newAudioDeviceId;

    if (!videoChanged && !audioChanged) {
      closeDialogCallback();
      return;
    }

    this.selectedDeviceIds.video = newVideoDeviceId;
    this.selectedDeviceIds.audio = newAudioDeviceId;

    elm.videoSelect.value = this.selectedDeviceIds.video;
    elm.audioSelect.value = this.selectedDeviceIds.audio;

    console.log('デバイス選択適用:', {
      video: elm.videoSelectDialog.options[elm.videoSelectDialog.selectedIndex]?.text,
      audio: elm.audioSelectDialog.options[elm.audioSelectDialog.selectedIndex]?.text,
      sessionActive: sessionManager.sessionActive
    });

    if (sessionManager.sessionActive && this.getLocalStream() && callbacks.getWebRTCManager()?.getPeerConnection()) {
      try {
        await this.switchDeviceDuringCall(videoChanged, audioChanged);
      } catch (error) {
        console.error('通話中のデバイス切り替えエラー:', error);
      }
    }

    closeDialogCallback();
  }
}
