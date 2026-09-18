// src/pages/Trees/hooks/useTreeData.ts
// هوک مدیریت داده‌های درختواره

import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

export function useTreeData() {
  const [periods, setPeriods] = useState<any[]>([]);
  const [bases, setBases] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [orgLevels, setOrgLevels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPeriods = useCallback(async () => {
    try {
      const res = await(window.customFetch || window.fetch)('/api/periods');
      const data = await res.json();
      setPeriods(Array.isArray(data) ? data : []);
      return data;
    } catch (e) { 
      console.error('Error fetching periods:', e);
      setPeriods([]);
      return [];
    }
  }, []);

  const fetchOrgData = useCallback(async () => {
    setLoading(true);
    try {
      // console.log('Fetching org data...');
      
      const [basesRes, unitsRes, levelsRes] = await Promise.all([
       (window.customFetch || window.fetch)('/api/org/bases?all=true'),
       (window.customFetch || window.fetch)('/api/org/units'),
       (window.customFetch || window.fetch)('/api/metadata/org-levels')
      ]);

      const basesData = await basesRes.json();
      const unitsData = await unitsRes.json();
      const levelsData = await levelsRes.json();

      // console.log('Org data fetched:', {
      //   bases: basesData.length,
      //   units: unitsData.length,
      //   levels: levelsData.length
      // });

      setBases(Array.isArray(basesData) ? basesData : []);
      setUnits(Array.isArray(unitsData) ? unitsData : []);
      setOrgLevels(Array.isArray(levelsData) ? levelsData : []);
      
      return { bases: basesData, units: unitsData, levels: levelsData };
    } catch (e) { 
      console.error('Error fetching org data:', e);
      toast.error('خطا در دریافت اطلاعات سازمانی');
      setBases([]);
      setUnits([]);
      setOrgLevels([]);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // تابع برای دریافت یک پایگاه خاص با ID
  const fetchBaseById = useCallback(async (id: number) => {
    try {
      const res = await(window.customFetch || window.fetch)(`/api/org/bases/${id}`);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      console.error('Error fetching base by id:', e);
      return null;
    }
  }, []);

  // تابع برای دریافت یگان‌های یک پایگاه
  const fetchUnitsByBase = useCallback(async (baseId: number) => {
    try {
      const res = await(window.customFetch || window.fetch)(`/api/org/units/by-base/${baseId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (e) {
      console.error('Error fetching units by base:', e);
      return [];
    }
  }, []);

  // تابع برای دریافت یک سطح سازمانی خاص
  const fetchOrgLevelByName = useCallback(async (name: string) => {
    try {
      const res = await(window.customFetch || window.fetch)(`/api/metadata/org-levels`);
      if (!res.ok) return null;
      const data = await res.json();
      const found = Array.isArray(data) ? data.find((l: any) => l.name === name) : null;
      return found || null;
    } catch (e) {
      console.error('Error fetching org level by name:', e);
      return null;
    }
  }, []);

  return { 
    periods, 
    bases, 
    units, 
    orgLevels, 
    loading,
    fetchPeriods, 
    fetchOrgData,
    fetchBaseById,
    fetchUnitsByBase,
    fetchOrgLevelByName
  };
}