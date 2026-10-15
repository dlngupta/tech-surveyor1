import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlignmentType, Document, HeadingLevel, Packer, PageBreak, Paragraph, TextRun } from 'docx';
import { escapeHtml, readSpreadsheet, saveBlob, SheetRow } from './spreadsheet';

@Component({
  selector: 'app-notices-tool',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="tool">
      <h2>Resurvey Notices</h2>
      <p>Load a village Excel/CSV list, map the relevant columns, then generate editable Word notices or print to PDF. These are editable general-purpose drafts, not official government forms.</p>
      <label class="file">Select Excel / CSV<input type="file" accept=".xlsx,.csv" (change)="load($event)"></label>
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      @if (rows().length) {
        <div class="form-grid">
          <label>Notice type<select [(ngModel)]="noticeType"><option>Ground Truthing (GT)</option><option>Ground Verification (GV)</option><option>Section 9(2)</option></select></label>
          <label>District<input [(ngModel)]="district"></label>
          <label>Mandal<input [(ngModel)]="mandal"></label>
          <label>Village<input [(ngModel)]="village"></label>
          <label>Notice date<input type="date" [(ngModel)]="noticeDate"></label>
          <label>Meeting date<input type="date" [(ngModel)]="meetingDate"></label>
          <label>Survey number column<select [(ngModel)]="surveyColumn"><option value="">(not selected)</option>@for (c of columns(); track c) { <option [value]="c">{{ c }}</option> }</select></label>
          <label>Pattadar / recipient column<select [(ngModel)]="ownerColumn"><option value="">(not selected)</option>@for (c of columns(); track c) { <option [value]="c">{{ c }}</option> }</select></label>
          <label>Extent column<select [(ngModel)]="extentColumn"><option value="">(not selected)</option>@for (c of columns(); track c) { <option [value]="c">{{ c }}</option> }</select></label>
        </div>
        <p class="summary">{{ rows().length }} recipients · preview uses the first 3 records.</p>
        <div class="preview">
          @for (row of rows().slice(0, 3); track $index) {
            <article><b>{{ owner(row) || 'Landholder' }}</b><span>Survey no: {{ value(row, surveyColumn) || '—' }} · Extent: {{ value(row, extentColumn) || '—' }}</span></article>
          }
        </div>
        <div class="actions"><button class="primary" (click)="downloadWord()">Download Word notices</button><button class="secondary" (click)="printNotices()">Print / Save as PDF</button></div>
      }
    </section>
  `,
  styles: [`
    .tool { padding: 24px; color: #284e63; font: 15px/1.5 system-ui, sans-serif; }
    h2 { margin: 0 0 8px; font-size: 22px; } p { color: #71818a; }
    .file { display: block; padding: 16px; border: 1px dashed #7a9dad; border-radius: 12px; background: #f7fafb; }
    .file input { display: block; margin-top: 10px; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; margin-top: 18px; }
    .form-grid label { display: grid; gap: 5px; color: #456577; font-size: 13px; font-weight: 600; }
    input, select { box-sizing: border-box; width: 100%; min-height: 40px; padding: 8px; border: 1px solid #ccd8dd; border-radius: 8px; background: white; font: inherit; }
    .summary { font-weight: 700; color: #315c73; }
    .preview { display: grid; gap: 8px; }
    article { display: grid; gap: 3px; padding: 10px 12px; border: 1px solid #e4eaed; border-radius: 9px; background: #fff; }
    article span { color: #71818a; font-size: 13px; }
    .actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
    button { padding: 11px 15px; border-radius: 8px; font: inherit; cursor: pointer; }
    .primary { border: 0; background: #0d4564; color: white; } .secondary { border: 1px solid #0d4564; background: white; color: #0d4564; }
    .error { color: #b42318; }
  `],
})
export class NoticesComponent {
  rows = signal<SheetRow[]>([]);
  columns = signal<string[]>([]);
  error = signal('');
  noticeType = 'Ground Truthing (GT)';
  district = '';
  mandal = '';
  village = '';
  noticeDate = new Date().toISOString().slice(0, 10);
  meetingDate = '';
  surveyColumn = '';
  ownerColumn = '';
  extentColumn = '';

  async load(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.error.set('');
    try {
      const rows = await readSpreadsheet(file);
      const columns = rows.length ? Object.keys(rows[0]) : [];
      this.rows.set(rows);
      this.columns.set(columns);
      this.surveyColumn = this.findColumn(columns, ['survey number', 'survey no', 'lpm no', 'lpm number']);
      this.ownerColumn = this.findColumn(columns, ['pattadar name', 'owner name', 'name']);
      this.extentColumn = this.findColumn(columns, ['extent', 'area', 'acres']);
      if (!rows.length) this.error.set('The worksheet contains no recipient rows.');
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not read this workbook.');
    }
  }

  owner(row: SheetRow) { return this.value(row, this.ownerColumn); }
  value(row: SheetRow, column: string) { return column ? row[column] ?? '' : ''; }

  async downloadWord() {
    if (!this.rows().length) return;
    this.error.set('');
    try {
      const content: Paragraph[] = [];
      this.rows().forEach((row, index) => {
        if (index) content.push(new Paragraph({ children: [new PageBreak()] }));
        content.push(new Paragraph({ text: 'GOVERNMENT OF ANDHRA PRADESH', heading: HeadingLevel.HEADING_2, alignment: AlignmentType.CENTER }));
        content.push(new Paragraph({ text: this.noticeType.toUpperCase(), heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }));
        content.push(new Paragraph({ children: [new TextRun({ text: `District: ${this.district || '________________'}    Mandal: ${this.mandal || '________________'}` })] }));
        content.push(new Paragraph({ text: `Village: ${this.village || '________________'}                         Date: ${this.noticeDate}` }));
        content.push(new Paragraph({ text: '' }));
        content.push(new Paragraph({ text: `To: ${this.owner(row) || 'Landholder / Pattadar'}` }));
        content.push(new Paragraph({ text: `Survey number: ${this.value(row, this.surveyColumn) || '________________'}    Extent: ${this.value(row, this.extentColumn) || '________________'}` }));
        content.push(new Paragraph({ text: '' }));
        content.push(new Paragraph({ text: `You are hereby informed that survey work under ${this.noticeType} is being conducted in the above village. You are requested to attend and cooperate with the survey staff and bring relevant land-record documents.` }));
        if (this.meetingDate) content.push(new Paragraph({ text: `Meeting / survey date: ${this.meetingDate}` }));
        content.push(new Paragraph({ text: '' }));
        content.push(new Paragraph({ text: 'Place: ____________________' }));
        content.push(new Paragraph({ text: 'Signature of authorised officer: ____________________' }));
        content.push(new Paragraph({ text: '' }));
        content.push(new Paragraph({ children: [new TextRun({ text: 'Draft notice for review. Verify the wording, authority, dates, and applicable legal requirements before issue.', italics: true })] }));
      });
      const document = new Document({ sections: [{ properties: {}, children: content }] });
      const blob = await Packer.toBlob(document);
      saveBlob(blob, `resurvey-notices-${this.noticeType.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.docx`);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not generate the Word notices.');
    }
  }

  printNotices() {
    if (!this.rows().length) return;
    const notices = this.rows().map(row => `
      <article><h2>GOVERNMENT OF ANDHRA PRADESH</h2><h1>${escapeHtml(this.noticeType)}</h1>
      <p>District: ${escapeHtml(this.district || '________________')} &nbsp; Mandal: ${escapeHtml(this.mandal || '________________')}</p>
      <p>Village: ${escapeHtml(this.village || '________________')} &nbsp; Date: ${escapeHtml(this.noticeDate)}</p>
      <p>To: ${escapeHtml(this.owner(row) || 'Landholder / Pattadar')}</p>
      <p>Survey number: ${escapeHtml(this.value(row, this.surveyColumn) || '________________')} &nbsp; Extent: ${escapeHtml(this.value(row, this.extentColumn) || '________________')}</p>
      <p>You are hereby informed that survey work under ${escapeHtml(this.noticeType)} is being conducted in the above village. You are requested to attend and cooperate with the survey staff and bring relevant land-record documents.</p>
      ${this.meetingDate ? `<p>Meeting / survey date: ${escapeHtml(this.meetingDate)}</p>` : ''}
      <p class="sign">Place: ____________________<br><br>Signature of authorised officer: ____________________</p>
      <p class="draft">Draft notice. Verify wording, authority, dates, and applicable legal requirements before issue.</p></article>
    `).join('');
    const printWindow = window.open('', '_blank');
    if (!printWindow) { this.error.set('Allow pop-ups to open the print view.'); return; }
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Resurvey notices</title><style>
      body{font:14px/1.6 Arial,sans-serif;color:#111}article{max-width:720px;margin:32px auto;padding:28px;page-break-after:always}h1,h2{text-align:center}h2{font-size:16px}.sign{margin-top:48px}.draft{margin-top:30px;color:#666;font-style:italic;font-size:11px}@media print{article{margin:0 auto;page-break-after:always}}
      </style></head><body>${notices}<script>window.onload=()=>window.print()<\/script></body></html>`);
    printWindow.document.close();
  }

  private findColumn(columns: string[], aliases: string[]) {
    return columns.find(column => aliases.some(alias => column.toLowerCase().includes(alias))) ?? '';
  }
}
