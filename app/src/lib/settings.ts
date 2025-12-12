const STORAGE_KEY = 'aachat_settings';

export interface Settings {
  selectedVideoDevice: string;
  selectedAudioDevice: string;
}

const DEFAULT_SETTINGS: Settings = {
  selectedVideoDevice: '',
  selectedAudioDevice: '',
};

export function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_SETTINGS };

    const parsed = JSON.parse(stored);

    // Validate structure
    if (
      typeof parsed !== 'object' ||
      typeof parsed.selectedVideoDevice !== 'string' ||
      typeof parsed.selectedAudioDevice !== 'string'
    ) {
      console.warn('Invalid settings in localStorage, clearing');
      localStorage.removeItem(STORAGE_KEY);
      return { ...DEFAULT_SETTINGS };
    }

    return parsed as Settings;
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
