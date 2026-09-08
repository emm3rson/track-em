import { useEffect, useState } from "react";

import { getDemoModeEnabled, subscribeDemoMode } from "../utils/demoMode";

export function useDemoMode() {
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const enabled = await getDemoModeEnabled();
      if (mounted) {
        setDemoMode(enabled);
      }
    })();
    const unsubscribe = subscribeDemoMode((enabled) => {
      setDemoMode(enabled);
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return demoMode;
}
