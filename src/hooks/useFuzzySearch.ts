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

  // ایجاد نمونه Fuse با حفظ مقادیر 0 و false
  const fuse = useMemo(() => {
    return new Fuse(data, {
      keys: options.keys,
      threshold: options.threshold !== undefined ? options.threshold : 0.4,
      includeScore: options.includeScore !== undefined ? options.includeScore : false,
      ignoreLocation: options.ignoreLocation !== undefined ? options.ignoreLocation : true,
      minMatchCharLength: options.minMatchCharLength !== undefined ? options.minMatchCharLength : 2,
      shouldSort: true,
    });
  }, [data, options]);

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

  // نتایج جستجو
  const results = useMemo(() => {
    if (!searchTerm.trim()) {
      return data.map(item => ({ item, score: 1 }));
    }

    const tokens = searchTerm.trim().split(/\s+/).filter(Boolean);

    if (isFuzzy) {
      let fuseResults;
      if (options.matchAll && tokens.length > 1) {
        fuseResults = fuse.search({
          $and: tokens.map(token => ({
            $or: options.keys.map(key => ({ [key]: token }))
          }))
        });
      } else {
        fuseResults = fuse.search(searchTerm);
      }
      return fuseResults.map(result => ({
        item: result.item,
        score: result.score !== undefined ? result.score : 0,
      }));
    } else {
      // جستجوی دقیق (حساس به حروف بزرگ/کوچک)
      if (options.matchAll && tokens.length > 1) {
        const lowerTokens = tokens.map(t => t.toLowerCase());
        return data
          .filter(item => {
            return lowerTokens.every(token =>
              options.keys.some(key => {
                const value = getNestedValue(item, key);
                if (typeof value === 'string') {
                  return value.toLowerCase().includes(token);
                }
                if (Array.isArray(value)) {
                  return value.some(v => 
                    typeof v === 'string' && v.toLowerCase().includes(token)
                  );
                }
                return false;
              })
            );
          })
          .map(item => ({ item, score: 0 }));
      } else {
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
    }
  }, [data, searchTerm, isFuzzy, fuse, options]);

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