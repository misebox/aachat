// UIManager class for DOM operations
export class UIManager {
  constructor(elm) {
    this.elm = elm;
    this.isKeywordFromURL = false;
  }

  updateStatus(text) {
    this.elm.statusText.textContent = text;
    this.elm.statusText2.textContent = text;
  }

  toggleButtons(enabled) {
    this.elm.connectBtn.disabled = !enabled;
    this.elm.connectBtn.style.display = enabled ? 'inline-block' : 'none';
    this.elm.leaveBtn.style.display = enabled ? 'none' : 'inline-block';

    if (!enabled) {
      this.elm.clearBtn.style.display = 'none';
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      const hasKeywordFromURL = urlParams.get('k');
      this.elm.clearBtn.style.display = hasKeywordFromURL ? 'inline-block' : 'none';
    }

    this.updateKeywordLockState(!enabled);
  }

  adjustAAFontSize() {
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;

    if (containerWidth <= 768) {
      this.adjustMobileAASize();
      return;
    }

    if (containerWidth <= 1200) {
      const isPortrait = containerHeight > containerWidth;

      let availableWidth, availableHeight, fontSizeByWidth, fontSizeByHeight;

      if (isPortrait) {
        availableWidth = containerWidth - 40;
        availableHeight = (containerHeight - 160) / 2;
        fontSizeByWidth = availableWidth / (80 * 0.6 + 79 * 0.4);
        fontSizeByHeight = availableHeight / 60;
      } else {
        availableWidth = (containerWidth - 60) / 2;
        availableHeight = containerHeight - 120;
        fontSizeByWidth = availableWidth / (80 * 0.6 + 79 * 0.4);
        fontSizeByHeight = availableHeight / 60;
      }

      const tabletFontSize = Math.max(6, Math.min(fontSizeByWidth, fontSizeByHeight, 16));
      document.documentElement.style.setProperty('--aa-font-size', `${tabletFontSize}px`);
      return;
    }

    const chatArea = this.elm.chatArea;
    const h1 = this.elm.title;
    const controls = this.elm.controls;
    const desktopStatus = this.elm.desktopStatus;
    const container = this.elm.container;

    let usedHeight = 0;
    if (h1) usedHeight += h1.offsetHeight + parseInt(getComputedStyle(h1).marginTop) + parseInt(getComputedStyle(h1).marginBottom);
    if (controls) usedHeight += controls.offsetHeight + parseInt(getComputedStyle(controls).marginTop) + parseInt(getComputedStyle(controls).marginBottom);
    if (desktopStatus) usedHeight += desktopStatus.offsetHeight + parseInt(getComputedStyle(desktopStatus).marginTop) + parseInt(getComputedStyle(desktopStatus).marginBottom);
    if (container) {
      const containerPadding = parseInt(getComputedStyle(container).paddingTop) + parseInt(getComputedStyle(container).paddingBottom);
      usedHeight += containerPadding;
    }

    const actualChatAreaHeight = containerHeight - usedHeight;
    const actualChatAreaWidth = chatArea ? chatArea.clientWidth : containerWidth - 20;

    let fontSize;

    if (containerWidth > 1200) {
      const chatAreaStyles = getComputedStyle(chatArea);
      const gapSize = parseInt(chatAreaStyles.gap) || 0;
      const availableWidthPerArea = (actualChatAreaWidth - gapSize) / 2;

      const sampleH3 = this.elm.remoteTitle;
      const titleHeight = sampleH3 ? sampleH3.offsetHeight : 0;
      const availableHeightPerArea = actualChatAreaHeight - titleHeight;

      const widthMultiplier = 80 * 0.6 + 79 * 0.4;
      const fontSizeByWidth = availableWidthPerArea / widthMultiplier;
      const fontSizeByHeight = availableHeightPerArea / 60;

      fontSize = Math.min(fontSizeByWidth, fontSizeByHeight, 20);
    } else {
      const availableWidth = actualChatAreaWidth;
      const mobileStatus = this.elm.mobileStatus;
      const mobileStatusHeight = mobileStatus ? mobileStatus.offsetHeight : 0;

      const h3Elements = [this.elm.remoteTitle, this.elm.localTitle];
      let totalTitleHeight = 0;
      h3Elements.forEach(h3 => {
        if (h3) totalTitleHeight += h3.offsetHeight;
      });

      const availableHeightPerArea = (actualChatAreaHeight - mobileStatusHeight - totalTitleHeight) / 2;

      const widthMultiplier = 80 * 0.6 + 79 * 0.4;
      const fontSizeByWidth = availableWidth / widthMultiplier;
      const fontSizeByHeight = availableHeightPerArea / 60;

      fontSize = Math.min(fontSizeByWidth, fontSizeByHeight, 18);
    }

    fontSize = Math.max(fontSize, 8);

    document.documentElement.style.setProperty('--aa-font-size', `${fontSize}px`);

    setTimeout(() => {
      this.validateAndAdjustAASize(fontSize);
    }, 100);
  }

