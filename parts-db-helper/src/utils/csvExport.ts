import { INDABOM_COLUMNS, Part } from '../types/part';

function csvField(value: string): string {
  const v = value ?? '';
  if (/[",\n]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

export function partsToCsv(parts: Part[]): string {
  const header = INDABOM_COLUMNS.join(',');
  const rows = parts.map(part =>
    INDABOM_COLUMNS.map(col => csvField(part[col])).join(',')
  );
  return [header, ...rows].join('\r\n');
}

export function downloadPartsCsv(parts: Part[], filename = 'parts.csv') {
  const csv = partsToCsv(parts);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
