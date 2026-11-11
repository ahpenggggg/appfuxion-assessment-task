export interface Segment {
  text: string;
  missing: boolean;
}

const VAR = /\{\{\s*([a-zA-Z_][\w.]*)\s*\}\}/g;

export function parseTemplate(template: string, data: Record<string, string>): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of template.matchAll(VAR)) {
    const start = m.index ?? 0;
    if (start > last) out.push({ text: template.slice(last, start), missing: false });
    const value = data[m[1]];
    out.push(value ? { text: value, missing: false } : { text: m[0], missing: true });
    last = start + m[0].length;
  }
  if (last < template.length) out.push({ text: template.slice(last), missing: false });
  return out;
}

export function renderTemplate(template: string, data: Record<string, string>): { text: string; missing: string[] } {
  const segs = parseTemplate(template, data);
  return {
    text: segs.map((s) => s.text).join(''),
    missing: [...new Set(segs.filter((s) => s.missing).map((s) => s.text.replace(/[{}\s]/g, '')))],
  };
}
