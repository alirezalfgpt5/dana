// src/config/appConfig.ts

export const APP_CONFIG = {
  EXCEL: {
    DEFAULT_EXPORT_PATH: 'C:\\KMS\\Exports', // مسیر پیش‌فرض خروجی فایل‌های اکسل در نسخه استندالون
    ALLOWED_EXTENSIONS: ['.xlsx', '.xls'],
    MAX_FILE_SIZE_MB: 50,
  },
  SYSTEM: {
    IS_STANDALONE: true,
  }
};
