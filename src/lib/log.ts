/** Logger estructurado (JSON) con filtrado por nivel. Sink inyectable para pruebas. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export type LogSink = (line: string, level: LogLevel) => void;

const defaultSink: LogSink = (line, level) => {
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
};

export function createLogger(minLevel: LogLevel = 'info', sink: LogSink = defaultSink) {
  const min = ORDER[minLevel];
  const shouldLog = (level: LogLevel) => ORDER[level] >= min;
  const emit = (level: LogLevel, msg: string, meta?: Record<string, unknown>) => {
    if (!shouldLog(level)) return;
    sink(JSON.stringify({ t: new Date().toISOString(), level, msg, ...(meta ?? {}) }), level);
  };
  return {
    shouldLog,
    debug: (m: string, meta?: Record<string, unknown>) => emit('debug', m, meta),
    info: (m: string, meta?: Record<string, unknown>) => emit('info', m, meta),
    warn: (m: string, meta?: Record<string, unknown>) => emit('warn', m, meta),
    error: (m: string, meta?: Record<string, unknown>) => emit('error', m, meta),
  };
}

export const log = createLogger((process.env.LOG_LEVEL as LogLevel) ?? 'info');
