/**
 * JSON console logging without request context (Edge middleware–safe; no `cookies()`).
 */
export function loggerWarnStructured(message: string, context?: Record<string, unknown>): void {
  console.warn(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "warn",
      message,
      context: context ?? {},
    }),
  );
}
