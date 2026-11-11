export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

const fieldBase =
  'block w-full rounded-lg border-0 bg-white py-2 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 disabled:bg-slate-50 aria-[invalid=true]:ring-red-400';

export const inputClass = cx(fieldBase, 'px-3');

export const selectClass = cx(fieldBase, 'select-chevron cursor-pointer pl-3 pr-9');
