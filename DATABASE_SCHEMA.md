# مستند جامع ساختار پایگاه داده و تشریح فیلدها — سامانه مدیریت دانش و نظام مسائل (دانا)

**نسخه مستند:** ۳.۲  
**تاریخ به‌روزرسانی:** مهر ۱۴۰۴ / سپتامبر ۲۰۲۶  
**موتور دیتابیس:** `SQLite` (همراه با درایور سازگار داخلی `node:sqlite` و انتزاع `Drizzle ORM`)  
**قابلیت مهاجرت:** سازگار کامل با MySQL 8.0+ / MariaDB و PostgreSQL  
**تعداد کل جداول:** ۳۹ جدول ساخت‌یافته  

---

## فهرست راهنمای حوزه‌های دیتابیس

1. [معماری کلی و اصول طراحی پایگاه داده](#۱-معماری-کلی-و-اصول-طراحی-پایگاه-داده)
2. [حوزه ۱: سیستم، احراز هویت و امنیت](#حوزه-۱-سیستم-احراز-هویت-و-امنیت)
3. [حوزه ۲: ساختار سازمانی و رده‌ها](#حوزه-۲-ساختار-سازمانی-و-ردهها)
4. [حوزه ۳: دوره‌های زمانی و همگام‌سازی](#حوزه-۳-دورههای-زمانی-و-همگامسازی)
5. [حوزه ۴: درختواره‌ها و گره‌های دانش](#حوزه-۴-درختوارهها-و-گرههای-دانش)
6. [حوزه ۵: قالب‌ها، نمونه‌ها و سطوح دانش](#حوزه-۵-قالبها-نمونهها-و-سطوح-دانش)
7. [حوزه ۶: دارایی‌های دانشی و فایل‌ها](#حوزه-۶-داراییهای-دانشی-و-فایلها)
8. [حوزه ۷: موتور تحلیل شکاف دانشی (Gaps)](#حوزه-۷-موتور-تحلیل-شکاف-دانشی-gaps)
9. [حوزه ۸: درختواره و آیتم‌های پژوهشی (Research)](#حوزه-۸-درختواره-و-آیتمهای-پژوهشی-research)
10. [حوزه ۹: نظام مسائل و اعتبارات (Issues)](#حوزه-۹-نظام-مسائل-و-اعتبارات-issues)
11. [حوزه ۱۰: تاریخچه تغییرات و ممیزی (Audit & History)](#حوزه-۱۰-تاریخچه-تغییرات-و-ممیزی-audit--history)
12. [حوزه ۱۱: تبادل اطلاعات، نسخه‌بندی و حل تعارضات آفلاین یگان‌ها](#حوزه-۱۱-تبادل-اطلاعات-نسخهبندی-و-حل-تعارضات-آفلاین-یگانها)
13. [حوزه ۱۲: تعاریف پایه و کاتالوگ‌های متادیتا](#حوزه-۱۲-تعاریف-پایه-و-کاتالوگهای-متادیتا)
14. [راهنمای ساختار فیلدهای متنی JSON (Payloads)](#راهنمای-ساختار-فیلدهای-متنی-json-payloads)

---

## ۱. معماری کلی و اصول طراحی پایگاه داده

سامانه جامع **دانا (DANA)** با در نظر گرفتن سناریوهای استقرار در محیط‌های آفلاین، شبکه‌های ایزوله نظامی و زیرساخت‌های متمرکز ابری با اهداف کلیدی زیر پیاده‌سازی شده است:
- **ایزوله‌سازی سازمانی و رده‌ای (Multi-Tenant Org Scope):** داده‌ها در تمام سطوح (آجا، نیرو/پایگاه، یگان/رده) دارای تفکیک دقیق دسترسی هستند.
- **چنددوره‌ای بودن (Multi-Period Support):** داده‌های درختواره‌ها، شکاف‌ها و نظام مسائل وابسته به دوره‌های زمانی مجزا هستند و از انتقال دوره‌ای (Period Rollover) و ردیابی خط سیر مسئله (Lineage Tracking) پشتیبانی می‌کنند.
- **ثبات ریالی و محاسبات دقیق:** تمام فیلدهای مالی به صورت ریال با فرمت عددی دقیق ذخیره می‌شوند.
- **نسخه‌بندی و حل تعارضات آفلاین:** پشتیبانی کامل از انتقال بسته‌های داده از طریق دیسک/سی‌دی با ثبت تاریخچه حل تعارضات.

---

## حوزه ۱: سیستم، احراز هویت و امنیت

### ۱. جدول `roles` (نقش‌های کاربری)
نقش‌های سیستمی و سفارشی به همراه ماتریس دسترسی‌ها.

| نام فیلد | نوع داده | وضعیت Null | مقدار پیش‌فرض | کلید خارجی / توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NOT NULL | AUTOINCREMENT | کلید اصلی جدول |
| `name` | TEXT | NOT NULL | - | نام انگلیسی یکتا نقش (مانند `superadmin`, `admin`, `expert`, `user`) |
| `label` | TEXT | NOT NULL | - | عنوان فارسی نقش (مانند «مدیر کل سیستم») |
| `permissions` | TEXT | NOT NULL | - | آرایه JSON دسترسی‌ها (مانند `["all"]`, `["manage_trees"]`) |
| `is_system` | INTEGER | NOT NULL | 0 | فلگ سیستمی (۱ برای نقش‌های توکار و غیرقابل حذف) |
| `created_at` | TEXT | NOT NULL | - | تاریخ ایجاد به فرمت ISO-8601 |
| `updated_at` | TEXT | NOT NULL | - | تاریخ آخرین ویرایش |

### ۲. جدول `users` (کاربران سامانه)
اطلاعات هویتی، رمزنگاری کلمه عبور و پیوند سازمانی کاربران.

| نام فیلد | نوع داده | وضعیت Null | مقدار پیش‌فرض | کلید خارجی / توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NOT NULL | AUTOINCREMENT | کلید اصلی |
| `username` | TEXT | NOT NULL | - | نام کاربری یکتا |
| `password` | TEXT | NOT NULL | - | هش کلمه عبور با الگوریتم BCrypt |
| `full_name` | TEXT | NOT NULL | - | نام و نام خانوادگی |
| `role` | TEXT | NOT NULL | 'user' | نام نقش کاربر متصل به جدول `roles(name)` |
| `organization_level` | TEXT | NULL | - | رده سازمانی کاربر (آجا، پایگاه، رده یگانی) |
| `base_id` | INTEGER | NULL | NULL | ارجاع به پایگاه: `FK -> bases(id) ON DELETE SET NULL` |
| `unit_id` | INTEGER | NULL | NULL | ارجاع به یگان: `FK -> units(id) ON DELETE SET NULL` |
| `phone` | TEXT | NULL | - | شماره تماس کاربر |
| `rank` | TEXT | NULL | - | درجه نظامی کاربر |
| `photo_url` | TEXT | NULL | - | آدرس تصویر پروفایل |
| `is_active` | INTEGER | NULL | 1 | وضعیت فعال بودن کاربر (۱ فعال، ۰ غیرفعال) |
| `created_at` | TEXT | NULL | - | زمان ثبت نام |
| `updated_at` | TEXT | NULL | - | زمان آخرین به‌روزرسانی (جهت ابطال نشست‌های قدیمی) |

*ایندکس‌ها:* `users_org_level_idx` بر روی `organization_level`.

### ۳. جدول `system_settings` (تنظیمات سراسری سیستم)
تنظیمات پیکربندی، کلیدهای اضطراری و متغیرهای پویا.

| نام فیلد | نوع داده | وضعیت Null | مقدار پیش‌فرض | کلید خارجی / توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `key` | TEXT | NOT NULL | - | کلید یکتا (کلید اصلی) مانند `master_recovery_key` |
| `value` | TEXT | NOT NULL | - | مقدار متناظر تنظیم |
| `updated_at` | TEXT | NOT NULL | - | زمان تغییر مقدار |

---

## حوزه ۲: ساختار سازمانی و رده‌ها

### ۴. جدول `bases` (پایگاه‌ها / نیروها)
سطح میانی سلسله‌مراتب سازمانی آجا.

| نام فیلد | نوع داده | وضعیت Null | مقدار پیش‌فرض | کلید خارجی / توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NOT NULL | AUTOINCREMENT | کلید اصلی |
| `name` | TEXT | NOT NULL | - | نام پایگاه یا نیرو (مانند «ستاد کل آجا»، «نیروی هوایی») |
| `location` | TEXT | NULL | - | موقعیت جغرافیایی پایگاه |
| `level` | TEXT | NULL | - | رده ساختاری پایگاه |
| `parent_id` | INTEGER | NULL | NULL | پایگاه والد (در صورت وجود سلسله‌مراتب) |
| `description` | TEXT | NULL | - | شرح و مأموریت پایگاه |
| `sort_order` | INTEGER | NULL | 0 | ترتیب نمایش در درختواره سازمانی |
| `is_active` | INTEGER | NULL | 1 | وضعیت فعالیت پایگاه |
| `created_at` | TEXT | NULL | - | تاریخ ثبت |
| `updated_at` | TEXT | NULL | - | تاریخ ویرایش |

### ۵. جدول `units` (یگان‌ها / قسمت‌ها)
پایین‌ترین رده‌های عملیاتی و دانشی متصل به پایگاه‌ها.

| نام فیلد | نوع داده | وضعیت Null | مقدار پیش‌فرض | کلید خارجی / توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NOT NULL | AUTOINCREMENT | کلید اصلی |
| `base_id` | INTEGER | NOT NULL | - | ارجاع اجباری به پایگاه: `FK -> bases(id) ON DELETE CASCADE` |
| `name` | TEXT | NOT NULL | - | نام یگان یا معاونت |
| `level` | TEXT | NULL | - | سطح ساختاری |
| `parent_id` | INTEGER | NULL | NULL | یگان مافوق |
| `description` | TEXT | NULL | - | شرح وظایف یگان |
| `sort_order` | INTEGER | NULL | 0 | ترتیب چیدمان |
| `is_active` | INTEGER | NULL | 1 | وضعیت فعالیت |
| `created_at` | TEXT | NULL | - | تاریخ ایجاد |
| `updated_at` | TEXT | NULL | - | تاریخ آخرین ویرایش |

---

## حوزه ۳: دوره‌های زمانی و همگام‌سازی

### ۶. جدول `periods` (دوره‌های زمانی و برنامه‌ای)
مدیریت دوره‌های زمانی ارزیابی و پایش دانش (مانند «دوره سال ۱۴۰۳»).

| نام فیلد | نوع داده | وضعیت Null | مقدار پیش‌فرض | کلید خارجی / توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NOT NULL | AUTOINCREMENT | کلید اصلی |
| `name` | TEXT | NOT NULL | - | عنوان دوره (مانند «دوره اول سال ۱۴۰۳») |
| `start_date` | TEXT | NOT NULL | - | تاریخ شروع به تقویم شمسی/میلادی |
| `end_date` | TEXT | NOT NULL | - | تاریخ پایان دوره |
| `is_active` | INTEGER | NULL | 0 | آیا دوره جاری و فعال سامانه است؟ (۱ بله، ۰ خیر) |
| `is_complete` | INTEGER | NULL | 0 | آیا دوره خاتمه‌یافته و فریز شده است؟ (۱ بله، ۰ خیر) |
| `description` | TEXT | NULL | - | توضیحات و اهداف کلان دوره |
| `created_at` | TEXT | NOT NULL | - | زمان ایجاد دوره |
| `updated_at` | TEXT | NOT NULL | - | زمان آخرین ویرایش دوره |

---

## حوزه ۴: درختواره‌ها و گره‌های دانش

### ۷. جدول `knowledge_trees` (سربرگ درختواره‌های دانش)
مدیریت انواع درختواره‌ها شامل: `required` (مورد نیاز)، `produced` (تولیدشده/موجود)، و `research` (پژوهشی).

| نام فیلد | نوع داده | وضعیت Null | مقدار پیش‌فرض | کلید خارجی / توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NOT NULL | AUTOINCREMENT | کلید اصلی |
| `name` | TEXT | NOT NULL | - | عنوان درختواره |
| `type` | TEXT | NOT NULL | - | نوع درختواره (`required` \| `produced` \| `research`) |
| `description` | TEXT | NULL | - | توضیحات درختواره |
| `period_id` | INTEGER | NULL | NULL | ارجاع به دوره زمانی: `FK -> periods(id)` |
| `base_id` | INTEGER | NULL | NULL | انتساب به پایگاه: `FK -> bases(id) ON DELETE SET NULL` |
| `unit_id` | INTEGER | NULL | NULL | انتساب به یگان: `FK -> units(id) ON DELETE SET NULL` |
| `is_active` | INTEGER | NULL | 1 | وضعیت فعالیت درختواره |
| `metadata` | TEXT | NULL | NULL | اطلاعات تکمیلی به صورت JSON |
| `created_at` | TEXT | NOT NULL | - | تاریخ ایجاد |
| `updated_at` | TEXT | NOT NULL | - | تاریخ ویرایش |

*ایندکس‌ها:* `knowledge_trees_type_idx` بر روی `type`، `knowledge_trees_period_idx` بر روی `period_id`.

### ۸. جدول `tree_nodes` (گره‌های درختواره دانش)
ساختار سلسله‌مراتب درختی ۶ سطحی: R (ریشه)، T (تخصص)، B (شاخه)، SB (زیرشاخه)، L (برگ دانش)، Q (پرسش‌های پژوهشی).

| نام فیلد | نوع داده | وضعیت Null | مقدار پیش‌فرض | کلید خارجی / توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NOT NULL | AUTOINCREMENT | کلید اصلی |
| `tree_id` | INTEGER | NOT NULL | - | ارجاع به درختواره: `FK -> knowledge_trees(id) ON DELETE CASCADE` |
| `parent_id` | INTEGER | NULL | NULL | ارجاع به گره والد: `FK -> tree_nodes(id) ON DELETE CASCADE` |
| `level` | TEXT | NOT NULL | - | کد سطح گره (`R`, `T`, `B`, `SB`, `L`, `Q`) |
| `title` | TEXT | NOT NULL | - | عنوان گره دانش |
| `description` | TEXT | NULL | - | توضیحات تفصیلی دانش |
| `knowledge_type` | TEXT | NULL | - | عنوان نوع دانش متناظر (مانند نظریه، الگو، آیین‌نامه) |
| `template_ids` | TEXT | NULL | - | شناسه‌های قالب‌های دانشی متناظر (رشته جداشده با کاما) |
| `instance_ids` | TEXT | NULL | - | شناسه‌های نمونه‌های تکمیل‌شده قالب‌ها (در درختواره موجود) |
| `level_id` | INTEGER | NULL | - | ارجاع به سطح دانش: `FK -> knowledge_levels(id)` |
| `sort_order` | INTEGER | NULL | 0 | اولویت چیدمان در شاخه |
| `is_gap` | INTEGER | NULL | 0 | آیا این گره در تحلیل شکاف، گپ تشخیص داده شده است؟ |
| `gap_status` | TEXT | NULL | - | وضعیت گپ (`open`, `filled`, `partially_filled`) |
| `metadata` | TEXT | NULL | NULL | متادیتای تکمیلی به صورت JSON |
| `created_at` | TEXT | NOT NULL | - | تاریخ ایجاد گره |
| `updated_at` | TEXT | NOT NULL | - | تاریخ ویرایش گره |

*ایندکس‌ها:* `tree_nodes_tree_idx`, `tree_nodes_parent_idx`, `tree_nodes_level_idx`.

---

## حوزه ۵: قالب‌ها، نمونه‌ها و سطوح دانش

### ۹. جدول `templates` (تعاریف قالب‌های دانشی)
قالب‌های استاندارد تدوین و تولید دانش.

| نام فیلد | نوع داده | وضعیت Null | مقدار پیش‌فرض | کلید خارجی / توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NOT NULL | AUTOINCREMENT | کلید اصلی |
| `type` | TEXT | NOT NULL | - | نوع یا دسته‌بندی قالب |
| `title` | TEXT | NOT NULL | - | عنوان قالب (مانند «دفترچه درس‌آموخته»، «طرح‌نامه پژوهشی») |
| `parent_id` | INTEGER | NULL | NULL | ارجاع خودارجاع به قالب والد: `FK -> templates(id)` |
| `description` | TEXT | NULL | - | راهنمای تکمیل قالب |
| `is_active` | INTEGER | NULL | 1 | فعال بودن قالب |
| `sort_order` | INTEGER | NULL | 0 | ترتیب نمایش |
| `metadata` | TEXT | NULL | NULL | فیلدهای ساخت‌یافته و پیکربندی قالب به فرمت JSON |
| `created_at` | TEXT | NOT NULL | - | تاریخ تعریف |
| `updated_at` | TEXT | NOT NULL | - | تاریخ ویرایش |

### ۱۰. جدول `template_instances` (نمونه‌های تکمیل‌شده قالب‌ها)
اسناد واقعی، شماره مراجع و مستندات پرشده توسط یگان‌ها بر اساس قالب‌ها.

| نام فیلد | نوع داده | وضعیت Null | مقدار پیش‌فرض | کلید خارجی / توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NOT NULL | AUTOINCREMENT | کلید اصلی |
| `template_id` | INTEGER | NOT NULL | - | ارجاع به قالب اصلی: `FK -> templates(id) ON DELETE CASCADE` |
| `title` | TEXT | NOT NULL | - | عنوان سند تکمیل‌شده |
| `reference_code` | TEXT | NULL | - | شماره نامه، کد بایگانی یا شماره ابلاغ سند |
| `description` | TEXT | NULL | - | خلاصه محتوای سند |
| `metadata` | TEXT | NULL | NULL | مقادیر فرم تکمیل‌شده به صورت JSON |
| `created_at` | TEXT | NOT NULL | - | تاریخ ثبت سند |
| `updated_at` | TEXT | NOT NULL | - | تاریخ ویرایش |

*ایندکس‌ها:* `template_instances_template_idx`.

### ۱۱. جدول `knowledge_levels` (سطوح بلوغ دانش)
رده‌بندی بلوغ دانشی (مانند مقدماتی، تبیینی، توسعه‌ای، نهادینه‌شده).

| نام فیلد | نوع داده | وضعیت Null | مقدار پیش‌فرض | کلید خارجی / توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NOT NULL | AUTOINCREMENT | کلید اصلی |
| `name` | TEXT | NOT NULL | - | عنوان سطح بلوغ |
| `description` | TEXT | NULL | - | شرح سطح |
| `parent_id` | INTEGER | NULL | NULL | سطح والد |
| `is_active` | INTEGER | NULL | 1 | فعال بودن |
| `sort_order` | INTEGER | NULL | 0 | ترتیب |
| `metadata` | TEXT | NULL | NULL | متادیتای JSON |
| `created_at` | TEXT | NOT NULL | - | تاریخ ایجاد |
| `updated_at` | TEXT | NOT NULL | - | تاریخ به‌روزرسانی |

---

## حوزه ۶: دارایی‌های دانشی و فایل‌ها

### ۱۲. جدول `knowledge_assets` (دارایی‌های دانشی ذخیره‌شده)
فایل‌ها و محصولات دانشی بارگذاری‌شده متصل به هر گره درختواره.

| نام فیلد | نوع داده | وضعیت Null | مقدار پیش‌فرض | کلید خارجی / توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NOT NULL | AUTOINCREMENT | کلید اصلی |
| `node_id` | INTEGER | NOT NULL | - | ارجاع به گره درختواره: `FK -> tree_nodes(id) ON DELETE CASCADE` |
| `title` | TEXT | NOT NULL | - | عنوان دارایی دانشی |
| `template_id` | INTEGER | NULL | NULL | ارجاع به قالب مربوطه: `FK -> templates(id)` |
| `level_id` | INTEGER | NULL | NULL | ارجاع به سطح دانش: `FK -> knowledge_levels(id)` |
| `description` | TEXT | NULL | - | شرح دارایی |
| `file_path` | TEXT | NULL | - | مسیر فیزیکی ذخیره فایل در سرور (`storage/assets/...`) |
| `file_type` | TEXT | NULL | - | نوع MIME فایل |
| `file_size` | INTEGER | NULL | - | حجم فایل به بایت |
| `status` | TEXT | NULL | 'draft' | وضعیت تایید دارایی (`draft`, `approved`, `archived`) |
| `metadata` | TEXT | NULL | NULL | متادیتای تکمیلی JSON |
| `created_at` | TEXT | NOT NULL | - | زمان بارگذاری |
| `updated_at` | TEXT | NOT NULL | - | زمان تغییرات |

*ایندکس‌ها:* `knowledge_assets_node_idx`.

### ۱۳. جدول `files` (فهرست عمومی فایل‌ها و پیوست‌های سامانه)

| نام فیلد | نوع داده | وضعیت Null | مقدار پیش‌فرض | کلید خارجی / توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NOT NULL | AUTOINCREMENT | کلید اصلی |
| `name` | TEXT | NOT NULL | - | نام اصلی فایل |
| `path` | TEXT | NOT NULL | - | مسیر ذخیره روی دیسک |
| `size` | INTEGER | NULL | - | اندازه به بایت |
| `type` | TEXT | NULL | - | پسوند فایل |
| `mime_type` | TEXT | NULL | - | نوع MIME استاندارد |
| `module` | TEXT | NULL | - | ماژول مربوطه (`issues`, `trees`, `assets`) |
| `module_id` | INTEGER | NULL | - | شناسه رکورد ماژول مربوطه |
| `uploaded_by` | INTEGER | NULL | NULL | کاربر آپلودکننده: `FK -> users(id) ON DELETE SET NULL` |
| `created_at` | TEXT | NOT NULL | - | زمان ایجاد |
| `updated_at` | TEXT | NOT NULL | - | زمان ویرایش |

---

## حوزه ۷: موتور تحلیل شکاف دانشی (Gaps)

### ۱۴. جدول `gaps` (شکاف‌های دانشی شناسایی‌شده)
نتایج تحلیل مقایسه‌ای بین درختواره مورد نیاز و درختواره موجود/تولیدشده.

| نام فیلد | نوع داده | وضعیت Null | مقدار پیش‌فرض | کلید خارجی / توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NOT NULL | AUTOINCREMENT | کلید اصلی |
| `period_id` | INTEGER | NULL | NULL | دوره زمانی تحلیل: `FK -> periods(id)` |
| `required_node_id` | INTEGER | NOT NULL | - | ارجاع به گره مورد نیاز: `FK -> tree_nodes(id) ON DELETE CASCADE` |
| `produced_node_id` | INTEGER | NULL | NULL | گره تولیدشده متناظر: `FK -> tree_nodes(id) ON DELETE CASCADE` |
| `status` | TEXT | NOT NULL | 'open' | وضعیت گپ (`open` باز، `filled` پوشش کامل، `partially_filled` نیمه‌پر) |
| `gap_type` | TEXT | NULL | - | نوع تطابق (`missing`, `incomplete`, `fuzzy`, `partial`, `complete`) |
| `priority` | TEXT | NULL | - | اولویت اقدام (`critical`, `high`, `medium`, `low` یا فارسی) |
| `matchScore` | REAL | NULL | 0 | امتیاز تطابق وزنی بین ۰ تا ۱ |
| `description` | TEXT | NULL | - | گزارش توصیفی فارسی از دلایل بروز شکاف |
| `metadata` | TEXT | NULL | NULL | جزئیات تفکیکی امتیازات و زنجیره مسیر مالکیت به فرمت JSON |
| `created_at` | TEXT | NOT NULL | - | زمان ثبت شکاف |
| `updated_at` | TEXT | NOT NULL | - | زمان آخرین به‌روزرسانی |

*ایندکس‌ها:* `gaps_period_idx`, `gaps_required_idx`, `gaps_status_idx`.

### ۱۵. جدول `gap_analysis_runs` (سوابق اجرای تحلیل شکاف)
ثبت تاریخچه کامل هر بار اجرای موتور تحلیل شکاف به همراه گزارش‌های تجمیعی.

| نام فیلد | نوع داده | وضعیت Null | مقدار پیش‌فرض | کلید خارجی / توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NOT NULL | AUTOINCREMENT | کلید اصلی |
| `required_tree_id`| INTEGER | NULL | - | شناسه درختواره مورد نیاز تحلیل‌شده |
| `produced_tree_id`| INTEGER | NULL | - | شناسه درختواره تولیدشده مقایسه‌شده |
| `total_leaves` | INTEGER | NULL | 0 | مجموع برگ‌های نیازمندی دانشی |
| `filled` | INTEGER | NULL | 0 | تعداد شکاف‌های کامل پر شده |
| `partial` | INTEGER | NULL | 0 | تعداد موارد با پوشش جزئی |
| `open_count` | INTEGER | NULL | 0 | تعداد شکاف‌های باز بدون پوشش |
| `coverage_percent`| REAL | NULL | 0 | درصد پوشش دانشی |
| `carried_reviews` | INTEGER | NULL | 0 | تعداد نظرات و اصلاحات دستی کاربر که حفظ و اعمال شده‌اند |
| `report` | TEXT | NULL | NULL | گزارش کامل آماری و متدولوژی به صورت JSON |
| `created_by` | INTEGER | NULL | - | شناسه کاربر اجراکننده تحلیل |
| `created_at` | TEXT | NOT NULL | - | تاریخ و زمان دقیق اجرا |

### ۱۶. جدول `gap_reviews` (بازنگری‌های دستی کارشناسان روی شکاف‌ها)
نگه‌داری نظرات کارشناسان برای تغییر وضعیت گپ‌ها مستقل از اجرای مجدد الگوریتم.

| نام فیلد | نوع داده | وضعیت Null | مقدار پیش‌فرض | کلید خارجی / توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NOT NULL | AUTOINCREMENT | کلید اصلی |
| `gap_id` | INTEGER | NULL | - | شناسه گپ متناظر |
| `required_node_id`| INTEGER | NULL | - | شناسه گره نیاز دانشی |
| `verdict` | TEXT | NOT NULL | - | حکم بازنگری (`confirmed_gap`, `not_gap`, `adjusted`) |
| `previous_status` | TEXT | NULL | - | وضعیت قبلی گپ |
| `new_status` | TEXT | NULL | - | وضعیت جدید اعمال‌شده توسط کاربر |
| `note` | TEXT | NULL | - | شرح و استدلال کارشناسی بازنگری |
| `reviewed_by` | INTEGER | NULL | - | شناسه کاربر بررسی‌کننده |
| `created_at` | TEXT | NOT NULL | - | زمان ثبت بازنگری |

*ایندکس‌ها:* `gap_reviews_node_idx`, `gap_reviews_gap_idx`.

---

## حوزه ۸: درختواره و آیتم‌های پژوهشی (Research)

### ۱۷. جدول `research_items` (موارد و آیتم‌های پژوهشی استخراج‌شده)
پل اتصال شکاف دانشی به پروژه‌ها و مسائل عملیاتی جهت رفع خلاءها.

| نام فیلد | نوع داده | وضعیت Null | مقدار پیش‌فرض | کلید خارجی / توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NOT NULL | AUTOINCREMENT | کلید اصلی |
| `gap_id` | INTEGER | NOT NULL | - | ارجاع به شکاف دانشی: `FK -> gaps(id) ON DELETE CASCADE` |
| `node_id` | INTEGER | NOT NULL | - | ارجاع به گره متناظر: `FK -> tree_nodes(id) ON DELETE CASCADE` |
| `period_id` | INTEGER | NULL | NULL | ارجاع به دوره زمانی: `FK -> periods(id)` |
| `issue_id` | INTEGER | NULL | NULL | ارجاع به مسئله ایجادشده در نظام مسائل: `FK -> issues(id)` |
| `is_part_of_seven_year_plan` | INTEGER | NULL | 0 | پوشش برنامه هفتم توسعه (۱ بله، ۰ خیر) |
| `is_part_of_annual_plan` | INTEGER | NULL | 0 | پوشش برنامه سالیانه |
| `is_part_of_directives` | INTEGER | NULL | 0 | پوشش تدابیر و ابلاغیات |
| `is_part_of_war_experience` | INTEGER | NULL | 0 | پوشش تجربیات دوران دفاع مقدس و جنگ |
| `program_coverages` | TEXT | NULL | NULL | آرایه JSON شناسه‌های پوشش‌های برنامه‌ای |
| `importance` | TEXT | NULL | - | سطح اهمیت (`راهبردی`, `عملیاتی`, `تاکتیکی`) |
| `combat_impact` | INTEGER | NULL | - | ضریب تأثیر در توان رزم (امتیاز ۱ تا ۵) |
| `cost_benefit` | INTEGER | NULL | - | نسبت هزینه‌فایده پروژه (امتیاز ۱ تا ۵) |
| `priority` | TEXT | NULL | - | اولویت پروژه پژوهشی |
| `time_frame` | TEXT | NULL | - | بازه زمانی (`کوتاه‌مدت`, `میان‌مدت`, `بلندمدت`) |
| `metadata` | TEXT | NULL | NULL | متادیتای تکمیلی به صورت JSON |
| `created_at` | TEXT | NOT NULL | - | تاریخ ایجاد |
| `updated_at` | TEXT | NOT NULL | - | تاریخ ویرایش |

*ایندکس‌ها:* `research_gap_idx`, `research_node_idx`, `research_period_idx`.

---

## حوزه ۹: نظام مسائل و اعتبارات (Issues)

### ۱۸. جدول `issues` (نظام جامع مسائل، پروژه‌ها و اعتبارات)
مرکزیت عملیاتی سامانه دانا با بیش از ۴۰ فیلد تخصصی، ساختار قراردادها، صورتجلسات مقاطع و ردیابی مالی.

| نام فیلد | نوع داده | وضعیت Null | مقدار پیش‌فرض | کلید خارجی / توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NOT NULL | AUTOINCREMENT | کلید اصلی مسئله |
| `period_id` | INTEGER | NULL | NULL | دوره زمانی مسئله: `FK -> periods(id)` |
| `research_item_id` | INTEGER | NULL | NULL | ارجاع به آیتم پژوهشی مبدأ: `FK -> research_items(id)` |
| `domain_node_id` | INTEGER | NULL | NULL | ارجاع به حوزه دانشی: `FK -> tree_nodes(id) ON DELETE SET NULL` |
| `source_issue_id` | INTEGER | NULL | NULL | ردیابی خط سیر مسئله مبدأ در دوره قبل: `FK -> issues(id) ON DELETE SET NULL` |
| `title` | TEXT | NOT NULL | - | عنوان مسئله / پروژه |
| `category` | TEXT | NULL | - | دسته‌بندی موضوعی (فنی، عملیاتی، آموزشی، فاوا، و ...) |
| `solution_direction` | TEXT | NULL | - | جهت‌گیری و راستای راه‌حل پیشنهادی |
| `responsible_unit` | TEXT | NULL | - | یگان متولی و مسئول حل مسئله |
| `confidentiality_level` | TEXT | NULL | 'عمومی' | سطح محرمانگی (عادی، محرمانه، خیلی محرمانه، سری، به‌کلی سری) |
| `action_priority` | TEXT | NULL | 'متوسط' | اولویت اقدام (بحرانی، خیلی زیاد، زیاد، متوسط، پایین) |
| `approval_date` | TEXT | NULL | - | تاریخ تصویب مسئله |
| `knowledge_type` | TEXT | NULL | - | نوع دانش منتج از حل مسئله |
| `project_level` | TEXT | NULL | 'سطح۱' | سطح پروژه (راهبردی، سطح ۱، سطح ۲، تاکتیکی، عملیاتی) |
| `approval_authority` | TEXT | NULL | - | مرجع تصویب‌کننده (شورای عالی، فرماندهی نیرو، ...) |
| `research_project_type`| TEXT | NULL | - | نوع پروژه پژوهشی |
| `knowledge_project_type`| TEXT | NULL | - | نوع پروژه دانشی |
| `events` | TEXT | NULL | - | رویدادها، همایش‌ها یا کارگاه‌های مرتبط |
| `macro_project` | TEXT | NULL | NULL | اطلاعات کلان‌پروژه بالادستی (JSON: `title`, `manager`, ...) |
| `scientific_diplomacy` | TEXT | NULL | - | سطح دیپلماسی علمی (درون‌سازمانی، نیروهای مسلح، ملی، بین‌المللی) |
| `collaborators` | TEXT | NULL | - | اسامی پژوهشگران و همکاران |
| `collaboration_network`| TEXT | NULL | NULL | شبکه همکاری‌های داخلی و خارجی (JSON: `internal`, `external`) |
| `reference_document` | TEXT | NULL | - | سند بالادستی، ابلاغیه یا مرجع تصویب |
| `required_budget` | REAL | NULL | 0 | بودجه و اعتبار مورد نیاز به ریال |
| `approved_budget` | REAL | NULL | 0 | بودجه و اعتبار مصوب نهایی به ریال |
| `assigned_budget` | REAL | NULL | 0 | بودجه و اعتبار واگذار و پرداخت شده به ریال |
| `expected_months` | INTEGER | NULL | 0 | مدت زمان تخمینی اجرا به ماه |
| `completion_percent` | INTEGER | NULL | 0 | درصد پیشرفت وزنی تحقق پروژه (۰ تا ۱۰۰) |
| `actions_taken` | TEXT | NULL | - | اقدامات اجرایی انجام‌شده تا این لحظه |
| `bottlenecks` | TEXT | NULL | - | گلوگاه‌ها، موانع و چالش‌های مسیر اجرا |
| `orders` | TEXT | NULL | - | تدابیر و دستورات ابلاغی فرماندهی |
| `issue_resolution_team`| TEXT | NULL | NULL | اعضای تیم حل مسئله (JSON آرایه‌ای از اعضا) |
| `need_statement` | TEXT | NULL | NULL | بیانیه تفصیلی نیاز (JSON: `user`, `problem`, `suggestedBudget`, ...) |
| `contract` | TEXT | NULL | NULL | جزئیات قرارداد رسمی (JSON: `number`, `executor`, `amount`, ...) |
| `executive_contract` | TEXT | NULL | NULL | قرارداد شورای اجرایی (JSON: `file`, `minutes`) |
| `stage_20` | TEXT | NULL | NULL | اطلاعات مقطع ۲۰٪ پیشرفت (JSON: دفاع، صورتجلسه، پرداخت مالی) |
| `stage_50` | TEXT | NULL | NULL | اطلاعات مقطع ۵۰٪ پیشرفت (JSON: دفاع، صورتجلسه، پرداخت مالی) |
| `stage_100` | TEXT | NULL | NULL | اطلاعات مقطع ۱۰۰٪ نهایی (JSON: دفاع، صورتجلسه، تسویه مالی) |
| `application` | TEXT | NULL | NULL | اطلاعات کاربست و بهره‌برداری عملیاتی از نتایج (JSON) |
| `status` | TEXT | NULL | 'pending' | وضعیت اجرایی (`pending`, `in_progress`, `completed`, `canceled`, `on_hold`) |
| `metadata` | TEXT | NULL | NULL | متادیتای تکمیلی و تاریخچه اسنپ‌شات دوره‌ها |
| `created_at` | TEXT | NOT NULL | - | زمان ثبت در سامانه |
| `updated_at` | TEXT | NOT NULL | - | زمان آخرین تغییرات |

*ایندکس‌ها:* `issues_period_idx`, `issues_research_idx`, `issues_status_idx`, `issues_source_issue_idx`.

### ۱۹. جدول `issue_templates` (قالب‌های منتسب به مسئله)
جدول رابط چندبه‌چند بین مسائل و قالب‌های دانشی.

| نام فیلد | نوع داده | وضعیت Null | مقدار پیش‌فرض | کلید خارجی / توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NOT NULL | AUTOINCREMENT | کلید اصلی |
| `issue_id` | INTEGER | NOT NULL | - | ارجاع به مسئله: `FK -> issues(id) ON DELETE CASCADE` |
| `template_id` | INTEGER | NOT NULL | - | ارجاع به قالب: `FK -> templates(id) ON DELETE CASCADE` |

### ۲۰. جدول `issue_attachments` (پیوست‌ها و مستندات مسئله)

| نام فیلد | نوع داده | وضعیت Null | مقدار پیش‌فرض | کلید خارجی / توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NOT NULL | AUTOINCREMENT | کلید اصلی |
| `issue_id` | INTEGER | NOT NULL | - | ارجاع به مسئله: `FK -> issues(id) ON DELETE CASCADE` |
| `file_path` | TEXT | NOT NULL | - | مسیر فیزیکی فایل پیوست |
| `file_name` | TEXT | NOT NULL | - | نام اصلی فایل |
| `file_size` | INTEGER | NULL | - | حجم فایل به بایت |
| `file_type` | TEXT | NULL | - | نوع MIME فایل |
| `field_tag` | TEXT | NULL | - | تگ فیلد مرتبط در فرم مسئله (need, contract, stage20, ...) |
| `uploaded_at` | TEXT | NOT NULL | - | تاریخ بارگذاری |
| `uploaded_by` | INTEGER | NULL | NULL | کاربر آپلودکننده: `FK -> users(id) ON DELETE SET NULL` |

---

## حوزه ۱۰: تاریخچه تغییرات و ممیزی (Audit & History)

### ۲۱. جدول `issue_history` (تاریخچه تغییرات هر فیلد مسئله)
ثبت دقیق تمام ویرایش‌ها بر روی فیلدهای هر مسئله به تفکیک کاربر و زمان.

| نام فیلد | نوع داده | وضعیت Null | مقدار پیش‌فرض | کلید خارجی / توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NOT NULL | AUTOINCREMENT | کلید اصلی |
| `issue_id` | INTEGER | NOT NULL | - | ارجاع به مسئله: `FK -> issues(id) ON DELETE CASCADE` |
| `field` | TEXT | NOT NULL | - | نام فیلد تغییریافته (مانند `completionPercent`, `status`, `approvedBudget`) |
| `old_value` | TEXT | NULL | - | مقدار قبلی فیلد |
| `new_value` | TEXT | NULL | - | مقدار جدید اعمال‌شده |
| `changed_by` | INTEGER | NULL | NULL | کاربر اعمال‌کننده تغییرات: `FK -> users(id) ON DELETE SET NULL` |
| `changed_at` | TEXT | NOT NULL | - | زمان دقیق تغییر به وقت ISO |

*ایندکس‌ها:* `history_issue_idx`.

### ۲۲. جدول `audit_logs` (لاگ‌های امنیتی و ممیزی سامانه)
ثبت رخدادهای ورود، خروج، ایجاد، ویرایش و حذف در تمام بخش‌های نرم‌افزار.

| نام فیلد | نوع داده | وضعیت Null | مقدار پیش‌فرض | کلید خارجی / توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NOT NULL | AUTOINCREMENT | کلید اصلی |
| `user_id` | INTEGER | NULL | NULL | کاربر انجام‌دهنده عملیات: `FK -> users(id) ON DELETE CASCADE` |
| `action` | TEXT | NOT NULL | - | نوع عملیات (`LOGIN_SUCCESS`, `CREATE`, `UPDATE`, `DELETE`, ...) |
| `entity_name` | TEXT | NOT NULL | - | نام موجودیت تحت تأثیر (مانند «مسئله»، «درختواره»، «کاربر») |
| `entity_id` | INTEGER | NOT NULL | - | شناسه رکورد مرتبط |
| `changes` | TEXT | NOT NULL | - | جزئیات مقادیر قبل و بعد به صورت متن یا JSON |
| `ip` | TEXT | NULL | - | آدرس IP کلاینت |
| `user_agent` | TEXT | NULL | - | مرورگر و مشخصات سیستم کلاینت |
| `timestamp` | TEXT | NOT NULL | - | زمان رخداد |

*ایندکس‌ها:* `audit_entity_idx`.

---

## حوزه ۱۱: تبادل اطلاعات، نسخه‌بندی و حل تعارضات آفلاین یگان‌ها

### ۲۳. جدول `sync_versions` (مدیریت نسخه‌های تبادل داده یگان‌ها)
ثبت بسته‌های خروجی/ورودی فایل‌های اکسل و سی‌دی‌های تبادل اطلاعات میان یگان‌ها و ستاد.

| نام فیلد | نوع داده | وضعیت Null | مقدار پیش‌فرض | کلید خارجی / توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NOT NULL | AUTOINCREMENT | کلید اصلی |
| `unit_id` | INTEGER | NULL | NULL | یگان ارائه‌دهنده بسته: `FK -> units(id) ON DELETE CASCADE` |
| `period_id` | INTEGER | NULL | NULL | دوره زمانی مربوطه: `FK -> periods(id) ON DELETE CASCADE` |
| `version_number` | INTEGER | NOT NULL | 1 | شماره نسخه تبادل |
| `version_label` | TEXT | NOT NULL | - | برچسب نسخه (مانند «نسخه ۱ - ارسالی مهر ۱۴۰۳») |
| `file_name` | TEXT | NULL | - | نام فایل بارگذاری‌شده |
| `source_type` | TEXT | NULL | 'excel_cd' | شیوه دریافت (`excel_cd`, `network_sync`) |
| `applied_by` | INTEGER | NULL | NULL | کاربر ثبت‌کننده بسته: `FK -> users(id) ON DELETE SET NULL` |
| `user_name` | TEXT | NULL | - | نام کاربری شخص ثبت‌کننده |
| `summary` | TEXT | NULL | NULL | خلاصه آماری رکوردهای بسته به صورت JSON |
| `status` | TEXT | NULL | 'active' | وضعیت نسخه (`active`, `superseded`, `archived`) |
| `created_at` | TEXT | NOT NULL | - | زمان اعمال نسخه |

*ایندکس‌ها:* `sync_versions_unit_idx`, `sync_versions_period_idx`.

### ۲۴. جدول `record_version_logs` (لاگ جزئی تغییرات رکوردها و حل تعارضات)
ثبت تصمیمات تطبیق، ادغام یا حل تعارض رکوردها در حین وارد کردن فایل‌های آفلاین.

| نام فیلد | نوع داده | وضعیت Null | مقدار پیش‌فرض | کلید خارجی / توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NOT NULL | AUTOINCREMENT | کلید اصلی |
| `version_id` | INTEGER | NOT NULL | - | ارجاع به نسخه تبادل: `FK -> sync_versions(id) ON DELETE CASCADE` |
| `entity_type` | TEXT | NOT NULL | - | نوع موجودیت (`tree_node`, `issue`, `research`) |
| `entity_id` | INTEGER | NOT NULL | - | شناسه رکورد در دیتابیس |
| `entity_title` | TEXT | NOT NULL | - | عنوان رکورد جهت بازبینی انسانی |
| `action` | TEXT | NOT NULL | - | عملیات انجام‌شده (`create`, `update`, `conflict_merge`, `keep_existing`) |
| `field_name` | TEXT | NULL | - | نام فیلد دارای تفاوت |
| `old_value` | TEXT | NULL | - | مقدار موجود در پایگاه داده فعلی |
| `new_value` | TEXT | NULL | - | مقدار جدید واردشده از فایل |
| `conflict_detected`| INTEGER | NULL | 0 | آیا تعارض شناسایی شده است؟ (۱ بله، ۰ خیر) |
| `resolution_choice`| TEXT | NULL | - | گزینه انتخابی حل تعارض (`incoming`, `existing`, `smart_merge`) |
| `resolved_by` | TEXT | NULL | - | نام کاربر حل‌کننده تعارض |
| `created_at` | TEXT | NOT NULL | - | زمان ثبت لاگ |

*ایندکس‌ها:* `record_version_logs_version_idx`, `record_version_logs_entity_idx`.

### ۲۵. جدول `tree_merges` (سوابق تلفیق لایه‌ای درختواره‌ها)
تاریخچه ادغام درختواره‌های رده‌های هم‌سطح به رده بالاتر ستادی.

| نام فیلد | نوع داده | وضعیت Null | مقدار پیش‌فرض | کلید خارجی / توضیحات |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NOT NULL | AUTOINCREMENT | کلید اصلی |
| `tree_id` | INTEGER | NOT NULL | - | درختواره مقصد تلفیق: `FK -> knowledge_trees(id) ON DELETE CASCADE` |
| `source_label` | TEXT | NULL | - | عنوان منابع تلفیق‌شده |
| `source_type` | TEXT | NULL | - | منبع ورودی (`excel`, `tree`) |
| `source_tree_id`| INTEGER | NULL | - | شناسه درختواره منبع در صورت وجود |
| `added` | INTEGER | NULL | 0 | تعداد گره‌های جدید اضافه‌شده |
| `updated` | INTEGER | NULL | 0 | تعداد گره‌های به‌روزرسانی‌شده |
| `conflicts` | INTEGER | NULL | 0 | تعداد تعارضات شناسایی‌شده |
| `skipped` | INTEGER | NULL | 0 | تعداد رکوردهای تکراری نادیده‌گرفته‌شده |
| `details` | TEXT | NULL | NULL | گزارش ریز عملیات تلفیق به صورت JSON |
| `created_by` | INTEGER | NULL | - | شناسه کاربر مجری تلفیق |
| `created_at` | TEXT | NOT NULL | - | تاریخ اجرای تلفیق |

*ایندکس‌ها:* `tree_merges_tree_idx`.

---

## حوزه ۱۲: تعاریف پایه و کاتالوگ‌های متادیتا

این جداول کاتالوگ‌های استاندارد واژگان، مقادیر مجاز دراپ‌دان‌ها و دسته‌بندی‌های مصوب سازمانی را نگه‌داری می‌کنند. تمام این جداول دارای فیلدهای `id` (کلید اصلی)، `name` (عنوان مصوب)، `is_active` (فعال بودن) و `sort_order` (ترتیب) هستند:

| ردیف | نام جدول | شرح و کاربرد در سامانه |
| :--- | :--- | :--- |
| ۲۶ | `knowledge_types` | انواع دانش (نظریه، الگو، راهبرد، راه‌کار و توصیه، دانش نوظهور، معماری، دانش فنی، نقشه‌راه، ایده، سناریو، درس‌آموخته، آیین‌نامه و ...) |
| ۲۷ | `action_priorities` | اولویت‌های اقدام مسائل و پروژه‌ها (بحرانی، خیلی زیاد، زیاد، متوسط، پایین) |
| ۲۸ | `project_levels` | سطوح کلان پروژه‌ها (راهبردی، سطح ۱، سطح ۲، تاکتیکی، عملیاتی) |
| ۲۹ | `confidentiality_levels` | سطوح محرمانگی و حفاظت اسناد (عادی، محرمانه، خیلی محرمانه، سری، به‌کلی سری) |
| ۳۰ | `approval_authorities` | مراجع رسمی تصویب طرح‌ها (شورای عالی دانش و پژوهش، فرماندهی نیرو، معاونت دانش و پژوهش، ...) |
| ۳۱ | `knowledge_project_types` | انواع پروژه‌های دانشی (مستندسازی دانش، تجربه‌نگاری، تاریخ شفاهی، درس‌آموخته، ...) |
| ۳۲ | `research_project_types` | انواع پروژه‌های پژوهشی (آینده‌پژوهی، نقد و مناظره، طرح راهبردی، مطالعات تطبیقی، ...) |
| ۳۳ | `scientific_diplomacy_levels` | سطوح تعامل و دیپلماسی علمی (درون‌سازمانی، بین‌سازمانی نیروهای مسلح، ملی و کشوری، بین‌المللی) |
| ۳۴ | `program_coverages` | اسناد و پوشش‌های برنامه‌ای بالادستی (برنامه پنج ساله، برنامه سالیانه، ابلاغیات، تجربیات جنگ) |
| ۳۵ | `organizational_levels` | ساختار سلسله‌مراتب رده‌های سازمانی مصوب آجا |
| ۳۶ | `knowledge_domains` | حوزه‌های تخصصی و دانشی علوم و فناوری‌های نرم و شناختی |
| ۳۷ | `tree_node_types` | انواع نقش‌های مفهومی گره‌های ساختار درختی |
| ۳۸ | `research_networks` | شبکه‌های همکار پژوهشی و مراکز تحقیقاتی مرجع |
| ۳۹ | `event_types` | انواع رویدادهای علمی، نشست‌های نقد و کرسی‌های نظریه‌پردازی |

---

## راهنمای ساختار فیلدهای متنی JSON (Payloads)

در جدول `issues` و برخی جداول تحلیلی، تعدادی از ساختارهای چندبُعدی به صورت JSON استاندارد ذخیره می‌شوند:

### ۱. ساختار `issue_resolution_team` (تیم حل مسئله)
```json
[
  {
    "id": 1,
    "name": "سرهنگ پژوهشگر علی محمدی",
    "role": "مدیر پروژه",
    "rank": "سرهنگ",
    "organization": "پژوهشکده هوش مصنوعی"
  }
]
```

### ۲. ساختار `need_statement` (بیانیه نیاز)
```json
{
  "user": "معاونت عملیات",
  "problem": "شرح دقیق چالش عملیاتی و نیاز دانشی مورد مطالبه...",
  "suggestedBudget": 2500000000,
  "level": "سطح ۱",
  "file": { "name": "proposal_signed.pdf" },
  "approvalStatus": "approved",
  "approvalDate": "1403/04/10",
  "approvedAmount": 2500000000
}
```

### ۳. ساختار `contract` (اطلاعات قرارداد)
```json
{
  "number": "ق/1403/482",
  "executor": "دانشگاه علوم و فنون هوایی",
  "collaborators": ["مرکز تحقیقات فاوا", "صنایع هوایی"],
  "agents": ["دکتر حسینی"],
  "date": "1403/05/01",
  "startDate": "1403/05/15",
  "duration": 12,
  "amount": 2500000000,
  "file": { "name": "contract_final.pdf" }
}
```

### ۴. ساختار مقاطع پیشرفت (`stage_20`, `stage_50`, `stage_100`)
```json
{
  "proposal": "عنوان گزارش مقطع یا خلاصه نتایج مرحله",
  "defenseDate": "1403/08/20",
  "minutes": "شماره صورتجلسه دفاعیه: ص/1403/99",
  "paidAmount": 500000000,
  "paymentDate": "1403/08/25",
  "file": { "name": "stage_report.pdf" },
  "minutesFile": { "name": "defense_minutes.pdf" },
  "recordsFiles": []
}
```

### ۵. ساختار `application` (کاربست و بهره‌برداری)
```json
{
  "resultReflection": "شرح نحوه پیاده‌سازی و کاربست دستاوردهای علمی در توان رزم",
  "applicationType": "عملیاتی مستقیم",
  "applicationDate": "1403/11/30",
  "minutes": "صورتجلسه نهایی کارگروه کاربست",
  "workingGroup": "کارگروه رزم زمینی و شناختی"
}
```

---

## جمع‌بندی و تضمین انطباق
این ساختار پایگاه داده، پوشش ۱۰۰ درصدی کلیه نیازمندی‌های مدل دانشی حوزه علوم و فناوری‌های نرم و شناختی آجا را تضمین می‌کند و در تمام سطوح کارشناسی و مدیریتی بدون هرگونه تداخل یا از دست رفتن داده‌ها عمل می‌نماید.
