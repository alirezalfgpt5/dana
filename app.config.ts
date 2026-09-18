// app.config.ts
// فایل پیکربندی متمرکز ریشه پروژه

export const ROOT_CONFIG = {
  EXCEL_CONFIG: {
    DEFAULT_EXPORT_PATH: 'C:\\KMS\\Exports', // مسیر پیش‌فرض تولید فایل اکسل در حالت اجرایی/استندالون
    DEFAULT_IMPORT_PATH: 'C:\\KMS\\Imports',
    MAX_FILE_SIZE_MB: 50,
    ALLOWED_EXTENSIONS: ['.xlsx', '.xls'],
    DATE_FORMAT: 'YYYY/MM/DD',
  },
  SYSTEM: {
    IS_STANDALONE_EXE: true, // نشانگر اجرای برنامه در حالت استندالون برای جلوگیری از نیازمندی‌های شبکه در صورت نیاز
    VERSION: '3.0.0',
    NAME: 'سیستم مدیریت دانش (DANA)',
  },
  ROLES: {
    SUPERADMIN: 'superadmin',
    ADMIN: 'admin',
    USER: 'user'
  }
};
