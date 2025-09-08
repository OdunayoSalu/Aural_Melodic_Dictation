// settingsStore.js
import { DEFAULT_SETTINGS, TEMPO_PRESETS } from './constants.js';

const STORAGE_KEY = 'amd_settings_v1';

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    // Merge with defaults to ensure new fields exist
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (e) {
    console.warn('Failed to load settings, using defaults', e);
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function getEffectiveBpm(settings) {
  if (settings.tempoChoice === 'custom') return Number(settings.customBpm) || 100;
  return TEMPO_PRESETS[settings.tempoChoice] ?? 90;
}
