export type UiTextOverrides = Record<string, string>;

export const UI_TEXT_STORAGE_KEY = 'dana_ui_text_overrides';
export const UI_TEXT_UPDATED_EVENT = 'dana-ui-text-updated';

let cachedOverrides: UiTextOverrides | null = null;

function parseOverrides(value: unknown): UiTextOverrides {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('ذخیرهٔ عنوان‌های سفارشی ساختار معتبری ندارد');
  }
  return Object.fromEntries(
    Object.entries(value).filter(([key, text]) => (
      key !== '__proto__' && key !== 'constructor' && typeof text === 'string'
    )),
  );
}

export function getUiTextOverrides(): UiTextOverrides {
  if (cachedOverrides) return cachedOverrides;
  try {
    const stored = localStorage.getItem(UI_TEXT_STORAGE_KEY);
    if (!stored) {
      cachedOverrides = {};
      return cachedOverrides;
    }
    const parsed: unknown = JSON.parse(stored);
    cachedOverrides = parseOverrides(parsed);
    return cachedOverrides;
  } catch (error) {
    console.error('Could not read custom UI text overrides:', error);
    cachedOverrides = {};
    return cachedOverrides;
  }
}

export async function loadUiTextOverrides(): Promise<UiTextOverrides> {
  const response = await fetch('/api/metadata/system-settings', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Could not load UI text settings (HTTP ${response.status})`);
  }
  const settings: unknown = await response.json();
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    throw new Error('تنظیمات ادبیات برنامه از سرور ساختار معتبری ندارد');
  }
  const storedValue = (settings as Record<string, unknown>).ui_text_overrides;
  const overrides = typeof storedValue === 'string'
    ? parseOverrides(JSON.parse(storedValue))
    : getUiTextOverrides();
  cachedOverrides = overrides;
  window.dispatchEvent(new Event(UI_TEXT_UPDATED_EVENT));
  return overrides;
}

export async function saveUiTextOverrides(overrides: UiTextOverrides): Promise<void> {
  const safeOverrides = Object.fromEntries(
    Object.entries(overrides).filter(([key, value]) => (
      key !== '__proto__' && key !== 'constructor' && typeof value === 'string' && value !== key
    )),
  );
  const response = await fetch('/api/metadata/system-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ui_text_overrides: JSON.stringify(safeOverrides) }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Could not save UI text settings (HTTP ${response.status})`);
  }
  try {
    localStorage.setItem(UI_TEXT_STORAGE_KEY, JSON.stringify(safeOverrides));
  } catch (error) {
    console.warn('Could not mirror database-backed UI text overrides to local storage:', error);
  }
  cachedOverrides = safeOverrides;
  window.dispatchEvent(new Event(UI_TEXT_UPDATED_EVENT));
}

export function translateUiText(defaultText: string): string {
  return getUiTextOverrides()[defaultText] ?? defaultText;
}

export function translateUiTemplate(defaultTemplate: string, values: string[]): string {
  const translated = translateUiText(defaultTemplate);
  return translated.replace(/\{(\d+)\}/g, (placeholder, index: string) => (
    values[Number(index)] ?? placeholder
  ));
}