  validateAndAdjustAASize(initialFontSize) {
    const aaDisplays = [this.elm.localAA, this.elm.remoteAA];
    const chatArea = this.elm.chatArea;

    if (!chatArea || aaDisplays.length === 0) return;

    const chatAreaRect = chatArea.getBoundingClientRect();
    let needsAdjustment = false;
    let adjustmentFactor = 1.0;

    aaDisplays.forEach(display => {
      const rect = display.getBoundingClientRect();

      if (rect.width > chatAreaRect.width) {
        const widthFactor = (chatAreaRect.width - 20) / rect.width;
        adjustmentFactor = Math.min(adjustmentFactor, widthFactor);
        needsAdjustment = true;
      }

      const container = display.closest('.video-container');
      if (container) {
        const containerRect = container.getBoundingClientRect();
        const titleHeight = 30;
        const availableHeight = containerRect.height - titleHeight;

        if (rect.height > availableHeight) {
          const heightFactor = availableHeight / rect.height;
          adjustmentFactor = Math.min(adjustmentFactor, heightFactor);
          needsAdjustment = true;
        }
      }
    });

    if (needsAdjustment) {
      const adjustedFontSize = Math.max(initialFontSize * adjustmentFactor, 6);
      document.documentElement.style.setProperty('--aa-font-size', `${adjustedFontSize}px`);
    }
  }

  adjustMobileAASize() {
    const h1 = this.elm.title;
    const controls = this.elm.controls;
    const container = this.elm.container;

    const h1Height = h1 ? h1.offsetHeight + parseInt(getComputedStyle(h1).marginTop) + parseInt(getComputedStyle(h1).marginBottom) : 0;
    const controlsHeight = controls ? controls.offsetHeight : 0;
    const containerPadding = container ? parseInt(getComputedStyle(container).paddingTop) + parseInt(getComputedStyle(container).paddingBottom) : 0;

    const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    const availableHeight = viewportHeight - h1Height - controlsHeight - containerPadding;

    const mobileStatus = this.elm.mobileStatus;
    const mobileStatusHeight = mobileStatus ? mobileStatus.offsetHeight : 0;

    const h3Elements = [this.elm.remoteTitle, this.elm.localTitle];
    let totalTitleHeight = 0;
    h3Elements.forEach(h3 => {
      if (h3) totalTitleHeight += h3.offsetHeight;
    });

    const availableAAHeight = availableHeight - mobileStatusHeight - totalTitleHeight;
    const idealFontSize = availableAAHeight / (60 * 2.5);

    const containerWidth = window.innerWidth;
    const widthMultiplier = 80 * 0.6 + 79 * 0.4;
    const maxFontSizeByWidth = (containerWidth - 10) / widthMultiplier;

    let fontSize = Math.min(idealFontSize, maxFontSizeByWidth);
    fontSize = Math.max(4, Math.min(12, fontSize));

    document.documentElement.style.setProperty('--remote-aa-font-size', `${fontSize}px`);
    document.documentElement.style.setProperty('--aa-font-size', `${fontSize}px`);
  }

  openDeviceDialog() {
    this.elm.deviceDialog.style.display = 'flex';
  }

  closeDeviceDialog() {
    this.elm.deviceDialog.style.display = 'none';
  }

  openHelpDialog() {
    this.elm.helpDialog.style.display = 'flex';
  }

  closeHelpDialog() {
    this.elm.helpDialog.style.display = 'none';
  }

  loadKeywordFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const keyword = urlParams.get('k');
    if (keyword) {
      this.elm.keyword.value = keyword;
      this.isKeywordFromURL = true;
      this.elm.clearBtn.style.display = 'inline-block';
      setTimeout(() => this.elm.connectBtn.focus(), 100);
    } else {
      this.isKeywordFromURL = false;
    }
    this.updateKeywordLockState(false);
  }

  updateKeywordLockState(sessionActive) {
    const shouldLock = this.isKeywordFromURL || sessionActive;
    this.elm.keyword.readOnly = shouldLock;
  }
}
