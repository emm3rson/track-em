import { useCallback, useState } from "react";

export function useAsyncAction() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const run = useCallback(async <T>(action: () => Promise<T>) => {
    setLoading(true);
    setError(null);
    try {
      return await action();
    } catch (nextError) {
      setError(nextError);
      throw nextError;
    } finally {
      setLoading(false);
    }
  }, []);

  return { run, loading, error };
}
