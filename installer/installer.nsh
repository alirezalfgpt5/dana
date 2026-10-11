!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "به نصب سامانه دانا خوش آمدید"
  !define MUI_WELCOMEPAGE_TEXT "سامانه جامع مدیریت دانش، نظام مسائل، درخت دانش و ارزیابی پژوهش (DANA) — نسخه ${VERSION}.$\r$\n$\r$\nاین بسته شامل خود برنامه و موتور اجرای داخلی آن است؛ برای استفاده از نسخه نصب‌شده نیازی به نصب جداگانه Node.js، پایگاه داده SQLite یا مرورگر ندارید.$\r$\n$\r$\nاطلاعات و فایل‌های سامانه در پوشه داده کاربر Windows ذخیره می‌شوند و با حذف برنامه پاک نمی‌شوند.$\r$\n$\r$\nاین نسخه نصب‌کننده برای Windows 10 و 11 نسخه ۶۴ بیتی تهیه شده است."
  !insertmacro MUI_PAGE_WELCOME
!macroend
