import { readSheet } from 'read-excel-file/browser';

export type SheetRow = Record<string, string>;

export async function readSpreadsheet(file: File): Promise<SheetRow[]> {
  const matrix = /\.csv$/i.test(file.name)
    ? parseCsv((await file.text()).replace(/^\uFEFF/, ''))
    : await readSheet(file, 1);
  const headerIndex = matrix.findIndex(row => row.some(value => String(value ?? '').trim()));
  if (headerIndex < 0) throw new Error('No header row was found in the first worksheet.');

  const headers = uniqueHeaders(matrix[headerIndex].map((value, index) =>
    String(value ?? '').trim() || `Column ${index + 1}`,
  ));
  return matrix.slice(headerIndex + 1)
    .filter(row => row.some(value => String(value ?? '').trim()))
    .map(row => Object.fromEntries(headers.map((header, index) => [header, cellText(row[index])])));
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && !cell) quoted = true;
    else if (char === ',') { row.push(cell.trim()); cell = ''; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim());
      if (row.some(value => value)) rows.push(row);
      row = [];
      cell = '';
    } else cell += char;
  }
  if (quoted) throw new Error('The CSV contains an unclosed quoted field.');
  row.push(cell.trim());
  if (row.some(value => value)) rows.push(row);
  return rows;
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).trim();
}

export function uniqueHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map(header => {
    const count = (seen.get(header) ?? 0) + 1;
    seen.set(header, count);
    return count === 1 ? header : `${header} (${count})`;
  });
}

export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character] ?? character);
}

export function normalizedKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}
