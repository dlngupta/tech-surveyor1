import { Component, signal } from '@angular/core';
import { readSpreadsheet, saveBlob, SheetRow } from './spreadsheet';
import writeXlsxFile from 'write-excel-file/browser';

@Component({
  selector: 'app-adangal-tool',
  standalone: true,
  template: `
    <section class="tool">
      <h2>Webland Adangal to Regular Excel</h2>
      <p>Choose an Adangal workbook or CSV. The first worksheet is converted into a clean, filterable Excel sheet. Blank cells are kept blank; no land-record values are invented.</p>
      <label class="file"><span>Select Adangal Excel / CSV</span><input type="file" accept=".xlsx,.csv" (change)="load($event)"></label>
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      @if (rows().length) {
        <p class="summary">{{ rows().length }} rows · {{ columns().length }} columns</p>
        <fieldset>
          <legend>Fill down merged cells (optional)</legend>
          <p>Select only columns where blank rows mean “same as the row above”. This is useful for merged village / mandal cells.</p>
          @for (column of columns(); track column) {
            <label class="check"><input type="checkbox" [checked]="fillDownColumns().includes(column)" (change)="toggleFillDown(column)"> {{ column }}</label>
          }
        </fieldset>
        <div class="table-wrap">
          <table><thead><tr>@for (col of columns(); track col) { <th>{{ col }}</th> }</tr></thead>
            <tbody>@for (row of rows().slice(0, 12); track $index) { <tr>@for (col of columns(); track col) { <td>{{ row[col] }}</td> }</tr> }</tbody>
          </table>
        </div>
        @if (rows().length > 12) { <p class="hint">Showing the first 12 rows of {{ rows().length }}.</p> }
        <button class="primary" (click)="export()">Download cleaned Excel</button>
      }
    </section>
  `,
  styles: [`
    .tool { padding: 24px; color: #284e63; font: 15px/1.5 system-ui, sans-serif; }
    h2 { margin: 0 0 8px; font-size: 22px; }
    p { color: #71818a; }
    .file { display: block; padding: 16px; border: 1px dashed #7a9dad; border-radius: 12px; background: #f7fafb; cursor: pointer; }
    .file input { display: block; margin-top: 10px; max-width: 100%; }
    .summary { font-weight: 700; color: #315c73; }
    fieldset { display: flex; flex-wrap: wrap; gap: 8px 14px; margin: 12px 0; border: 1px solid #dce6e9; border-radius: 9px; }
    legend { padding: 0 6px; font-weight: 700; color: #315c73; }
    fieldset p { flex-basis: 100%; margin: 0; font-size: 13px; }
    .check { font-size: 13px; }
    .table-wrap { max-width: 100%; overflow: auto; border: 1px solid #e2e8eb; border-radius: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; white-space: nowrap; }
    th, td { padding: 8px 10px; border-bottom: 1px solid #e8edef; text-align: left; }
    th { background: #edf4f7; }
    .hint { font-size: 13px; }
    .primary { margin-top: 16px; padding: 12px 18px; border: 0; border-radius: 9px; background: #0d4564; color: white; font: inherit; cursor: pointer; }
    .error { color: #b42318; }
  `],
})
export class AdangalComponent {
  rows = signal<SheetRow[]>([]);
  columns = signal<string[]>([]);
  fillDownColumns = signal<string[]>([]);
  error = signal('');
  private fileName = 'adangal';

  async load(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.error.set('');
    this.rows.set([]);
    try {
      this.fileName = file.name.replace(/\.[^.]+$/, '') || 'adangal';
      const rows = await readSpreadsheet(file);
      this.rows.set(rows);
      this.columns.set(rows.length ? Object.keys(rows[0]) : []);
      this.fillDownColumns.set([]);
      if (!rows.length) this.error.set('The worksheet contains headers but no data rows.');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not read this workbook.');
    }
  }

  async export() {
    const columns = this.columns();
    const previous: Record<string, string> = {};
    const normalizedRows = this.rows().map(row => {
      const normalized = { ...row };
      for (const column of this.fillDownColumns()) {
        if (!normalized[column] && previous[column]) normalized[column] = previous[column];
        if (normalized[column]) previous[column] = normalized[column];
      }
      return normalized;
    });
    const rows = [columns, ...normalizedRows.map(row => columns.map(column => row[column] ?? ''))];
    try {
      const workbook = await writeXlsxFile(rows, {
        sheet: 'Regular Adangal',
        columns: columns.map(column => ({ width: Math.min(40, Math.max(12, column.length + 2)) })),
      });
      saveBlob(await workbook.toBlob(), `${this.fileName}-regular.xlsx`);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not create the Excel workbook.');
    }

  }

  toggleFillDown(column: string) {
    this.fillDownColumns.update(columns => columns.includes(column)
      ? columns.filter(item => item !== column)
      : [...columns, column]);
  }
}
