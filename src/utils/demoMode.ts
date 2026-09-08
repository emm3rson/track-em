import * as FileSystem from "expo-file-system/legacy";
import { logger } from "./logger";

type DemoModePayload = {
  enabled: boolean;
  updatedAt: string;
};

const DEMO_MODE_FILE = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}demo-mode.json`
  : null;

let demoModeCache: boolean | null = null;
let demoModeLoadPromise: Promise<boolean> | null = null;
const listeners = new Set<(enabled: boolean) => void>();

function notifyDemoMode(enabled: boolean) {
  for (const listener of listeners) {
    listener(enabled);
  }
}

export function subscribeDemoMode(listener: (enabled: boolean) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCachedDemoMode() {
  return demoModeCache;
}

export async function getDemoModeEnabled() {
  if (demoModeCache !== null) {
    return demoModeCache;
  }

  if (!demoModeLoadPromise) {
    demoModeLoadPromise = (async () => {
      if (!DEMO_MODE_FILE) {
        demoModeCache = false;
        return false;
      }

      try {
        const info = await FileSystem.getInfoAsync(DEMO_MODE_FILE);
        if (!info.exists) {
          demoModeCache = false;
          return false;
        }
        const contents = await FileSystem.readAsStringAsync(DEMO_MODE_FILE);
        const parsed = JSON.parse(contents) as DemoModePayload;
        demoModeCache = !!parsed?.enabled;
        return demoModeCache;
      } catch (error) {
        logger.error("demoMode", "Read demo mode failed", error);
        demoModeCache = false;
        return false;
      } finally {
        demoModeLoadPromise = null;
      }
    })();
  }

  return demoModeLoadPromise;
}

export async function setDemoModeEnabled(enabled: boolean) {
  demoModeCache = enabled;
  demoModeLoadPromise = null;

  if (!DEMO_MODE_FILE) {
    notifyDemoMode(enabled);
    return;
  }

  try {
    if (enabled) {
      const payload: DemoModePayload = {
        enabled: true,
        updatedAt: new Date().toISOString(),
      };
      await FileSystem.writeAsStringAsync(DEMO_MODE_FILE, JSON.stringify(payload));
    } else {
      await FileSystem.deleteAsync(DEMO_MODE_FILE, { idempotent: true });
    }
  } catch (error) {
    logger.error("demoMode", "Write demo mode failed", error);
  } finally {
    notifyDemoMode(enabled);
  }
}
