import { useState, useEffect, useCallback } from 'react';

export function useBaseData(category: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!category) return;
    setLoading(true);
    try {
      const res = await (window.customFetch || window.fetch)(`/api/metadata/${category}`);
      if (res.ok) {
        const json = await res.json();
        const list = Array.isArray(json) ? json : [];
        setData(list.map((item: any) => ({
          id: item.id,
          value: item.name || item.title || item.value || String(item),
          label: item.name || item.title || item.label || String(item),
          category: item.category,
          description: item.description,
        })));
      }
    } catch (e) {
      console.error(`Error loading base data for ${category}:`, e);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, refetch: fetchData };
}
