// server/utils/orgAccess.ts
// مدیریت کنترل دسترسی سازمانی، جداسازی یگان‌های موازی و دسترسی تفکیکی/تجمیعی بالادستی

import { sqlite } from '../../src/db/index.js';

export type NormalizedOrgLevel = 'AJA' | 'NIROO' | 'RADE';

export interface UserOrgScope {
  level: NormalizedOrgLevel;
  isSuperAdmin: boolean;
  baseId: number | null;
  unitId: number | null;
  allowedBaseIds: number[] | 'all';
  allowedUnitIds: number[] | 'all';
  canAccessBase: (baseId: number | null | undefined) => boolean;
  canAccessUnit: (unitId: number | null | undefined) => boolean;
  getEffectiveFilter: (requestedBaseId?: number | null, requestedUnitId?: number | null, isAggregate?: boolean) => {
    baseIds: number[] | null;
    unitIds: number[] | null;
    isAggregate: boolean;
  };
}

export function normalizeOrgLevel(level?: string | null): NormalizedOrgLevel {
  if (!level) return 'RADE';
  const clean = level.trim().toUpperCase();
  if (clean === 'AJA' || clean === 'آجا' || clean === 'ستاد کل') return 'AJA';
  if (clean === 'NIROO' || clean === 'نیرو') return 'NIROO';
  if (clean === 'RADE' || clean === 'رده') return 'RADE';
  return 'RADE';
}

export function getUserOrgScope(user: any): UserOrgScope {
  const isSuperAdmin = user?.role === 'superadmin' || (user?.role === 'admin' && !user?.organizationLevel && !user?.unitId && !user?.baseId);
  const rawLevel = user?.organizationLevel;
  const level: NormalizedOrgLevel = isSuperAdmin ? 'AJA' : normalizeOrgLevel(rawLevel);

  const baseId = user?.baseId ? Number(user.baseId) : null;
  const unitId = user?.unitId ? Number(user.unitId) : null;

  let allowedBaseIds: number[] | 'all' = 'all';
  let allowedUnitIds: number[] | 'all' = 'all';

  if (!isSuperAdmin) {
    if (level === 'AJA') {
      // آجا دسترسی به تمام پایگاه‌ها و یگان‌ها دارد
      allowedBaseIds = 'all';
      allowedUnitIds = 'all';
    } else if (level === 'NIROO') {
      // نیرو فقط به پایگاه خود و یگان‌های زیرمجموعه پایگاه خود دسترسی دارد (یگان‌های موازی سایر نیروها مسدود هستند)
      if (baseId) {
        allowedBaseIds = [baseId];
        try {
          const unitRows = sqlite.prepare('SELECT id FROM units WHERE base_id = ?').all(baseId) as { id: number }[];
          allowedUnitIds = unitRows.map(u => u.id);
        } catch (e) {
          allowedUnitIds = [];
        }
      } else {
        allowedBaseIds = [];
        allowedUnitIds = [];
      }
    } else {
      // رده فقط و فقط به یگان اختصاصی خود دسترسی دارد (یگان‌های موازی هم‌سطح مسدود هستند)
      if (unitId) {
        allowedUnitIds = [unitId];
        if (baseId) {
          allowedBaseIds = [baseId];
        } else {
          try {
            const unit = sqlite.prepare('SELECT base_id FROM units WHERE id = ?').get(unitId) as { base_id: number } | undefined;
            allowedBaseIds = unit?.base_id ? [unit.base_id] : [];
          } catch (e) {
            allowedBaseIds = [];
          }
        }
      } else {
        allowedBaseIds = [];
        allowedUnitIds = [];
      }
    }
  }

  const canAccessBase = (bId: number | null | undefined): boolean => {
    if (isSuperAdmin || allowedBaseIds === 'all') return true;
    if (!bId) return false;
    return allowedBaseIds.includes(Number(bId));
  };

  const canAccessUnit = (uId: number | null | undefined): boolean => {
    if (isSuperAdmin || allowedUnitIds === 'all') return true;
    if (!uId) return false;
    return allowedUnitIds.includes(Number(uId));
  };

  const getEffectiveFilter = (requestedBaseId?: number | null, requestedUnitId?: number | null, isAggregate?: boolean) => {
    let finalBaseIds: number[] | null = null;
    let finalUnitIds: number[] | null = null;

    if (level === 'AJA' || isSuperAdmin) {
      if (requestedUnitId) {
        // بررسی جداگانه یک یگان خاص
        finalUnitIds = [Number(requestedUnitId)];
      } else if (requestedBaseId) {
        finalBaseIds = [Number(requestedBaseId)];
        if (!isAggregate) {
          // اگر تجمیعی نخواسته بود، فقط همان پایگاه
        } else {
          // تجمیعی تمام یگان‌های آن پایگاه
          const rows = sqlite.prepare('SELECT id FROM units WHERE base_id = ?').all(Number(requestedBaseId)) as { id: number }[];
          finalUnitIds = rows.map(r => r.id);
        }
      }
      // اگر هیچی نخواسته و isAggregate=true باشد، یعنی تجمیع کل آجا (null یعنی همه)
    } else if (level === 'NIROO') {
      finalBaseIds = baseId ? [baseId] : [];
      if (requestedUnitId && canAccessUnit(requestedUnitId)) {
        // بررسی جداگانه یک یگان زیرمجموعه
        finalUnitIds = [Number(requestedUnitId)];
      } else {
        // حالت تجمیعی: تمام یگان‌های زیرمجموعه همین نیرو
        finalUnitIds = Array.isArray(allowedUnitIds) ? allowedUnitIds : null;
      }
    } else {
      // رده: فقط و فقط خودش، نه تجمیعی و نه یگان موازی
      finalUnitIds = unitId ? [unitId] : [];
      finalBaseIds = baseId ? [baseId] : [];
    }

    return {
      baseIds: finalBaseIds,
      unitIds: finalUnitIds,
      isAggregate: !!isAggregate,
    };
  };

  return {
    level,
    isSuperAdmin,
    baseId,
    unitId,
    allowedBaseIds,
    allowedUnitIds,
    canAccessBase,
    canAccessUnit,
    getEffectiveFilter,
  };
}
