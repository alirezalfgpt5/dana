// src/pages/Trees/constants/treeLevels.ts
// تعاریف سطوح درختواره با رنگ و توضیحات

export interface LevelConfig {
  value: string;
  label: string;
  labelFa: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  description: string;
  nextLevel: string | null;
  emoji: string;
}

export const LEVELS: Record<string, LevelConfig> = {
  'R': {
    value: 'R',
    label: 'Root',
    labelFa: 'ریشه',
    color: '#3b82f6',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-400',
    textColor: 'text-blue-700',
    description: 'کلان‌ترین سطح دانش - پایه و اساس درختواره',
    nextLevel: 'T',
    emoji: '🔵'
  },
  'T': {
    value: 'T',
    label: 'Trunk',
    labelFa: 'تنه',
    color: '#8b5cf6',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-400',
    textColor: 'text-purple-700',
    description: 'ستون اصلی ارتباط دهنده ریشه تا برگ‌ها',
    nextLevel: 'B',
    emoji: '🟣'
  },
  'B': {
    value: 'B',
    label: 'Branch',
    labelFa: 'شاخه',
    color: '#10b981',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-400',
    textColor: 'text-green-700',
    description: 'حوزه‌های اصلی دانشی (تقسیم‌بندی کلان موضوعی)',
    nextLevel: 'SB',
    emoji: '🟢'
  },
  'SB': {
    value: 'SB',
    label: 'Sub-Branch',
    labelFa: 'زیرشاخه',
    color: '#f59e0b',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-400',
    textColor: 'text-amber-700',
    description: 'حوزه‌های فرعی دانشی (ریزتر از شاخه)',
    nextLevel: 'L',
    emoji: '🟡'
  },
  'L': {
    value: 'L',
    label: 'Leaf',
    labelFa: 'برگ',
    color: '#ef4444',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-400',
    textColor: 'text-red-700',
    description: 'ریزدانش‌ها و مصادیق عینی دانش (نقطه عطف فرایند)',
    nextLevel: 'Q',
    emoji: '🔴'
  },
  'Q': {
    value: 'Q',
    label: 'Question',
    labelFa: 'مسئله',
    color: '#6366f1',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-400',
    textColor: 'text-indigo-700',
    description: 'نظام مسائل و پرسش‌های پژوهشی',
    nextLevel: null,
    emoji: '❓'
  }
};

export const LEVEL_ORDER = ['R', 'T', 'B', 'SB', 'L', 'Q'];

export const getLevelConfig = (level: string): LevelConfig => {
  return LEVELS[level] || LEVELS['L'];
};

export const getNextLevel = (currentLevel: string): string | null => {
  const index = LEVEL_ORDER.indexOf(currentLevel);
  if (index < LEVEL_ORDER.length - 1) {
    return LEVEL_ORDER[index + 1];
  }
  return null;
};

export const canAddChild = (level: string): boolean => {
  return true;
};