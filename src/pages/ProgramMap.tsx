import { ArrowRight, Code2, Database, FileText, GitBranch, Layers3, Search, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import packageInfo from '../../package.json';

const fileGroups = [
  {
    title: 'نقطهٔ شروع، ساخت و بسته‌بندی',
    icon: Code2,
    files: [
      ['package.json', 'نسخهٔ رسمی برنامه، وابستگی‌ها، فرمان‌های ساخت و تنظیمات electron-builder/NSIS. نسخهٔ نمایش‌داده‌شده نیز از همین فایل خوانده می‌شود.'],
      ['electron-main.cjs', 'راه‌اندازی پنجرهٔ Electron، انتخاب پورت آزاد، اجرای سرور محلی، تعیین مسیر دادهٔ کاربر و بارگذاری رابط کاربری.'],
      ['server.ts', 'ساخت سرور Express، ثبت APIها، مقداردهی پایگاه داده و ارائهٔ فایل‌های رابط کاربری در حالت دسکتاپ/توسعه.'],
      ['vite.config.ts', 'پیکربندی Vite، افزونه‌های React و Tailwind، تولید کاتالوگ متن‌های ثابت و تقسیم بسته‌های رابط کاربری.'],
      ['index.html', 'قالب HTML اولیهٔ رابط کاربری و محل mount شدن برنامهٔ React.'],
      ['tsconfig.json و tsconfig.app.json', 'تنظیمات TypeScript برای کنترل نوع‌ها و ساختار کد.'],
      ['installer/installer.nsh', 'تنظیمات اختصاصی NSIS در فرآیند ساخت نصب‌کنندهٔ ویندوز.'],
      ['src/main.tsx', 'نقطهٔ ورود React؛ راه‌اندازی مدیریت خطا/پیام‌ها، افزودن نشست به درخواست‌های API محلی و نمایش نسخهٔ واقعی بسته در کنسول توسعه.'],
      ['src/App.tsx', 'تعریف مسیریابی، محافظت نشست، بارگذاری تنظیمات عمومی و اتصال صفحات برنامه.'],
      ['src/config/appConfig.ts', 'تنظیمات محلی برنامه مانند مسیر پیش‌فرض خروجی اکسل و حالت مستقل.'],
    ],
  },
  {
    title: 'رابط کاربری و صفحه‌ها',
    icon: Layers3,
    files: [
      ['src/components/layout/Topbar.tsx', 'نوار بالایی، جستجو، انتخاب دوره، تم، تاریخ و میانبرهای برنامه؛ نقشهٔ برنامه فقط برای superadmin.'],
      ['src/components/layout/Sidebar.tsx و src/config/menuConfig.ts', 'ساخت منوی کناری، گروه‌بندی صفحه‌ها و فیلتر گزینه‌ها بر اساس نقش و مجوز.'],
      ['src/components/layout/MainLayout.tsx و src/components/layout/Breadcrumbs.tsx', 'قالب مشترک صفحات واردشده، چیدمان سایدبار/محتوا، یادآوری غیرمزاحم پیش‌نیازهای ساختار/دوره و مسیر راهنمای صفحه.'],
      ['src/components/layout/AuthGuard.tsx', 'جلوگیری از دسترسی بدون نشست و کنترل قفل خودکار صفحه.'],
      ['src/pages/Login.tsx', 'ورود کاربر، کپچای محلی و نمایش درخواست بازنشانی رمز.'],
      ['src/components/auth/ResetPasswordModal.tsx', 'بازنشانی آفلاین رمز با کلید بازیابی؛ پنجره با ارتفاع محدود به صفحه و محتوای قابل پیمایش.'],
      ['src/components/auth/OfflineCaptcha.tsx', 'تولید و بررسی کپچا در مرورگر، بدون سرویس بیرونی.'],
      ['src/pages/ProgramMap.tsx', 'همین راهنمای فنی: فهرست فایل‌ها، مسئولیت‌ها، نسخه و نکات امن برای توسعه و انتشار.'],
      ['src/pages/Guide.tsx و src/components/ArchitectureDoc.tsx', 'راهنمای کاربری، گردش‌کارها و معرفی کلی معماری و قابلیت‌ها.'],
      ['src/pages/Dashboard.tsx', 'داشبورد و شاخص‌های کلی سامانه.'],
      ['src/pages/Trees/RequiredTree.tsx و src/pages/Trees/ProducedTree.tsx', 'مدیریت درختوارهٔ نیازمندی‌ها و درختوارهٔ دانش/دارایی‌های تولیدشده.'],
      ['src/pages/Gaps/GapAnalysis.tsx', 'گردش‌کار انتخاب درخت‌ها، اجرای تحلیل، مشاهده/بازبینی/تکمیل شکاف و خروجی‌گیری.'],
      ['src/components/gaps/AnalysisTimeline.tsx', 'نمایش مرحله‌ها و پیشرفت اجرای تحلیل شکاف.'],
      ['src/components/gaps/RelationalView.tsx', 'نمایش رابطهٔ نیازها، دارایی‌های تولیدشده، شکاف‌ها و پژوهش‌ها.'],
      ['src/components/gaps/GapVisualization.tsx', 'تجسم گرافیکی داده‌ها و شاخص‌های مرتبط با شکاف.'],
      ['src/pages/Research/ResearchTree.tsx', 'مدیریت درخت و اقلام پژوهشی مرتبط با نیازها و شکاف‌ها.'],
      ['src/pages/Issues/IssueSystem.tsx', 'صفحهٔ اصلی فهرست مسائل و دسترسی به جزئیات/عملیات هر مسئله.'],
      ['src/pages/Outputs/Outputs.tsx و src/pages/DynamicReports.tsx', 'تهیهٔ خروجی‌ها و گزارش‌های قابل تنظیم.'],
      ['src/pages/Users.tsx و src/pages/Roles.tsx', 'مدیریت کاربران، نقش‌ها و دسترسی‌ها.'],
      ['src/pages/Settings.tsx و src/pages/Definitions.tsx', 'تنظیمات سامانه و مدیریت تعاریف پایه.'],
      ['src/pages/UiTextSettings.tsx و src/utils/uiText.ts', 'جستجو، صفحه‌بندی، ذخیره و بازگردانی عنوان‌های ثابت رابط؛ متن‌های سفارشی به‌صورت محلی در همین نصب نگهداری می‌شوند.'],
      ['src/pages/OrgStructure.tsx و src/pages/Periods.tsx', 'مدیریت ساختار سازمانی و دوره‌های زمانی.'],
      ['src/pages/Files.tsx و src/components/ImportPreviewModal.tsx', 'مدیریت فایل‌ها و پیش‌نمایش امن داده‌های ورودی پیش از ثبت.'],
      ['src/pages/Profile.tsx و src/pages/AuditLog.tsx', 'پروفایل کاربر و مشاهدهٔ سوابق ممیزی.'],
      ['src/pages/Templates.tsx و src/components/DynamicMetadataManager.tsx', 'مدیریت قالب‌های دانشی و فراداده‌های پویا.'],
      ['src/pages/Wizard/ProcessWizard.tsx', 'راهنمای مرحله‌ای اجرای فرایندهای تعریف‌شده در برنامه.'],
      ['src/pages/DeepSearch.tsx', 'جستجوی عمیق در داده‌ها و محتوای ثبت‌شده.'],
      ['src/components/ErrorBoundary.tsx', 'نمایش جایگزین کنترل‌شده هنگام بروز خطای render در React.'],
      ['src/components/BaseDataSelect.tsx', 'انتخاب و مدیریت داده‌های پایه در فرم‌ها.'],
      ['src/components/CommandPalette.tsx', 'پالت میانبرها و دسترسی سریع به فرمان‌ها و صفحه‌ها.'],
      ['src/components/DynamicFieldsManager.tsx', 'تعریف و مدیریت فیلدهای پویای فرم‌ها.'],
      ['src/components/DynamicMetadataManager.tsx', 'مدیریت فراداده‌های قابل تنظیم سامانه.'],
      ['src/components/dashboard/Widget.tsx و WidgetManager.tsx', 'نمایش ابزارک داشبورد و انتخاب/چیدمان ابزارک‌های قابل نمایش.'],
      ['src/components/icon/ExcelIcon.tsx و ExcelIcon.jsx', 'آیکون بومی فایل اکسل برای کنترل‌های خروجی.'],
      ['src/components/issues/IssueDetailsModal.tsx', 'نمایش جزئیات و عملیات مسئله در پنجرهٔ محاوره‌ای.'],
      ['src/components/issues/IssueFilters.tsx', 'فیلتر و جستجوی فهرست مسائل.'],
      ['src/components/issues/IssueFormTabs.tsx', 'تب‌بندی فرم چندبخشی شناسنامهٔ مسئله.'],
      ['src/components/issues/KanbanBoard.tsx', 'نمایش مسائل در ستون‌های گردش‌کار کانبان.'],
      ['src/components/issues/PeriodRolloverModal.tsx', 'رابط انتقال/تمدید مسائل میان دوره‌های زمانی.'],
      ['src/components/issues/tabs/ActionsTab.tsx', 'اقدامات و پیگیری‌های مرتبط با مسئله.'],
      ['src/components/issues/tabs/ApplicationTab.tsx و BudgetTab.tsx', 'اطلاعات کاربردی و مالی/بودجهٔ مسئله.'],
      ['src/components/issues/tabs/CollaborationTab.tsx و TeamTab.tsx', 'همکاری‌ها، مشارکت‌کنندگان و تیم اجرای مسئله.'],
      ['src/components/issues/tabs/ContractTab.tsx و ExecutiveContractTab.tsx', 'جزئیات قرارداد و قرارداد اجرایی.'],
      ['src/components/issues/tabs/GeneralTab.tsx و NeedTab.tsx', 'مشخصات عمومی و شرح نیاز مسئله.'],
      ['src/components/issues/tabs/ProjectsTab.tsx و StagesTab.tsx', 'پروژه‌های پیوندخورده و مرحله‌های پیشرفت.'],
      ['src/components/issues/tabs/types.ts', 'نوع‌های مشترک داده/props برای تب‌های فرم مسئله.'],
      ['src/components/shared/ExcelExportButton.tsx و src/utils/reportExport.ts', 'تولید فایل اکسل از داده‌های قابل مشاهدهٔ صفحه و تهیهٔ پیش‌نمایش PDF؛ صفحه‌های بدون دادهٔ گزارشی برای PDF غیرفعال هستند.'],
      ['src/components/shared/PdfPreview.tsx', 'پیش‌نمایش محلی خروجی PDF در رابط.'],
      ['src/components/trees/NodeCard.tsx و NodeForm.tsx', 'نمایش کارت گره و فرم ساخت/ویرایش گره.'],
      ['src/components/trees/TreeIndexPage.tsx و TreeSettingsPanel.tsx', 'فهرست/صفحهٔ آغاز درخت و تنظیمات درختواره.'],
      ['src/components/trees/TreeVisualization.tsx و index.ts', 'تجسم گرافیکی درخت و نقطهٔ ورود صادراتی اجزای درخت.'],
      ['src/components/ui/AdvancedQueryBuilder.tsx و FuzzySearch.tsx', 'ساخت فیلترهای ترکیبی و جستجوی فازی.'],
      ['src/components/ui/ConfirmModal.tsx و FormControls.tsx', 'تأیید عملیات و کنترل‌های مشترک فرم.'],
      ['src/components/ui/CurrencyInput.tsx و src/components/ui/SearchableSelect.tsx', 'ورودی مبلغ و انتخاب‌گر جستجوپذیر.'],
      ['src/components/ui/PageToolbar.tsx و src/components/ui/PersianDatePicker.tsx', 'نوار ابزار صفحه و انتخاب تاریخ شمسی.'],
      ['src/components/ui/SearchableSelect.tsx', 'فهرست کشویی جستجوپذیر برای انتخاب مقدار از گزینه‌ها.'],
      ['src/components/trees/TreeIndexPage.tsx', 'صفحهٔ فهرست/ورود به مدیریت درخت‌ها.'],
      ['src/components/trees/TreeSettingsPanel.tsx', 'ویرایش تنظیمات درختواره.'],
      ['src/components/trees/TreeVisualization.tsx', 'نمایش بصری درختواره.'],
      ['src/components/trees/index.ts', 'صادرات عمومی اجزای پوشهٔ درخت‌ها.'],
      ['src/pages/AuditLog.tsx', 'فهرست سوابق ممیزی و فعالیت‌های ثبت‌شده.'],
      ['src/pages/DynamicReports.tsx', 'ساخت گزارش با معیارها و فیلترهای پویا.'],
      ['src/pages/Definitions.tsx و src/pages/Templates.tsx', 'تعریف داده‌های مرجع و قالب‌های دانشی.'],
      ['src/pages/Files.tsx و src/pages/Outputs/Outputs.tsx', 'مدیریت فایل‌ها و صفحهٔ گزارش/خروجی‌های سامانه.'],
      ['src/pages/OrgStructure.tsx و src/pages/Periods.tsx', 'مدیریت سازمان و دوره‌های زمانی.'],
      ['src/pages/Profile.tsx و src/pages/Settings.tsx', 'پروفایل شخصی و تنظیمات سامانه.'],
      ['src/pages/Roles.tsx و src/pages/Users.tsx', 'مدیریت نقش‌ها/مجوزها و حساب کاربران.'],
      ['src/pages/Trees/components/TreeGraphView.tsx', 'نمای گرافیکی و تعاملی گره‌های درخت.'],
      ['src/pages/Trees/components/TreeHelp.tsx و TreeLevelsHelp.tsx', 'راهنمای درختواره و تعریف سطح‌های آن.'],
      ['src/pages/Trees/components/TreeNodeList.tsx و TreeStats.tsx', 'فهرست گره‌ها و آمار ساختاری درخت.'],
      ['src/pages/Trees/constants/treeLevels.ts', 'ثابت‌های سطح‌بندی درخت دانش.'],
      ['src/pages/Trees/hooks/useTreeData.ts', 'دریافت و آماده‌سازی داده‌های صفحه‌های درخت.'],
      ['src/pages/Trees/modals/AssetModal.tsx و ManualConnectionModal.tsx', 'مدیریت دارایی و ایجاد پیوند دستی بین گره‌ها.'],
      ['src/pages/Trees/modals/NodeModal.tsx و TreeModal.tsx', 'پنجرهٔ ویرایش گره و مشخصات درخت.'],
      ['src/pages/Trees/modals/TemplateModal.tsx', 'اتصال یا ویرایش قالب‌های دانش گره.'],
      ['src/pages/Guide.tsx و src/components/ArchitectureDoc.tsx', 'راهنمای کاربری مرحله‌ای و مستند معماری قابل مشاهده در برنامه.'],
    ],
  },
  {
    title: 'منطق برنامه، داده و ارتباط محلی',
    icon: Database,
    files: [
      ['src/utils/gapAnalysisEngine.ts', 'موتور مشترک تحلیل شکاف: نرمال‌سازی فارسی، سنجش شباهت، قواعد تطبیق و گزارش پوشش.'],
      ['src/hooks/useGapAnalysis.ts', 'اتصال رابط تحلیل شکاف به API، نگهداری نتایج و بازگردانی نتیجهٔ همان نشست.'],
      ['server/routes/gapRoutes.ts', 'API تحلیل شکاف، کنترل دسترسی درخت‌ها، ثبت نتایج، بازبینی دستی و پیشرفت تحلیل.'],
      ['src/db/schema.ts', 'تعریف جدول‌ها و روابط Drizzle/SQLite؛ تغییر ساختار داده باید با مهاجرت سازگار باشد.'],
      ['src/db/index.ts', 'اتصال SQLite، تنظیمات پایگاه داده، ایجاد/ارتقای جدول‌ها و راه‌اندازی دادهٔ اولیه.'],
      ['src/db/sqlite-adapter.ts', 'آداپتور اتصال SQLite که Drizzle از طریق آن به دیتابیس محلی متصل می‌شود.'],
      ['src/store.ts', 'وضعیت مشترک نشست، تنظیمات ظاهری، داده‌های پایه و تعامل با API در Zustand.'],
      ['src/lib/apiClient.ts و src/services/api.ts', 'لایهٔ درخواست‌های محلی API، مدیریت نشست و خطاهای HTTP.'],
      ['server/middleware/rbac.ts', 'میان‌افزار کنترل نقش و مجوز روی درخواست‌های API؛ کنترل رابط جایگزین این لایه نیست.'],
      ['server/utils/orgAccess.ts و src/utils/orgHelper.ts', 'قواعد دسترسی سازمانی سرور و نمایش/تبدیل مسیرهای سازمانی.'],
      ['server/utils/backup.ts', 'پشتیبان‌گیری از پایگاه دادهٔ محلی.'],
      ['server/utils/portManager.ts', 'مدیریت انتخاب/بررسی پورت برای سرور داخلی برنامه.'],
      ['server/utils/logger.ts و src/lib/clientLogger.ts', 'ثبت خطاها و رویدادهای برنامه در سرور و رابط کاربری.'],
      ['src/constants.ts', 'ثابت‌های مشترک رابط و دامنه.'],
      ['src/hooks/useBaseData.ts و useTree.ts', 'واکشی/مدیریت داده‌های پایه و درختواره‌ها در صفحه‌ها.'],
      ['src/hooks/useIssues.ts و useOutputs.ts', 'عملیات رابط برای مسائل و خروجی‌های گزارش.'],
      ['src/hooks/useFullscreen.ts و useSimulatedFullscreen.ts', 'مدیریت حالت تمام‌صفحهٔ واقعی و جایگزین رابط.'],
      ['src/hooks/useFuzzySearch.ts و useLocalStorage.ts', 'جستجوی فازی و ذخیره‌سازی محلیِ stateهای صفحه.'],
      ['src/services/issueService.ts و treeService.ts', 'عملیات API دامنه‌ای مسائل و درختواره‌ها.'],
      ['src/lib/excelUtils.ts و src/utils/excelExportUtils.ts', 'ابزارهای خواندن و ساخت فایل اکسل.'],
      ['src/utils/currencyUtils.ts و numberFormat.ts', 'قواعد نمایش مبلغ و قالب‌بندی عدد.'],
      ['src/utils/persianDate.ts و userPreferences.ts', 'قالب تاریخ شمسی و ترجیحات محلی کاربر.'],
      ['src/utils/graphUtils.ts و treeUtils.ts', 'توابع کمکی گراف و عملیات ساختاری درخت.'],
      ['src/utils/svgExport.ts', 'خروجی‌گیری تصویر SVG درخت‌ها.'],
      ['src/store.ts', 'مدیریت state مشترک برنامه و واکشی داده‌های محلی از API.'],
      ['src/utils/orgHelper.ts', 'تبدیل و نمایش مسیر/مالکیت سازمانی.'],
      ['src/lib/toastInterceptor.ts', 'مهار تکرار پیام‌های خطا و اعلان‌ها.'],
      ['src/globals.d.ts و src/global.d.ts و src/vite-env.d.ts', 'اعلان نوع‌های سراسری، مرورگر، Vite و کاتالوگ مجازی عنوان‌های رابط.'],
      ['src/db/seeds.ts', 'هماهنگ‌سازی و اجرای seedهای اولیهٔ پایگاه داده.'],
      ['scripts/run-seed.ts', 'اجرای seedها از خط فرمان توسعه/نگهداری.'],
      ['scripts/seed/baseDefinitions.ts و organization.ts', 'دادهٔ اولیهٔ تعاریف و ساختار سازمانی.'],
      ['scripts/seed/gapsAndResearch.ts و trees.ts', 'دادهٔ نمونهٔ پژوهش/شکاف و درختواره‌ها.'],
      ['scripts/seed/issues.ts و periods.ts', 'دادهٔ نمونهٔ مسائل و دوره‌های زمانی.'],
      ['server/routes/assetRoutes.ts و files.ts', 'API دارایی‌ها و مدیریت فایل؛ دانلود/حذف از رابط با شناسهٔ پایدار فایل و کنترل دسترسی انجام می‌شود.'],
      ['server/routes/audit.ts و users.ts', 'API سوابق ممیزی و مدیریت کاربران.'],
      ['server/routes/exportRoutes.ts و reportRoutes.ts', 'APIهای خروجی‌گیری و گزارش‌سازی.'],
      ['server/routes/levelRoutes.ts و metadataRoutes.ts', 'API سطح‌های دانش و فراداده/تنظیمات عمومی.'],
      ['server/routes/org.ts و periods.ts', 'API ساختار سازمانی و دوره‌ها.'],
      ['server/routes/outputRoutes.ts و researchRoutes.ts', 'API خروجی‌ها و اقلام پژوهشی.'],
      ['server/routes/roles.ts و templateRoutes.ts', 'API نقش‌ها/مجوزها و قالب‌ها.'],
      ['server/routes/searchRoutes.ts و treeRoutes.ts', 'API جستجو و مدیریت درخت/گره‌ها.'],
      ['server/routes/unitDataExchangeRoutes.ts', 'ورود/خروج دادهٔ سازمانی در سطح یگان.'],
      ['server/routes/dynamicFieldsRoutes.ts و notificationRoutes.ts', 'API فیلدهای پویا و اعلان‌ها.'],
      ['server/routes/mergeRoutes.ts', 'عملیات ادغام داده‌های دامنه‌ای.'],
      ['server/routes/issueRoutes.ts و issues/index.ts', 'ثبت روت‌های نظام مسائل و تجمیع endpointهای مسئله.'],
      ['server/routes/issues/issueAccess.ts و issueCrud.ts', 'کنترل دسترسی مسئله و عملیات ایجاد/خواندن/ویرایش/حذف.'],
      ['server/routes/issues/issueOperations.ts و issueValidation.ts', 'عملیات تخصصی و اعتبارسنجی ورودی‌های مسائل.'],
      ['server/routes/issues/issueAttachments.ts', 'مدیریت پیوست‌های مسئله.'],
      ['src/db/seeds.ts', 'هماهنگ‌سازی و اجرای seedهای اولیهٔ پایگاه داده.'],
      ['server/express.d.ts و server/types.ts و server/types/AuthRequest.ts', 'نوع‌های Express، دامنهٔ سرور و درخواست دارای کاربر احراز‌شده.'],
      ['server/utils/audit.ts و issueExcelExport.ts', 'ثبت ممیزی سرور و ساخت خروجی اکسل مسائل.'],
      ['src/db/better-sqlite3-shim/index.js و package.json', 'آداپتور محلی مبتنی بر node:sqlite و تعریف بستهٔ shim برای مصرف درایور.'],
    ],
  },
  {
    title: 'دارایی‌ها، مستندات و نگهداری',
    icon: FileText,
    files: [
      ['public/fonts/Vazirmatn-Regular.woff2، public/fonts/Vazirmatn-Medium.woff2، public/fonts/Vazirmatn-SemiBold.woff2، public/fonts/Vazirmatn-Bold.woff2 و public/fonts/Vazirmatn-Black.woff2', 'فایل‌های فونت فارسی استفاده‌شده در رابط؛ کپی همراه برنامه و بدون CDN.'],
      ['src/offline-font.css', 'تعریف @font-face برای فونت‌های فارسی محلی.'],
      ['public/favicon.ico و public/img-concept.png و src/assets/img-concept.png', 'آیکون نصب/برنامه و تصویر راهنمای رابط.'],
      ['docs/swagger.json', 'مشخصات مستند APIهای پروژه.'],
      ['README.md و AJA_KNOWLEDGE_GOVERNANCE_SYSTEM.md', 'معرفی پروژه و مستند دامنه/حکمرانی دانش.'],
      ['DATABASE_SCHEMA.md و MYSQL_SUPPORT.md', 'راهنمای ساختار داده و مستند پشتیبانی/محدودیت‌های پایگاه داده.'],
      ['.env.example و .gitignore', 'نمونهٔ تنظیمات محیطی و تعیین فایل‌های غیرقابل ثبت در Git.'],
      ['package-lock.json و bun.lock', 'قفل نسخهٔ وابستگی‌ها برای نصب تکرارپذیر؛ هنگام تغییر dependency آن‌ها را هم به‌روز کنید.'],
      ['tailwind.config.js و eslint.config.mjs', 'پیکربندی سبک‌دهی و قواعد بررسی کیفیت کد.'],
    ],
  },
];

function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase('fa')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .trim();
}

