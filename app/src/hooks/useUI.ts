import { createSignal, onCleanup } from 'solid-js';
import { AA_WIDTH, AA_HEIGHT } from '@/lib/constants';
import { appStore } from '@/store/app';

/**
 * Hook for UI adjustments (font size, responsive layout)
 */
export function useUI() {
  const [aaFontSize, setAAFontSize] = createSignal(10);

  let resizeTimeout: ReturnType<typeof setTimeout> | null = null;
  let wasKeyboardVisible = false;

  /**
   * Calculate AA font size based on viewport dimensions
   */
  function calculateAAFontSize(containerWidth: number, containerHeight: number): number {
    const widthMultiplier = AA_WIDTH * 0.6 + (AA_WIDTH - 1) * 0.4;

    // Mobile: width <= 768
    if (containerWidth <= 768) {
      // Mobile layout: stacked vertically
      const headerHeight = 44;    // py-2(16px) + text-xl(28px)
      const controlsHeight = 65;  // py-2(16px) + h-12(48px) + border-t(1px)
      const statusHeight = 36;    // min-h-[36px]
      const areaCount = appStore.videoAreaCount();
      // When 2 videos shown, there's an additional mobile StatusBar between them
      const betweenStatusHeight = areaCount === 2 ? 36 : 0;
      // Border: 1px top + 1px bottom per container
      const borderHeight = areaCount * 2;

      const availableHeight = containerHeight - headerHeight - controlsHeight - statusHeight - betweenStatusHeight - borderHeight;
      const heightPerArea = availableHeight / areaCount;

      const fontSizeByHeight = heightPerArea / AA_HEIGHT;
      const fontSizeByWidth = (containerWidth - 10) / widthMultiplier;

      return Math.max(4, Math.min(fontSizeByWidth, fontSizeByHeight, 12));
    }

    // Tablet: width <= 1200
    if (containerWidth <= 1200) {
      const isPortrait = containerHeight > containerWidth;

      let availableWidth: number;
      let availableHeight: number;

      if (isPortrait) {
        availableWidth = containerWidth - 40;
        availableHeight = (containerHeight - 160) / 2;
      } else {
        availableWidth = (containerWidth - 60) / 2;
        availableHeight = containerHeight - 120;
      }

      const fontSizeByWidth = availableWidth / widthMultiplier;
      const fontSizeByHeight = availableHeight / AA_HEIGHT;

      return Math.max(6, Math.min(fontSizeByWidth, fontSizeByHeight, 16));
    }

    // Desktop: width > 1200
    const headerHeight = 80;
    const controlsHeight = 60;
    const statusHeight = 30;
    const gap = 20;

    const availableHeight = containerHeight - headerHeight - controlsHeight - statusHeight;
    const availableWidthPerArea = (containerWidth - gap) / 2 - 40;

    const fontSizeByWidth = availableWidthPerArea / widthMultiplier;
    const fontSizeByHeight = (availableHeight - 30) / AA_HEIGHT; // 30 for title

    return Math.max(8, Math.min(fontSizeByWidth, fontSizeByHeight, 20));
  }

  /**
   * Adjust ASCII font size based on viewport
   */
  function adjustAAFontSize(): void {
    const containerWidth = window.innerWidth;
    const containerHeight = window.visualViewport?.height ?? window.innerHeight;

    const fontSize = calculateAAFontSize(containerWidth, containerHeight);
    setAAFontSize(fontSize);

    document.documentElement.style.setProperty('--aa-font-size', `${fontSize}px`);
    document.documentElement.style.setProperty('--remote-aa-font-size', `${fontSize}px`);

    // Set actual viewport height for ChatArea
    document.documentElement.style.setProperty('--actual-vh', `${containerHeight}px`);
  }

  /**
   * Handle window resize with debounce
   */
  function handleResize(): void {
    if (resizeTimeout) clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => adjustAAFontSize(), 100);
  }

  /**
   * Handle Visual Viewport resize (mobile keyboard)
   */
  function handleVisualViewportResize(): void {
    if (!window.visualViewport) return;

    const keyboardVisible = window.visualViewport.height < window.innerHeight * 0.75;

    if (wasKeyboardVisible && !keyboardVisible) {
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 100);
    }

    if (!keyboardVisible) {
      setTimeout(() => adjustAAFontSize(), 200);
    }

    wasKeyboardVisible = keyboardVisible;
  }

  /**
   * Setup resize listeners
   */
  function setupResizeListeners(): void {
    window.addEventListener('resize', handleResize);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleVisualViewportResize);
    }

    // Initial adjustment
    adjustAAFontSize();
  }

  /**
   * Cleanup resize listeners
   */
  function cleanupResizeListeners(): void {
    window.removeEventListener('resize', handleResize);

    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
    }

    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
      resizeTimeout = null;
    }
  }

  onCleanup(() => {
    cleanupResizeListeners();
  });

  return {
    aaFontSize,
    adjustAAFontSize,
    setupResizeListeners,
    cleanupResizeListeners,
  };
}
