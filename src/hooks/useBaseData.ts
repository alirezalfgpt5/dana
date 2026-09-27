import { useState, useEffect, useCallback, useRef } from 'react';

export interface BaseDataItem {
  id: any;
  value: string;
  label: string;
  category: string;
  description?: string;
}

export function useBaseData(category: string) {
  const [data, setData] = useState<BaseDataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestRequestId = useRef(0);

  const fetchData = useCallback(async () => {
    if (!category) {
      setData([]);
      setError(null);
      setLoading(false);
      return;
    }

    const currentReqId = ++latestRequestId.current;
    setLoading(true);
    setError(null);

    try {
      const res = await (window.customFetch || window.fetch)(`/api/metadata/${category}`);
      if (currentReqId !== latestRequestId.current) {
        return; // درخواست قدیمی نادیده گرفته می‌شود
      }

      if (res.ok) {
        const json = await res.json();
        if (currentReqId !== latestRequestId.current) return;
        const list = Array.isArray(json) ? json : [];
        setData(list.map((item: any) => ({
          id: item.id,
          value: item.name || item.title || item.value || String(item),
          label: item.name || item.title || item.label || String(item),
          category: item.category,
          description: item.description,
        })));
        setError(null);
      } else {
        setData([]);
        let errorMsg = `خطا در دریافت اطلاعات دسته‌بندی ${category}`;
        try {
          const errJson = await res.json();
          if (errJson?.error || errJson?.message) {
            errorMsg = errJson.error || errJson.message;
          }
        } catch (_) {}
        setError(errorMsg);
      }
    } catch (e: any) {
      if (currentReqId === latestRequestId.current) {
        setData([]);
        const errorMsg = e?.message || `خطا در بارگذاری اطلاعات ${category}`;
        setError(errorMsg);
        console.error(`Error loading base data for ${category}:`, e);
      }
    } finally {
      if (currentReqId === latestRequestId.current) {
        setLoading(false);
      }
    }
  }, [category]);

  useEffect(() => {
    // پاکسازی داده‌ها و خطای قبلی با تغییر دسته
    setData([]);
    setError(null);
    fetchData();
  }, [category, fetchData]);

  return { data, loading, error, refetch: fetchData };
}

