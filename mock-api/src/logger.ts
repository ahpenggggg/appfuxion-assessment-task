type Fields = Record<string, unknown>;

export function maskPhone(phone: string): string {
  return phone.length <= 7 ? '***' : `${phone.slice(0, 5)}****${phone.slice(-3)}`;
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return '***';
  return `${user.slice(0, 1)}***@${domain}`;
}

function write(level: 'info' | 'warn' | 'error', event: string, fields: Fields) {
  if (process.env.NODE_ENV === 'test') return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields });
  (level === 'error' ? console.error : console.log)(line);
}

export const log = {
  info: (event: string, fields: Fields = {}) => write('info', event, fields),
  warn: (event: string, fields: Fields = {}) => write('warn', event, fields),
  error: (event: string, fields: Fields = {}) => write('error', event, fields),
};
