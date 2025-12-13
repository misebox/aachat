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
    // Video: AA_WIDTH chars + letter-spacing, Indicator: 1 char (no letter-spacing)
    const widthMultiplier = (AA_WIDTH + 1) * 0.6 + (AA_WIDTH - 1) * 0.4;

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
      // 20 = container padding(10) + margins(4) + video padding/border(4) + indicator padding(2)
      const fontSizeByWidth = (containerWidth - 20) / widthMultiplier;

      return Math.max(4, Math.min(fontSizeByWidth, fontSizeByHeight, 12));
    }

    // Desktop/Tablet (>= 768px): horizontal layout (side by side)
    const gap = 20;
    const padding = 40;
    const headerHeight = 80;
    const controlsHeight = 60;
    const statusHeight = 30;
    const titleHeight = 30;

    const availableHeight = containerHeight - headerHeight - controlsHeight - statusHeight - titleHeight;
    const availableWidthPerArea = (containerWidth - gap) / 2 - padding;

    const fontSizeByWidth = availableWidthPerArea / widthMultiplier;
    const fontSizeByHeight = availableHeight / AA_HEIGHT;

    // Clamp: min 4px, max 20px
    return Math.max(4, Math.min(fontSizeByWidth, fontSizeByHeight, 20));
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
