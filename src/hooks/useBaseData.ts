import { useState, useEffect } from 'react';

export function useBaseData(category: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = async () => {
    // Dummy implementation
  };

  return { data, loading, refetch };
}
