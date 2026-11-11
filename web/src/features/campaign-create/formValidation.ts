import type { Channel } from '@shared/contracts';

const TENANT_RE = /^[a-z0-9][a-z0-9-]{1,62}$/;

export interface FormState {
  tenantId: string;
  name: string;
  channel: Channel;
  messageTemplate: string;
  when: 'now' | 'later';
  scheduledAt: string; // datetime-local value
}

export function validateForm(f: FormState): Partial<Record<keyof FormState, string>> {
  const e: Partial<Record<keyof FormState, string>> = {};
  if (!TENANT_RE.test(f.tenantId.trim())) e.tenantId = 'Use lowercase letters, numbers and dashes (e.g. tenant-acme).';
  if (!f.name.trim()) e.name = 'Campaign name is required.';
  else if (f.name.length > 120) e.name = 'Keep the name under 120 characters.';
  if (!f.messageTemplate.trim()) e.messageTemplate = 'Message template is required.';
  else if (f.messageTemplate.length > 2000) e.messageTemplate = 'Keep the template under 2,000 characters.';
  if (f.when === 'later') {
    const ms = Date.parse(f.scheduledAt);
    if (Number.isNaN(ms)) e.scheduledAt = 'Choose a date and time.';
    else if (ms <= Date.now()) e.scheduledAt = 'Schedule time must be in the future.';
  }
  return e;
}

