type LogLevel = 'info' | 'warn' | 'error';

function format(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const base = `${timestamp} [${level.toUpperCase()}] ${message}`;
  return meta ? `${base} ${JSON.stringify(meta)}` : base;
}

export const logger = {
  info(message: string, meta?: Record<string, unknown>) {
    console.log(format('info', message, meta));
  },
  warn(message: string, meta?: Record<string, unknown>) {
    console.warn(format('warn', message, meta));
  },
  error(message: string, meta?: Record<string, unknown>) {
    console.error(format('error', message, meta));
  },
};
