// Personal data must be masked before it reaches the logger.
type Fields = Record<string, unknown>;

function write(level: 'info' | 'warn' | 'error', event: string, fields: Fields) {
  if ((globalThis as { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV === 'test') return;
  if (!__DEV__ && level === 'info') return;
  const line = `[${level}] ${event} ${JSON.stringify(fields)}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (event: string, fields: Fields = {}) => write('info', event, fields),
  warn: (event: string, fields: Fields = {}) => write('warn', event, fields),
  error: (event: string, fields: Fields = {}) => write('error', event, fields),
};
