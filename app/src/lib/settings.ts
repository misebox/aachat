const STORAGE_KEY = 'aachat_settings';

export interface Settings {
  selectedVideoDevice: string;
  selectedAudioDevice: string;
  fps: number;
}

const DEFAULT_SETTINGS: Settings = {
  selectedVideoDevice: '',
  selectedAudioDevice: '',
  fps: 30,
};

export function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_SETTINGS };

    const parsed = JSON.parse(stored);

    // Validate structure
    if (typeof parsed !== 'object') {
      console.warn('Invalid settings in localStorage, clearing');
      localStorage.removeItem(STORAGE_KEY);
      return { ...DEFAULT_SETTINGS };
    }

    // Merge with defaults for backward compatibility
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      fps: typeof parsed.fps === 'number' ? parsed.fps : DEFAULT_SETTINGS.fps,
    };
  } catch {
    console.warn('Failed to load settings, using defaults');
    localStorage.removeItem(STORAGE_KEY);
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Partial<Settings>): void {
  try {
    const current = loadSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    console.warn('Failed to save settings');
  }
}

export function clearSettings(): void {
  localStorage.removeItem(STORAGE_KEY);
}