export function ProgramMap() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeEntry, setActiveEntry] = useState<string | null>(null);
  const entries = useMemo(
    () => fileGroups.flatMap((group, groupIndex) => group.files.map(([file, description], fileIndex) => ({
      id: `program-map-entry-${groupIndex}-${fileIndex}`,
      group: group.title,
      file,
      description,
    }))),
    [],
  );
  const searchResults = useMemo(() => {
    const query = normalizeSearchText(searchQuery);
    if (!query) return [];
    return entries
      .filter(entry => normalizeSearchText(`${entry.file} ${entry.description} ${entry.group}`).includes(query))
      .slice(0, 8);
  }, [entries, searchQuery]);

  const jumpToEntry = (id: string) => {
    setActiveEntry(id);
    setSearchQuery('');
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  return (
    <div className="space-y-6 pb-10" dir="rtl">
      <header className="rounded-2xl bg-gradient-to-l from-slate-900 to-blue-900 p-6 text-white shadow-lg">
        <button onClick={() => navigate('/')} className="mb-4 inline-flex items-center gap-2 text-sm text-blue-100 hover:text-white">
          <ArrowRight size={16} />
          بازگشت
        </button>
        <div className="flex items-start gap-3">
          <GitBranch className="mt-1 shrink-0 text-cyan-300" size={28} />
          <div>
            <h1 className="text-2xl font-bold">نقشهٔ برنامه و راهنمای ارتقاء</h1>
            <p className="mt-2 text-sm leading-7 text-blue-100">
              نسخهٔ {packageInfo.version} — مرجع مهندسی برای شناخت اجزای اصلی، مسیر تغییرات و انتشار آفلاین سامانه.
            </p>
          </div>
        </div>
      </header>

      <section className="relative z-20 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label htmlFor="program-map-search" className="mb-2 block text-sm font-bold text-slate-800">
          جستجوی سریع فایل و عملکرد
        </label>
        <div className="relative">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            id="program-map-search"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && searchResults[0]) {
                event.preventDefault();
                jumpToEntry(searchResults[0].id);
              } else if (event.key === 'Escape') {
                setSearchQuery('');
              }
            }}
            placeholder="نام فایل، مسیر یا عملکرد مورد نظر را بنویسید..."
            autoComplete="off"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-10 pl-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
          />
          {searchQuery.trim() && (
            <div className="absolute inset-x-0 top-full mt-2 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
              {searchResults.length ? searchResults.map(result => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => jumpToEntry(result.id)}
                  className="block w-full rounded-lg px-3 py-2 text-right transition hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                >
                  <span dir="ltr" className="block break-all text-left text-xs font-semibold text-blue-800">{result.file}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">{result.description}</span>
                </button>
              )) : (
                <p className="px-3 py-4 text-center text-sm text-slate-500">موردی با این عبارت پیدا نشد.</p>
              )}
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-500">با انتخاب نتیجه، محل فایل و توضیحات آن در نقشه نمایش داده می‌شود.</p>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950">
        <h2 className="mb-2 flex items-center gap-2 font-bold"><ShieldCheck size={18} /> راهنمای ارتقاء ایمن و آفلاین</h2>
        <ul className="list-disc space-y-1 pr-5">
          <li>نسخهٔ انتشار را فقط در <code>package.json</code> افزایش دهید؛ نام فایل نصب‌کننده از همان نسخه ساخته می‌شود.</li>
          <li>برای تغییر منطق، مسیر UI و API متناظر را با هم بررسی کنید؛ اعتبارسنجی مجوزها باید در سرور نیز باقی بماند.</li>
          <li>تغییر جدول‌ها باید با مهاجرت سازگار با پایگاه دادهٔ موجود انجام شود؛ دادهٔ کاربر در پوشهٔ داده‌های Electron نگهداری می‌شود، نه کنار فایل اجرایی.</li>
          <li>پیش از انتشار، <code>npm run lint</code> و <code>npm run build:electron</code> را اجرا کنید و نصب تازه و ارتقاء روی Windows را آزمایش کنید.</li>
          <li>برنامه برای کار عادی از سرور loopback محلی و فایل‌های همراه نصب استفاده می‌کند؛ CDN، فونت راه‌دور یا API اینترنتی به آن اضافه نکنید.</li>
          <li>فایل نصب تولیدشده روی سیستم مقصد برای نصب و اجرای برنامه به اینترنت نیاز ندارد. خود فرایند ساخت Electron ممکن است در اولین اجرا ابزارهای NSIS/امضای ویندوز را دریافت کند؛ برای ساخت در محیط کاملاً ایزوله، این ابزارها و Electron را از قبل در cache سازنده آماده کنید.</li>
          <li>تنظیم فعلی <code>package.json</code> فقط نصب‌کنندهٔ Windows x64 می‌سازد؛ برای سیستم‌عامل یا معماری دیگر باید artifact جداگانه ساخته و روی همان مقصد آزمایش شود.</li>
        </ul>
      </section>

      {fileGroups.map(({ title, icon: Icon, files }, groupIndex) => (
        <section key={title} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <h2 className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-4 font-bold text-slate-800">
            <Icon size={19} className="text-blue-600" />
            {title}
          </h2>
          <div className="divide-y divide-slate-100">
            {files.map(([file, description], fileIndex) => {
              const entryId = `program-map-entry-${groupIndex}-${fileIndex}`;
              return (
              <div
                key={file}
                id={entryId}
                className={`grid gap-1 px-5 py-3 transition-colors md:grid-cols-[minmax(16rem,0.8fr)_2fr] md:gap-5 ${activeEntry === entryId ? 'bg-amber-100 ring-1 ring-inset ring-amber-300' : ''}`}
              >
                <code dir="ltr" className="break-all text-left text-xs font-semibold text-blue-800">{file}</code>
                <p className="text-sm leading-6 text-slate-600">{description}</p>
              </div>
              );
            })}
          </div>
        </section>
      ))}

      <p className="px-1 text-xs leading-6 text-slate-500">
        مسیرهای ترکیبی در این فهرست فقط فایل‌های صریحاً نام‌برده‌شده را شامل می‌شوند. هنگام افزودن فایل یا تغییر مسئولیت یک ماژول، این نقشه را نیز به‌روز کنید.
      </p>
    </div>
  );
}
