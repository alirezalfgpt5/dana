// src/components/ui/FuzzySearch.tsx
// کامپوننت جستجوی فازی

import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Sparkles, Filter, ChevronDown } from 'lucide-react';
import { useFuzzySearch } from '../../hooks/useFuzzySearch';

interface FuzzySearchProps<T = any> {
  data: T[];
  keys: string[];
  placeholder?: string;
  onSelect?: (item: T) => void;
  onSearch?: (term: string, results: T[]) => void;
  renderItem?: (item: T, score?: number) => React.ReactNode;
  className?: string;
  threshold?: number;
  minChars?: number;
  autoFocus?: boolean;
  showFuzzyToggle?: boolean;
  showScore?: boolean;
}

export function FuzzySearch<T = any>({
  data,
  keys,
  placeholder = 'جستجو...',
  onSelect,
  onSearch,
  renderItem,
  className = '',
  threshold = 0.4,
  minChars = 2,
  autoFocus = false,
  showFuzzyToggle = true,
  showScore = false,
}: FuzzySearchProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    searchTerm,
    isFuzzy,
    results,
    search,
    clearSearch,
    toggleFuzzy,
    totalResults,
  } = useFuzzySearch(data, {
    keys,
    threshold,
    minMatchCharLength: minChars,
    includeScore: showScore,
  });

  // بستن با کلیک خارج
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // کلیدهای صفحه‌کلید
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedIndex >= 0 && selectedIndex < results.length) {
            const item = results[selectedIndex];
            if (onSelect) onSelect(item.item);
            if (onSearch) onSearch(searchTerm, results.map(r => r.item));
            setIsOpen(false);
            clearSearch();
          }
          break;
        case 'Escape':
          setIsOpen(false);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onSelect, onSearch, searchTerm, clearSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    search(value);
    if (value.length >= minChars) {
      setIsOpen(true);
      setSelectedIndex(-1);
      if (onSearch) onSearch(value, results.map(r => r.item));
    } else {
      setIsOpen(false);
    }
  };

  const handleSelect = (item: T) => {
    if (onSelect) onSelect(item);
    if (onSearch) onSearch(searchTerm, results.map(r => r.item));
    setIsOpen(false);
    clearSearch();
  };

  const highlightMatch = (text: string, term: string): React.ReactNode => {
    if (!term || !isFuzzy) return text;
    
    const lowerText = text.toLowerCase();
    const lowerTerm = term.toLowerCase();
    const index = lowerText.indexOf(lowerTerm);
    
    if (index === -1) return text;
    
    return (
      <>
        {text.substring(0, index)}
        <span className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
          {text.substring(index, index + term.length)}
        </span>
        {text.substring(index + term.length)}
      </>
    );
  };

  const defaultRenderItem = (item: any, score?: number) => {
    const firstKey = keys[0];
    const value = typeof item === 'object' ? item[firstKey] : item;
    
    return (
      <div className="flex items-center justify-between w-full">
        <span className="text-sm text-gray-700">
          {typeof value === 'string' ? highlightMatch(value, searchTerm) : value}
        </span>
        {showScore && score !== undefined && (
          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
            {(1 - score).toFixed(2)}
          </span>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative">
        <Search 
          size={18} 
          className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${
            searchTerm ? 'text-blue-500' : 'text-gray-400'
          }`} 
        />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => searchTerm.length >= minChars && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pr-10 pl-9 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50/50 focus:bg-white"
          autoFocus={autoFocus}
        />
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={16} />
          </button>
        )}
        {showFuzzyToggle && (
          <button
            onClick={toggleFuzzy}
            className={`absolute left-10 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors ${
              isFuzzy ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-600'
            }`}
            title={isFuzzy ? 'جستجوی فازی' : 'جستجوی دقیق'}
          >
            <Sparkles size={16} />
          </button>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          <div className="p-2 border-b border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
            <span>{totalResults} نتیجه</span>
            <span className="flex items-center gap-1">
              <Filter size={12} />
              {isFuzzy ? 'فازی' : 'دقیق'}
            </span>
          </div>
          {results.map((result, index) => (
            <button
              key={index}
              onClick={() => handleSelect(result.item)}
              className={`w-full text-right px-3 py-2.5 transition-colors flex items-center justify-between ${
                index === selectedIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              {renderItem 
                ? renderItem(result.item, result.score)
                : defaultRenderItem(result.item, result.score)
              }
            </button>
          ))}
        </div>
      )}

      {isOpen && searchTerm.length >= minChars && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-center text-gray-400 text-sm">
          <Search size={24} className="mx-auto mb-2 text-gray-300" />
          <p>نتیجه‌ای برای "<span className="font-medium text-gray-600">{searchTerm}</span>" یافت نشد</p>
          {isFuzzy && (
            <p className="text-xs text-gray-400 mt-1">
              💡 سعی کنید جستجوی دقیق را امتحان کنید
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default FuzzySearch;