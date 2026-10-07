import { useEffect } from 'react';
import { useAuthStore } from '../store';
import { useLocalStorage } from '../hooks/useLocalStorage';

export function getUserPreferencesKey(userId: number | string | null | undefined) {
  return `dana_user_preferences_${userId ?? 'guest'}`;
}

export function getUserPreference<T>(key: string, fallback: T): T {
  try {
    const userState = JSON.parse(localStorage.getItem('dana_auth_state') || '{}');
    const userId = userState?.state?.user?.id ?? 'guest';
    const preferences = JSON.parse(localStorage.getItem(getUserPreferencesKey(userId)) || '{}');
    return key in preferences ? preferences[key] as T : fallback;
  } catch {
    return fallback;
  }
}

export function setUserPreference<T>(key: string, value: T) {
  try {
    const userState = JSON.parse(localStorage.getItem('dana_auth_state') || '{}');
    const userId = userState?.state?.user?.id ?? 'guest';
    const storageKey = getUserPreferencesKey(userId);
    const preferences = JSON.parse(localStorage.getItem(storageKey) || '{}');
    localStorage.setItem(storageKey, JSON.stringify({ ...preferences, [key]: value }));
  } catch (error) {
    console.error('ذخیرهٔ ترجیح کاربر انجام نشد:', error);
  }
}

export function migrateLegacyNumberPreferences() {
  try {
    const userState = JSON.parse(localStorage.getItem('dana_auth_state') || '{}');
    const userId = userState?.state?.user?.id;
    if (userId === undefined || userId === null) return;

    const storageKey = getUserPreferencesKey(userId);
    const preferences = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (preferences.legacyNumberPreferencesMigrated) return;

    if (!('numberFormat' in preferences)) {
      const legacyFormat = localStorage.getItem('dana_number_format');
      if (legacyFormat !== null) preferences.numberFormat = legacyFormat === 'persian';
    }
    if (!('showThousandSeparator' in preferences)) {
      const legacyGrouping = localStorage.getItem('dana_show_thousand_separator');
      if (legacyGrouping !== null) preferences.showThousandSeparator = legacyGrouping !== 'false';
    }

    preferences.legacyNumberPreferencesMigrated = true;
    localStorage.setItem(storageKey, JSON.stringify(preferences));
  } catch (error) {
    console.error('انتقال تنظیمات قدیمی ارقام کاربر انجام نشد:', error);
  }
}

export function useUserPreference<T>(key: string, fallback: T, legacyKey?: string) {
  const userId = useAuthStore(state => state.user?.id);
  const storageKey = `${getUserPreferencesKey(userId)}:${key}`;
  const [value, setValue] = useLocalStorage<T>(storageKey, fallback);

  useEffect(() => {
    if (userId === undefined || !legacyKey) return;
    try {
      if (localStorage.getItem(storageKey) !== null) return;
      const legacyValue = localStorage.getItem(legacyKey);
      if (legacyValue === null) return;
      localStorage.setItem(storageKey, legacyValue);
      setValue(JSON.parse(legacyValue) as T);
    } catch (error) {
      console.error(`انتقال ترجیح ${key} به تنظیمات کاربر انجام نشد:`, error);
    }
  }, [key, legacyKey, setValue, storageKey, userId]);

  return [value, setValue] as const;
}
