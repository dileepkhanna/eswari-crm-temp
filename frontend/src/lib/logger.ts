/**
 * Production-safe logger that always works.
 * Fixed to prevent tree-shaking issues in production builds.
 */

// Always export working logger methods to prevent "logger is not defined" errors
export const logger = {
  log: (...args: unknown[]) => console.log(...args),
  info: (...args: unknown[]) => console.info(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
  debug: (...args: unknown[]) => console.debug(...args),
};
