# دستورالعمل‌های اختصاصی پروژه (Project Specific Instructions)

این فایل شامل قوانین و رفع باگ‌های مهمی است که در طول توسعه پروژه به دست آمده است. برای جلوگیری از بروز خطاهای مشابه در آینده و لود مجدد برنامه، همیشه این موارد را در نظر بگیرید:

## 1. تنظیمات Vite HMR و WebSocket
برای جلوگیری از تداخل پورت‌های WebSocket (مانند خطای `Port 24678 is already in use`) در حالت توسعه با Express، باید میان‌افزار Vite به گونه‌ای تنظیم شود که از همان سرور اصلی HTTP (پورت 3000) استفاده کند و یا در صورت غیرفعال بودن HMR توسط پلتفرم، کاملاً خاموش بماند.
نمونه پیاده‌سازی صحیح در `server.ts`:
```typescript
const httpServer = http.createServer(app);
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { 
      middlewareMode: true,
      hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer }
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}
httpServer.listen(PORT, '0.0.0.0', () => { ... });
```

## 2. تراکنش‌های همگام‌ساز در better-sqlite3 و Drizzle ORM
درایور `better-sqlite3` کاملاً به صورت Synchronous کار می‌کند. استفاده از `async/await` درون `db.transaction()` باعث خطای `TypeError: Transaction function cannot return a promise` می‌شود.
**قانون:** تمام تراکنش‌ها در `server.ts` یا Routeها باید بدون `async` نوشته شوند و متدهای `.run()`, `.all()`, `.get()` روی آن‌ها فراخوانی شود.
```typescript
// ❌ غلط (باعث خطا می‌شود)
await db.transaction(async (tx) => {
  await tx.insert(users).values(data);
});

// ✅ صحیح
db.transaction((tx) => {
  tx.insert(users).values(data).run();
});
```

## 3. مدیریت وضعیت‌های اولیه (Startup state)
- در هر بار لود جدید، مطمئن شوید که API Key ها و Secrets اگر تعریف نشده‌اند، برنامه Crash نکند و با مدیریت خطای مناسب (Graceful Degradation) هشدار دهد.
- جداول پایگاه داده در هر بار راه‌اندازی باید از طریق `sqlite.exec(CREATE TABLE IF NOT EXISTS ...)` بررسی و در صورت نیاز ساخته شوند (با توجه به معماری فعلی).

## 4. تغییرات Schema و فیلدهای پویا (پوشش برنامه‌ای)
- بخش «پوشش برنامه‌ای» (Programmatic Coverages) که پیش از این به صورت ۴ فیلد سخت‌کد شده (`isPartOfSevenYearPlan` و ...) بود، اکنون پویا شده است.
- یک جدول جدید `program_coverages` برای مدیریت مقادیر پایه اضافه شد که از طریق کامپوننت `DynamicMetadataManager` مدیریت می‌شود.
- در جدول `research_items` از فیلد `program_coverages` به صورت `JSON Array` (نوع داده `text({ mode: 'json' })`) استفاده شده است تا تمامی مقادیر انتخاب شده برای یک پژوهش ذخیره شوند.
- هنگام خروجی گرفتن اکسل (`outputRoutes.ts`)، نام پوشش‌ها از دیتابیس Lookup و مپ می‌شوند.
