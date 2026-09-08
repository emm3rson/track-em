import Constants from "expo-constants";

const FALLBACK_APP_VERSION = "4.0.0";

function hasValue(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Resolve a user-facing version label from runtime metadata.
 * Priority:
 * 1) expo.extra.displayVersion — decoupled display label (e.g. "4.0.0")
 * 2) Hard fallback
 *
 * Note: expo.version is intentionally skipped here — it tracks the EAS
 * runtime/OTA version (e.g. "2") and is not meant for user display.
 */
export function getAppVersionLabel(): string {
  const displayVersion = Constants.expoConfig?.extra?.displayVersion;
  if (hasValue(displayVersion)) {
    return displayVersion.trim();
  }

  return FALLBACK_APP_VERSION;
}
