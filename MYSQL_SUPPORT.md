# راهنمای جامع پشتیبانی و مهاجرت به پایگاه داده MySQL / MariaDB در سامانه دانا

سامانه جامع دانا (DANA) به صورت پیش‌فرض برای سادگی در استقرار، کارکرد پایدار در بستر آفلاین/ایزوله و عدم وابستگی به سرویس‌های جانبی، با پایگاه داده `SQLite` و موتور هماهنگ `Drizzle ORM` تجهیز شده است.

از آنجا که لایه تعامل با داده‌ها عمدتاً با استفاده از **Drizzle ORM** پیاده‌سازی شده است، انتقال پایگاه داده به **MySQL 8.0+** یا **MariaDB** به سهولت و بدون تغییر در ساختار صفحات فرانت‌اند امکان‌پذیر است. این سند تمامی مراحل لازم جهت انتقال کامل و بدون نقص را تشریح می‌کند.

---

## ۱. پیش‌نیازها و نصب بسته‌های مورد نیاز

ابتدا درایور MySQL و ابزارهای به‌روز Drizzle را نصب کنید:

```bash
npm install mysql2
npm install -D drizzle-kit
```

---

## ۲. تنظیم فایل متغیرهای محیطی (`.env`)

مشخصات اتصال به پایگاه داده MySQL را در فایل `.env` پروژه درج کنید:

```env
# تنظیمات پایگاه داده MySQL
DB_DRIVER=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_secure_password
DB_NAME=dana_db
DB_CHARSET=utf8mb4
```

> **نکته مهم:** حتماً پایگاه داده را با کاراکترست `utf8mb4` و کالکشن `utf8mb4_persian_ci` یا `utf8mb4_unicode_ci` ایجاد کنید:
> ```sql
> CREATE DATABASE dana_db CHARACTER SET utf8mb4 COLLATE utf8mb4_persian_ci;
> ```

---

## ۳. ایجاد فایل پیکربندی Drizzle (`drizzle.config.ts`)

در نسخه جدید `drizzle-kit` دستورات قدیمی نظیر `generate:mysql` منسوخ شده‌اند و از یک فایل کانفیگ واحد استفاده می‌شود:

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';
import dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'dana_db',
  },
  verbose: true,
  strict: true,
});
```

---

## ۴. به‌روزرسانی اتصال پایگاه داده (`src/db/index.ts`)

در محیط تولید، توصیه اکید می‌شود از **Connection Pool** برای جلوگیری از قطع ارتباط یا بن‌بست کانکشن‌ها استفاده شود:

```typescript
// src/db/index.ts (نسخه MySQL)
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.js';
import dotenv from 'dotenv';

dotenv.config();

// ایجاد استخر اتصالات پایدار (Connection Pool)
export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dana_db',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
  charset: 'utf8mb4',
});

// اینستنس اصلی Drizzle ORM
export const db = drizzle(pool, { schema, mode: 'default' });

/**
 * بررسی اتصال اولیه و صحت کارکرد دیتابیس
 */
export async function initDb() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ با موفقیت به پایگاه داده MySQL متصل شد.');
    connection.release();
  } catch (error) {
    console.error('❌ خطا در اتصال به پایگاه داده MySQL:', error);
    throw error;
  }
}
```

---

## ۵. راهنمای تبدیل اسکیما (`src/db/schema.ts`)

برای سازگاری با MySQL، موارد زیر در فایل `schema.ts` رعایت می‌شوند:

1. **ایمپورت‌ها:**
   ```typescript
   // از SQLite:
   import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

   // به MySQL:
   import { mysqlTable, varchar, int, text, json, timestamp } from 'drizzle-orm/mysql-core';
   ```

2. **کلیدهای اصلی و اعداد:**
   ```typescript
   // SQLite:
   id: integer('id').primaryKey({ autoIncrement: true })

   // MySQL:
   id: int('id').primaryKey().autoincrement()
   ```

3. **رشته‌ها و تاریخ‌ها:**
   - برای شناسه‌ها، کدها و متون کوتاه: `varchar('code', { length: 255 })`
   - برای متون طولانی و توضیحات: `text('description')`
   - برای آرایه‌ها و آبجکت‌های متادیتا: `json('metadata')` یا `text('metadata')`

---

## ۶. ایجاد و اعمال جداول (Migration & Push)

با اجرای دستورات زیر در ترمینال، تمامی جداول و روابط در سرور MySQL ایجاد می‌شوند:

```bash
# تولید فایل‌های مایگریشن بر اساس اسکیما
npx drizzle-kit generate

# اعمال مستقیم ساختار جداول به پایگاه داده
npx drizzle-kit push
```

---

## ۷. نکات مهم لایه سازگاری در کوئری‌های خام (Direct SQL Queries)

در چند مسیر کمکی (مانند `org.ts`، `reportRoutes.ts` و `audit.ts`) برای افزایش سرعت در محیط SQLite از دستورات مستقیم نظیر `sqlite.prepare(...)` استفاده شده است.

در صورت سوئیچ کامل به MySQL:
1. توصیه استاندارد این است که این کوئری‌ها با توابع بومی Drizzle نظیر `db.select().from(...)` یا `db.execute(sql\`...\`)` بازنویسی شوند.
2. دستور `db.execute(sql\`...\`)` در Drizzle ORM هم بر روی SQLite و هم بر روی MySQL خروجی یکسان ارائه می‌دهد.
3. سینتکس‌های ویژه SQLite مانند دستورات `PRAGMA` و بک‌آپ فایل‌های `WAL` در محیط MySQL نیازی نبوده و عملیات بک‌آپ‌گیری از طریق دستور استاندارد `mysqldump` انجام می‌پذیرد:
   ```bash
   mysqldump -u root -p dana_db > backup_dana.sql
   ```

---

## ۸. دستورات اعتبارسنجی نهایی

پس از راه‌اندازی MySQL، برای اطمینان از سلامت کامل، مراحل زیر را طی کنید:

```bash
# ۱. اجرای فرآیند Seed اولیه برای ایجاد کاربر پیش‌فرض (admin / admin123) و ساختار اولیه
npx tsx src/db/seeds.ts

# ۲. اجرای آزمایشی کامپایل پروژه
npm run build

# ۳. اجرای سرور
npm run dev
```

با انجام این مراحل، سامانه به طور کامل و با حداکثر بهره‌وری بر روی زیرساخت دیتابیس رابطه‌ای MySQL اجرا خواهد شد.
