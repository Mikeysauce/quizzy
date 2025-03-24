import { useEffect, useState } from 'react';

interface FetchState<T> {
  data: T;
  isLoading: boolean;
  error: Error | null;
  success: boolean;
}

interface FetchData {
  results: unknown[];
}

const cache = new Map();

export const useFetch = <T extends FetchData>(
  url: string,
  options?: RequestInit
) => {
  const [state, setState] = useState<FetchState<T>>({
    data: { results: [] } as unknown as T,
    isLoading: false,
    error: null,
    success: false,
  });

  useEffect(() => {
    async function get() {
      try {
        setState((state) => ({ ...state, isLoading: true }));

        if (cache.has(url)) {
          const data = cache.get(url) as T;
          setState((state) => ({
            ...state,
            isLoading: false,
            success: true,
            data,
          }));
          return;
        }

        const response = await fetch(url, options);

        const data = (await response.json()) as T;
        setState((state) => ({
          ...state,
          isLoading: false,
          success: true,
          data,
        }));

        cache.set(url, data);
      } catch (error) {
        setState((state) => ({
          ...state,
          isLoading: false,
          error: error as Error,
        }));
      }
    }

    get();
  }, [url, options]);

  return state;
};
