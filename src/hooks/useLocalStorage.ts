import { useState, useCallback, useEffect } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(error);
      return initialValue;
    }
  });

  // در صورت تغییر key، مقدار جدید از localStorage خوانده شود
  useEffect(() => {
    try {
      const item = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      setStoredValue(item ? JSON.parse(item) : initialValue);
    } catch (error) {
      console.warn(error);
      setStoredValue(initialValue);
    }
  }, [key, initialValue]);

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      setStoredValue((prev) => {
        const valueToStore = value instanceof Function ? value(prev) : value;
        if (typeof window !== 'undefined') {
          try {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
          } catch (e) {
            console.warn(e);
          }
        }
        return valueToStore;
      });
    } catch (error) {
      console.warn(error);
    }
  }, [key]);

  return [storedValue, setValue];
}

