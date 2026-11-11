import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { CHANNELS, CSV_HEADER, type CreateCampaignFields } from '@shared/contracts';
import { useCsvValidation } from './useCsvValidation';
import { useCreateCampaignStore } from './store';
import { sampleCsv } from './csvAnalysis';
import { useCampaignListStore } from '../campaign-list/store';
import { fmtBytes, fmtNumber } from '@/lib/format';
import { Button, Card, Field, ProgressBar } from '@/components/ui';
import { cx, inputClass } from '@/components/classes';
import { validateForm, type FormState } from './formValidation';

function localNowPlus(minutes: number) {
  const d = new Date(Date.now() + minutes * 60_000);
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function CreateCampaignPage() {
  const navigate = useNavigate();
  const tenants = useCampaignListStore((s) => s.tenants);
  const loadTenants = useCampaignListStore((s) => s.loadTenants);
  const { phase, progress, error, serverRowErrors, submit, reset } = useCreateCampaignStore();

  const [form, setForm] = useState<FormState>({ tenantId: '', name: '', channel: 'EMAIL', messageTemplate: '', when: 'now', scheduledAt: localNowPlus(60) });
  const [touched, setTouched] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const csv = useCsvValidation(file, form.channel);

  useEffect(() => { loadTenants(); reset(); }, [loadTenants, reset]);

  const errors = useMemo(() => validateForm(form), [form]);
  const busy = phase === 'uploading' || phase === 'processing';
  const csvOk = csv.status === 'done' && !csv.summary.headerError && csv.summary.errorCount === 0;
  const canSubmit = Object.keys(errors).length === 0 && csvOk && !busy;

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => { setForm((f) => ({ ...f, [k]: v })); reset(); };
  const chooseFile = (f: File | null) => { setFile(f); reset(); };

  const onSubmit = async () => {
    setTouched(true);
    if (!canSubmit || !file) return;
    const fields: CreateCampaignFields = {
      tenantId: form.tenantId.trim(),
      name: form.name.trim(),
      channel: form.channel,
      messageTemplate: form.messageTemplate,
      scheduledAt: form.when === 'later' ? new Date(form.scheduledAt).toISOString() : null,
    };
    const created = await submit(fields, file);
    if (created) navigate(`/campaigns/${created.id}`, { state: { justCreated: true } });
  };

  const show = (k: keyof FormState) => (touched ? errors[k] : undefined);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link to="/campaigns" className="text-sm text-slate-500 hover:text-slate-700">← Campaigns</Link>
        <h1 className="mt-2 text-xl font-semibold text-slate-900">New campaign</h1>
      </div>

      <form noValidate onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="space-y-5">
        <Card title="Campaign details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tenant ID" htmlFor="tenantId" error={show('tenantId')}>
              <input id="tenantId" list="tenant-options" className={inputClass} placeholder="tenant-acme" value={form.tenantId}
                aria-invalid={!!show('tenantId')} onChange={(e) => set('tenantId', e.target.value)} disabled={busy} />
              <datalist id="tenant-options">{tenants.map((t) => <option key={t} value={t} />)}</datalist>
            </Field>
            <Field label="Campaign name" htmlFor="name" error={show('name')}>
              <input id="name" className={inputClass} placeholder="Year-end promo" value={form.name}
                aria-invalid={!!show('name')} onChange={(e) => set('name', e.target.value)} disabled={busy} />
            </Field>
          </div>

          <fieldset className="mt-4">
            <legend className="mb-1.5 text-sm font-medium text-slate-700">Channel</legend>
            <div className="inline-flex rounded-lg bg-slate-100 p-1" role="radiogroup">
              {CHANNELS.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={form.channel === c} disabled={busy}
                  onClick={() => set('channel', c)}
                  className={cx('rounded-md px-4 py-1.5 text-sm font-medium', form.channel === c ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
                  {c}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {form.channel === 'EMAIL' && 'Every row needs an email address.'}
              {form.channel === 'SMS' && 'Every row needs a phone number in international format (+60…).'}
              {form.channel === 'PUSH' && 'Sent to the recipient’s registered devices by recipientId.'}
            </p>
          </fieldset>

          <div className="mt-4">
            <Field label="Message template" htmlFor="template" error={show('messageTemplate')} hint="Use {{firstName}}-style placeholders for personalisation.">
              <textarea id="template" rows={4} className={inputClass} value={form.messageTemplate} disabled={busy}
                aria-invalid={!!show('messageTemplate')} placeholder="Hi {{firstName}}, your policy renews on {{renewalDate}}."
                onChange={(e) => set('messageTemplate', e.target.value)} />
            </Field>
            <p className={cx('mt-1 text-right text-xs tabular-nums', form.channel === 'SMS' && form.messageTemplate.length > 160 ? 'text-amber-600' : 'text-slate-400')}>
              {form.messageTemplate.length} characters{form.channel === 'SMS' && form.messageTemplate.length > 160 && ` · ${Math.ceil(form.messageTemplate.length / 153)} SMS parts`}
            </p>
          </div>

          <fieldset className="mt-2">
            <legend className="mb-1.5 text-sm font-medium text-slate-700">Schedule</legend>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="inline-flex items-center gap-2"><input type="radio" name="when" checked={form.when === 'now'} onChange={() => set('when', 'now')} disabled={busy} /> Send now</label>
              <label className="inline-flex items-center gap-2"><input type="radio" name="when" checked={form.when === 'later'} onChange={() => set('when', 'later')} disabled={busy} /> Schedule for later</label>
              {form.when === 'later' && (
                <input type="datetime-local" aria-label="Schedule time" className={cx(inputClass, 'w-auto')} min={localNowPlus(1)} value={form.scheduledAt}
                  aria-invalid={!!show('scheduledAt')} onChange={(e) => set('scheduledAt', e.target.value)} disabled={busy} />
              )}
            </div>
            {show('scheduledAt') && <p className="mt-1 text-xs text-red-600">{show('scheduledAt')}</p>}
          </fieldset>
        </Card>

        <Card title="Recipients" actions={<SampleDownload />}>
          <Dropzone file={file} onFile={chooseFile} disabled={busy} />
          <CsvResult csv={csv} touched={touched} hasFile={!!file} />
        </Card>

        {(phase !== 'idle' || error) && (
          <Card>
            {busy && (
              <div aria-live="polite">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-slate-700">{phase === 'uploading' ? 'Uploading recipients…' : 'Upload complete — server is checking the file…'}</span>
                  <span className="tabular-nums text-slate-500">{Math.round(progress * 100)}%</span>
                </div>
                <ProgressBar value={progress} label="Upload progress" />
              </div>
            )}
            {phase === 'error' && (
              <div role="alert" className="space-y-2">
                <p className="text-sm font-medium text-red-700">Campaign was not created: {error}</p>
                {serverRowErrors.length > 0 && <ErrorList errors={serverRowErrors} />}
                <p className="text-xs text-slate-500">You can fix the problem and submit again, or retry if it was a connection issue. Retrying cannot create a duplicate campaign.</p>
              </div>
            )}
          </Card>
        )}

        <div className="flex items-center justify-end gap-3">
          <Link to="/campaigns"><Button type="button" variant="ghost" disabled={busy}>Cancel</Button></Link>
          <Button type="submit" disabled={busy || (touched && !canSubmit)}>
            {busy ? 'Creating…' : phase === 'error' ? 'Retry' : form.when === 'later' ? 'Schedule campaign' : 'Create & send'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function SampleDownload() {
  const download = () => {
    const url = URL.createObjectURL(new Blob([sampleCsv()], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'recipients-sample.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <button type="button" onClick={download} className="text-sm font-medium text-brand-600 hover:text-brand-700">
      Download sample CSV
    </button>
  );
}

function Dropzone({ file, onFile, disabled }: { file: File | null; onFile: (f: File | null) => void; disabled: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (!disabled && e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
  };
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cx('flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors', over ? 'border-brand-500 bg-brand-50' : 'border-slate-300 bg-slate-50')}
    >
      <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" aria-label="Recipient CSV file" disabled={disabled}
        onChange={(e) => { onFile(e.target.files?.[0] ?? null); e.target.value = ''; }} />
      {file ? (
        <>
          <p className="font-medium text-slate-900">{file.name}</p>
          <p className="text-xs text-slate-500">{fmtBytes(file.size)}</p>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => input.current?.click()} disabled={disabled}>Replace file</Button>
            <Button type="button" variant="ghost" onClick={() => onFile(null)} disabled={disabled}>Remove</Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-700"><span className="font-medium">Drop a CSV here</span> or</p>
          <Button type="button" variant="secondary" onClick={() => input.current?.click()} disabled={disabled}>Browse files</Button>
          <p className="text-xs text-slate-500">Columns: <code className="font-mono">{CSV_HEADER.join(',')}</code> · up to 50 MB</p>
        </>
      )}
    </div>
  );
}

function CsvResult({ csv, touched, hasFile }: { csv: ReturnType<typeof useCsvValidation>; touched: boolean; hasFile: boolean }) {
  if (csv.status === 'empty') {
    return touched && !hasFile ? <p className="mt-3 text-sm text-red-600">Add a recipient CSV file.</p> : null;
  }
  if (csv.status === 'error') return <p role="alert" className="mt-3 text-sm text-red-600">{csv.message}</p>;
  if (csv.status === 'checking') {
    return (
      <div className="mt-4" aria-live="polite">
        <p className="mb-2 text-sm text-slate-600">Checking file… {Math.round(csv.fraction * 100)}%</p>
        <ProgressBar value={csv.fraction} label="CSV check progress" />
      </div>
    );
  }
  const s = csv.summary;
  if (s.headerError) return <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{s.headerError}</p>;
  return (
    <div className="mt-4 space-y-4">
      {s.errorCount === 0 ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">✓ {fmtNumber(s.rowCount)} recipients, no problems found.</p>
      ) : (
        <div role="alert" className="space-y-2">
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {fmtNumber(s.errorCount)} problem{s.errorCount > 1 ? 's' : ''} in {fmtNumber(s.rowCount)} rows. Fix the file and choose it again.
            {s.errorCount > s.errors.length && ` Showing the first ${s.errors.length}.`}
          </p>
          <ErrorList errors={s.errors} />
        </div>
      )}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Preview (first {s.preview.length} rows)</p>
        <div className="overflow-x-auto rounded-lg ring-1 ring-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr><th className="px-3 py-2">#</th>{CSV_HEADER.map((h) => <th key={h} className="px-3 py-2 font-mono font-medium">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {s.preview.map((r, i) => (
                <tr key={i}>
                  <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                  {CSV_HEADER.map((h) => <td key={h} className="px-3 py-1.5 font-mono text-xs text-slate-700">{r[h] || <span className="text-slate-300">—</span>}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ErrorList({ errors }: { errors: { row: number; field: string; message: string }[] }) {
  return (
    <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-lg text-sm ring-1 ring-slate-200">
      {errors.map((e, i) => (
        <li key={i} className="flex gap-3 px-3 py-1.5">
          <span className="w-16 shrink-0 tabular-nums text-slate-400">Row {e.row}</span>
          <span className="w-24 shrink-0 font-mono text-xs leading-5 text-slate-500">{e.field}</span>
          <span className="text-slate-700">{e.message}</span>
        </li>
      ))}
    </ul>
  );
}
