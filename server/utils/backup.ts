// server/utils/backup.ts
// پشتیبان‌گیری خودکار و دستی از پایگاه داده

import fs from 'fs';
import path from 'path';
import { sqlite } from '../../src/db/index.js';

// ============================================
// ۱. پشتیبان‌گیری خودکار
// ============================================

const BACKUP_INTERVAL = 12 * 60 * 60 * 1000; // ۱۲ ساعت

export const setupAutoBackup = () => {
  const dbPath = path.join(process.cwd(), 'database.sqlite');
  const backupDir = path.join(process.cwd(), 'backups');

  // ایجاد پوشه backups در صورت عدم وجود
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log('📁 Created backups directory');
  }

  const createBackup = async () => {
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
      const backupName = `backup-${dateStr}_${timeStr}.sqlite`;
      const backupPath = path.join(backupDir, backupName);
      
      if (fs.existsSync(dbPath)) {
        // بررسی اینکه آیا امروز پشتیبان گرفته شده یا نه
        const todayBackups = fs.readdirSync(backupDir)
          .filter(f => f.startsWith(`backup-${dateStr}`));
        
        // اگر امروز پشتیبان وجود ندارد، یک نسخه جدید ایجاد کن
        if (todayBackups.length === 0) {
          // Fix 33: Use sqlite.backup() instead of fs.copyFileSync to include WAL
          await sqlite.backup(backupPath);
          console.log(`✅ Auto-backup created: ${backupName}`);
          
          // حذف پشتیبان‌های قدیمی (فقط ۳۰ روز اخیر نگه داشته شوند)
          cleanupOldBackups(backupDir, 30);
        } else {
          // console.log(`ℹ️ Backup already exists for today: ${todayBackups[0]}`);
        }
      } else {
        console.warn('⚠️ Database file not found for backup');
      }
    } catch (e) {
      console.error('❌ Auto-backup failed:', e);
    }
  };

  // Run once on startup
  createBackup();

  // Run every 12 hours
  setInterval(createBackup, BACKUP_INTERVAL);
  
  console.log('🔄 Auto-backup configured (every 12 hours)');
};

// ============================================
// ۲. پاکسازی پشتیبان‌های قدیمی
// ============================================

function cleanupOldBackups(backupDir: string, daysToKeep: number = 30) {
  try {
    const files = fs.readdirSync(backupDir);
    const now = Date.now();
    const cutoff = daysToKeep * 24 * 60 * 60 * 1000;
    
    let deletedCount = 0;
    
    for (const file of files) {
      if (!file.endsWith('.sqlite')) continue;
      
      const filePath = path.join(backupDir, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;
      
      if (age > cutoff) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      console.log(`🗑️ Cleaned up ${deletedCount} old backup(s)`);
    }
  } catch (e) {
    console.error('❌ Error cleaning up old backups:', e);
  }
}

// ============================================
// ۳. پشتیبان‌گیری دستی (از طریق API)
// ============================================

export async function createManualBackup(): Promise<{ success: boolean; path: string; name: string; size: number } | null> {
  try {
    const dbPath = path.join(process.cwd(), 'database.sqlite');
    const backupDir = path.join(process.cwd(), 'backups');
    
    if (!fs.existsSync(dbPath)) {
      console.error('❌ Database file not found');
      return null;
    }
    
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const backupName = `manual-backup-${dateStr}_${timeStr}.sqlite`;
    const backupPath = path.join(backupDir, backupName);
    
    // Fix 33: Use sqlite.backup() instead of fs.copyFileSync
    await sqlite.backup(backupPath);
    
    const stats = fs.statSync(backupPath);
    
    console.log(`✅ Manual backup created: ${backupName}`);
    
    return {
      success: true,
      path: backupPath,
      name: backupName,
      size: stats.size,
    };
  } catch (e) {
    console.error('❌ Manual backup failed:', e);
    return null;
  }
}

// ============================================
// ۴. بازیابی از پشتیبان
// ============================================

export async function restoreFromBackup(backupPath: string): Promise<boolean> {
  try {
    const dbPath = path.join(process.cwd(), 'database.sqlite');
    
    if (!fs.existsSync(backupPath)) {
      console.error('❌ Backup file not found:', backupPath);
      return false;
    }
    
    // پشتیبان از دیتابیس فعلی قبل از بازیابی
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
    const preRestoreBackup = `pre-restore-${dateStr}_${timeStr}.sqlite`;
    const preRestorePath = path.join(path.dirname(dbPath), preRestoreBackup);
    
    if (fs.existsSync(dbPath)) {
      // Fix 33: Use sqlite.backup() instead of fs.copyFileSync for pre-restore
      await sqlite.backup(preRestorePath);
      console.log(`📁 Pre-restore backup saved: ${preRestoreBackup}`);
    }
    
    // بازیابی
    // Close the database to safely overwrite (if possible, though better-sqlite3 might hold a lock)
    // Here we assume it's offline or we just try to overwrite
    sqlite.close();
    fs.copyFileSync(backupPath, dbPath);
    console.log(`✅ Database restored from: ${backupPath}`);
    console.log(`⚠️ Note: Process requires restart to re-open database connection.`);
    
    return true;
  } catch (e) {
    console.error('❌ Restore failed:', e);
    return false;
  }
}

// ============================================
// ۵. دریافت لیست پشتیبان‌ها
// ============================================

export function getBackupList(): { name: string; path: string; size: number; date: Date }[] {
  try {
    const backupDir = path.join(process.cwd(), 'backups');
    
    if (!fs.existsSync(backupDir)) {
      return [];
    }
    
    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.sqlite'))
      .map(f => {
        const filePath = path.join(backupDir, f);
        const stats = fs.statSync(filePath);
        return {
          name: f,
          path: filePath,
          size: stats.size,
          date: stats.mtime,
        };
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    
    return files;
  } catch (e) {
    console.error('❌ Error getting backup list:', e);
    return [];
  }
}

export default {
  setupAutoBackup,
  createManualBackup,
  restoreFromBackup,
  getBackupList,
};