// ─── ANSI Color Codes ─────────────────────────────────────────────
const Colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
} as const;

/** Returns an ISO timestamp string for log prefixes. */
function timestamp(): string {
  return new Date().toISOString();
}

/**
 * Formats a log line: `[TIMESTAMP] [LEVEL] message`
 */
function format(level: string, color: string, message: string): string {
  return `${Colors.gray}[${timestamp()}]${Colors.reset} ${color}${Colors.bold}[${level}]${Colors.reset} ${message}`;
}

// ─── Public API ───────────────────────────────────────────────────

/** Log an informational message (green). */
export function info(message: string, ...args: unknown[]): void {
  console.log(format('INFO', Colors.green, message), ...args);
}

/** Log a warning message (yellow). */
export function warn(message: string, ...args: unknown[]): void {
  console.warn(format('WARN', Colors.yellow, message), ...args);
}

/** Log an error message (red). */
export function error(message: string, ...args: unknown[]): void {
  console.error(format('ERROR', Colors.red, message), ...args);
}

/** Structured logger namespace. */
export const logger = { info, warn, error } as const;
