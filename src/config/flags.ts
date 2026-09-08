const readBooleanFlag = (value: string | undefined, fallback = false) => {
  if (value == null || value.trim() === "") return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
};

export const ENABLE_TESTING_TOOLS = readBooleanFlag(
  process.env.EXPO_PUBLIC_ENABLE_TESTING_TOOLS,
  false
);
export const ENABLE_MANUAL_REFRESH = readBooleanFlag(
  process.env.EXPO_PUBLIC_ENABLE_MANUAL_REFRESH,
  false
);
