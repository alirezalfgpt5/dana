// src/hooks/useFuzzySearch.ts
// هوک جستجوی فازی با استفاده از Fuse.js

import { useState, useMemo, useCallback } from 'react';
import Fuse from 'fuse.js';

export interface FuzzySearchOptions {
  keys: string[];
  threshold?: number; // 0 = دقیق, 1 = بسیار فازی
  includeScore?: boolean;
  ignoreLocation?: boolean;
  matchAll?: boolean;
  minMatchCharLength?: number;
}

const DEFAULT_OPTIONS: FuzzySearchOptions = {
  keys: ['title', 'name', 'description'],
  threshold: 0.4,
  includeScore: false,
  ignoreLocation: true,
  minMatchCharLength: 2,
};

export function useFuzzySearch<T = any>(
  data: T[],
  options: FuzzySearchOptions = DEFAULT_OPTIONS
) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isFuzzy, setIsFuzzy] = useState(true);

  // ایجاد نمونه Fuse
  const fuse = useMemo(() => {
    return new Fuse(data, {
      keys: options.keys,
      threshold: options.threshold || 0.4,
      includeScore: options.includeScore || false,
      ignoreLocation: options.ignoreLocation || true,
      minMatchCharLength: options.minMatchCharLength || 2,
      shouldSort: true,
    });
  }, [data, options]);

  // نتایج جستجو
  const results = useMemo(() => {
    if (!searchTerm.trim()) {
      return data.map(item => ({ item, score: 1 }));
    }

    if (isFuzzy) {
      const fuseResults = fuse.search(searchTerm);
      return fuseResults.map(result => ({
        item: result.item,
        score: result.score || 0,
      }));
    } else {
      // جستجوی دقیق (حساس به حروف بزرگ/کوچک)
      const term = searchTerm.toLowerCase();
      return data
        .filter(item => {
          return options.keys.some(key => {
            const value = getNestedValue(item, key);
            if (typeof value === 'string') {
              return value.toLowerCase().includes(term);
            }
            if (Array.isArray(value)) {
              return value.some(v => 
                typeof v === 'string' && v.toLowerCase().includes(term)
              );
            }
            return false;
          });
        })
        .map(item => ({ item, score: 0 }));
    }
  }, [data, searchTerm, isFuzzy, fuse]);

  // تابع دریافت مقدار تو در تو
  const getNestedValue = (obj: any, path: string): any => {
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current === null || current === undefined) return undefined;
      current = current[key];
    }
    return current;
  };

  // تابع جستجو
  const search = useCallback((term: string, fuzzy?: boolean) => {
    setSearchTerm(term);
    if (fuzzy !== undefined) {
      setIsFuzzy(fuzzy);
    }
  }, []);

  // تابع پاک کردن جستجو
  const clearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  // تابع تغییر حالت فازی
  const toggleFuzzy = useCallback(() => {
    setIsFuzzy(prev => !prev);
  }, []);

  return {
    searchTerm,
    isFuzzy,
    results,
    search,
    clearSearch,
    toggleFuzzy,
    setFuzzy: setIsFuzzy,
    hasResults: results.length > 0,
    totalResults: results.length,
  };
}

export default useFuzzySearch;