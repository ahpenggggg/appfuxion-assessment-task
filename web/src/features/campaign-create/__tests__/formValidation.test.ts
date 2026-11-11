import { validateForm, type FormState } from '../formValidation';

const base: FormState = { tenantId: 'tenant-acme', name: 'Promo', channel: 'EMAIL', messageTemplate: 'Hi', when: 'now', scheduledAt: '' };

describe('validateForm', () => {
  it('passes a complete form', () => expect(validateForm(base)).toEqual({}));
  it('rejects bad tenant ids and empty fields', () => {
    const e = validateForm({ ...base, tenantId: 'Tenant ACME', name: ' ', messageTemplate: '' });
    expect(Object.keys(e).sort()).toEqual(['messageTemplate', 'name', 'tenantId']);
  });
  it('requires a future schedule time', () => {
    expect(validateForm({ ...base, when: 'later', scheduledAt: '2000-01-01T10:00' }).scheduledAt).toMatch(/future/);
    const future = new Date(Date.now() + 86_400_000).toISOString().slice(0, 16);
    expect(validateForm({ ...base, when: 'later', scheduledAt: future }).scheduledAt).toBeUndefined();
  });
});
