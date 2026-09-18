# پشتیبانی از پایگاه داده MySQL

برنامه DANA در حال حاضر به منظور اجرای کاملاً آفلاین و بی‌نیاز از نصب سرویس‌های ثانویه، بر روی `SQLite` تنظیم شده است. با این حال، به لطف استفاده از `Drizzle ORM`، ساختار کدهای پایگاه داده (نظیر `db.query` و `db.insert`) کاملاً مستقل از نوع پایگاه داده نوشته شده‌اند. 

در صورتی که قصد دارید سیستم را بر روی `MySQL` مستقر کنید، نیازی به تغییر در منطق برنامه‌نویسی و Route ها نیست و فقط باید مراحل زیر را انجام دهید:

## مراحل سوئیچ به MySQL

### ۱. نصب درایورهای مربوطه
ابتدا درایورهای MySQL را نصب کنید:
```bash
npm install mysql2
npm install drizzle-orm
npm install -D drizzle-kit
```

### ۲. تغییر فایل اتصال (src/db/index.ts)
محتوای فایل `src/db/index.ts` را به شکل زیر تغییر دهید:
```typescript
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema.js';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'dana_db'
});

export const db = drizzle(connection, { schema, mode: 'default' });

export const initDb = async () => {
    // MySQL handles connections automatically, so just check connection
    console.log("Connected to MySQL Database");
}
```

### ۳. تغییر تایپ‌های دیتابیس (src/db/schema.ts)
در فایل `src/db/schema.ts`، ایمپورت‌های SQLite را به MySQL تغییر دهید:

**از:**
```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
```
**به:**
```typescript
import { mysqlTable, varchar, int, text, timestamp } from 'drizzle-orm/mysql-core';
```

*سپس تمامی `sqliteTable` ها را به `mysqlTable` تغییر نام دهید.*
*برای فیلدهای متنی بلند از `text` و برای فیلدهای کوتاه از `varchar({ length: 255 })` استفاده کنید.*
*تمامی `integer` ها را به `int` تغییر دهید.*

### ۴. ایجاد فایل مایگریشن
با اجرای دستور زیر، جداول در MySQL ایجاد می‌شوند:
```bash
npx drizzle-kit generate:mysql
npx drizzle-kit push:mysql
```

### تغییرات فایل .env
فراموش نکنید مقادیر زیر را به فایل `.env` خود اضافه کنید:
```env
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=dana_db
```
