type LogMeta = Record<string, unknown> | undefined;

type LogLevel = "debug" | "info" | "warn" | "error";

function formatPrefix(scope: string, level: LogLevel) {
  return `[${scope}] ${level.toUpperCase()}:`;
}

function log(level: LogLevel, scope: string, message: string, error?: unknown, meta?: LogMeta) {
  const prefix = formatPrefix(scope, level);
  const payload = {
    message,
    ...(meta ?? {}),
    ...(error !== undefined ? { error } : {}),
  };

  if (level === "error") {
    console.error(prefix, payload);
    return;
  }

  if (level === "warn") {
    console.warn(prefix, payload);
    return;
  }

  if (level === "info") {
    console.info(prefix, payload);
    return;
  }

  console.debug(prefix, payload);
}

export const logger = {
  debug: (scope: string, message: string, meta?: LogMeta) =>
    log("debug", scope, message, undefined, meta),
  info: (scope: string, message: string, meta?: LogMeta) =>
    log("info", scope, message, undefined, meta),
  warn: (scope: string, message: string, meta?: LogMeta) =>
    log("warn", scope, message, undefined, meta),
  error: (scope: string, message: string, error?: unknown, meta?: LogMeta) =>
    log("error", scope, message, error, meta),
};
