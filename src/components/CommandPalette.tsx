import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Share2, GitBranch, Settings, PieChart, Users, AlertCircle } from 'lucide-react';

const commands = [
  { id: 'dashboard', name: 'داشبورد', icon: <PieChart size={18} />, path: '/' },
  { id: 'issues', name: 'نظام مسائل', icon: <FileText size={18} />, path: '/issues' },
  { id: 'trees_required', name: 'درختواره نیازمندی‌ها', icon: <GitBranch size={18} />, path: '/trees/required' },
  { id: 'trees_produced', name: 'درختواره تولیدی', icon: <Share2 size={18} />, path: '/trees/produced' },
  { id: 'reports', name: 'گزارش‌های پویا', icon: <PieChart size={18} />, path: '/reports' },
  { id: 'users', name: 'مدیریت کاربران', icon: <Users size={18} />, path: '/users' },
  { id: 'gaps', name: 'شکاف‌های دانشی', icon: <AlertCircle size={18} />, path: '/gaps' },
  { id: 'settings', name: 'تنظیمات سیستم', icon: <Settings size={18} />, path: '/settings' },
];

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setSearch('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const filteredCommands = commands.filter((cmd) =>
    cmd.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => (i + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => (i - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter' && filteredCommands.length > 0) {
      e.preventDefault();
      navigate(filteredCommands[selectedIndex].path);
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm p-4" onClick={() => setIsOpen(false)}>
      <div 
        className="w-full max-w-lg bg-white dark:bg-[#1e1e2f] rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-[#2d2d44]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-[#2d2d44]">
          <Search className="text-gray-400 mr-2" size={20} />
          <input
            ref={inputRef}
            className="w-full bg-transparent border-none outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 px-2"
            placeholder="جستجو و دسترسی سریع (دستورات)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <span className="text-xs text-gray-400 bg-gray-100 dark:bg-[#2d2d44] px-2 py-1 rounded-md mr-2">ESC</span>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-4">نتیجه‌ای یافت نشد.</p>
          ) : (
            filteredCommands.map((cmd, idx) => (
              <button
                key={cmd.id}
                onClick={() => {
                  navigate(cmd.path);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  idx === selectedIndex 
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                    : 'hover:bg-gray-50 dark:hover:bg-[#252538] text-gray-700 dark:text-gray-300'
                }`}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                <div className={`${idx === selectedIndex ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}>
                  {cmd.icon}
                </div>
                <span className="font-medium text-sm">{cmd.name}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
