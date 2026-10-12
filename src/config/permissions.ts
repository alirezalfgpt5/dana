export const APPLICATION_PERMISSIONS = [
  { id: 'dashboard', label: 'داشبورد' },
  { id: 'wizard', label: 'مسیر یکپارچه دانش' },
  { id: 'guide', label: 'راهنمای سامانه' },
  { id: 'required-tree', label: 'درختواره مورد نیاز' },
  { id: 'produced-tree', label: 'درختواره تولیدشده' },
  { id: 'gaps', label: 'تحلیل شکاف' },
  { id: 'research', label: 'درختواره پژوهشی' },
  { id: 'issues', label: 'نظام مسائل' },
  { id: 'outputs', label: 'خروجی‌ها' },
  { id: 'search', label: 'جستجوی عمیق' },
  { id: 'dynamic-reports', label: 'گزارش‌ساز پویا' },
  { id: 'files', label: 'مدیریت فایل‌ها' },
  { id: 'users', label: 'مدیریت کاربران' },
  { id: 'roles', label: 'نقش‌ها و دسترسی‌ها' },
  { id: 'settings', label: 'تنظیمات عمومی' },
  { id: 'org-structure', label: 'ساختار سازمانی' },
  { id: 'periods', label: 'دوره‌های زمانی' },
  { id: 'audit', label: 'تاریخچه تغییرات' },
  { id: 'definitions', label: 'تعاریف' },
  { id: 'templates', label: 'مدیریت قالب‌ها' },
  { id: 'profile', label: 'پروفایل کاربری' },
] as const;

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: APPLICATION_PERMISSIONS.map(permission => permission.id),
  knowledge_manager: [
    'dashboard', 'wizard', 'guide', 'required-tree', 'produced-tree', 'gaps',
    'research', 'issues', 'outputs', 'search', 'dynamic-reports', 'files', 'profile',
  ],
  expert: ['dashboard', 'guide', 'required-tree', 'produced-tree', 'gaps', 'profile'],
  user: ['dashboard', 'guide', 'profile'],
};

const LEGACY_PERMISSION_ALIASES: Record<string, string[]> = {
  'trees/required': ['required-tree'],
  'trees/produced': ['produced-tree'],
  manage_trees: ['required-tree', 'produced-tree', 'gaps', 'research', 'issues', 'outputs'],
  view_trees: ['required-tree', 'produced-tree', 'gaps', 'research', 'issues', 'outputs'],
  manage_users: ['users', 'roles'],
};

export function normalizePermissions(permissions: string[] = []): string[] {
  const normalized = new Set<string>();
  permissions.forEach(permission => {
    const aliases = LEGACY_PERMISSION_ALIASES[permission];
    if (aliases) aliases.forEach(alias => normalized.add(alias));
    else normalized.add(permission);
  });
  return Array.from(normalized);
}
