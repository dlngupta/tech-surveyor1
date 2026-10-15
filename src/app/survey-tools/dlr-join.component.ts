import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import JSZip from 'jszip';
import { readSpreadsheet, saveBlob, SheetRow } from './spreadsheet';

interface SurveyMark {
  placemark: Element;
  surveyNumber: string;
  description: string;
}

@Component({
  selector: 'app-dlr-join-tool',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="tool">
      <h2>DLR Joining to KML</h2>
      <p>Join an Excel / CSV land-record sheet to a KML map by survey number. Matching rows become KML attributes; unmatched records are reported for review.</p>
      <div class="files">
        <label>KML / KMZ map<input type="file" accept=".kml,.kmz" (change)="loadKml($event)"></label>
        <label>Excel / CSV land records<input type="file" accept=".xlsx,.csv" (change)="loadSheet($event)"></label>
      </div>
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      @if (marks().length && columns().length) {
        <div class="form-grid">
          <label>Spreadsheet survey number<select [(ngModel)]="sheetColumn"><option value="">Choose column</option>@for (c of columns(); track c) { <option [value]="c">{{ c }}</option> }</select></label>
          <label>KML survey field<select [(ngModel)]="kmlField"><option value="">Choose field</option>@for (field of kmlFields(); track field) { <option [value]="field">{{ field }}</option> }</select></label>
        </div>
        <p class="summary">{{ matches() }} matched plots · {{ unmatchedRows().length }} unmatched spreadsheet rows · {{ unmatchedPlots() }} plots without a matching row</p>
        @if (unmatchedRows().length) { <p class="hint">Unmatched survey values: {{ unmatchedRows().slice(0, 12).join(', ') }}@if (unmatchedRows().length > 12) { … }</p> }
        <button class="primary" [disabled]="!ready()" (click)="join()">Download joined KML</button>
      }
    </section>
  `,
  styles: [`
    .tool { padding: 24px; color: #284e63; font: 15px/1.5 system-ui, sans-serif; }
    h2 { margin: 0 0 8px; font-size: 22px; } p { color: #71818a; }
    .files { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
    .files label { display: grid; gap: 10px; padding: 15px; border: 1px dashed #7a9dad; border-radius: 12px; background: #f7fafb; color: #315c73; font-weight: 700; }
    .files input { max-width: 100%; font-weight: 400; }
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 18px; }
    .form-grid label { display: grid; gap: 5px; font-size: 13px; font-weight: 700; }
    select { min-height: 40px; padding: 7px; border: 1px solid #ccd8dd; border-radius: 8px; background: white; font: inherit; }
    .summary { font-weight: 700; color: #315c73; } .hint { font-size: 13px; }
    .primary { padding: 12px 17px; border: 0; border-radius: 9px; background: #0d4564; color: white; font: inherit; cursor: pointer; }
    .primary:disabled { opacity: .5; cursor: not-allowed; } .error { color: #b42318; }
  `],
})
export class DlrJoinComponent {
  rows = signal<SheetRow[]>([]);
  columns = signal<string[]>([]);
  marks = signal<SurveyMark[]>([]);
  kmlFields = signal<string[]>([]);
  error = signal('');
  sheetColumn = '';
  kmlField = '';
  private xml?: XMLDocument;
  private sourceName = 'joined';

  matches() {
    if (!this.ready()) return 0;
    const sheetValues = new Set(this.rows().map(row => this.key(row[this.sheetColumn])).filter(Boolean));
    return this.marks().filter(mark => sheetValues.has(this.key(this.fieldValue(mark)))).length;
  }

  unmatchedRows() {
    if (!this.ready()) return [];
    const mapValues = new Set(this.marks().map(mark => this.key(this.fieldValue(mark))).filter(Boolean));
    return [...new Set(this.rows().map(row => row[this.sheetColumn]).filter(value => value && !mapValues.has(this.key(value))))];
  }

  unmatchedPlots() { return this.marks().length - this.matches(); }

  ready() { return !!this.xml && !!this.rows().length && !!this.sheetColumn && !!this.kmlField; }

  async loadSheet(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.error.set('');
    try {
      const rows = await readSpreadsheet(file);
      const columns = rows.length ? Object.keys(rows[0]) : [];
      if (!rows.length) throw new Error('No land-record rows were found.');
      this.rows.set(rows);
      this.columns.set(columns);
      this.sheetColumn = columns.find(column => /survey|lpm|plot/i.test(column)) ?? '';
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not read the land-record sheet.');
    }
  }

  async loadKml(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.error.set('');
    this.xml = undefined;
    try {
      let text: string;
      if (file.name.toLowerCase().endsWith('.kmz')) {
        const zip = await JSZip.loadAsync(file);
        const entry = Object.values(zip.files).find(item => item.name.toLowerCase().endsWith('.kml'));
        if (!entry) throw new Error('No KML document was found inside this KMZ.');
        text = await entry.async('string');
      } else {
        text = await file.text();
      }
      const xml = new DOMParser().parseFromString(text, 'text/xml');
      if (xml.querySelector('parsererror')) throw new Error('The KML file could not be parsed.');
      const marks = Array.from(xml.getElementsByTagNameNS('*', 'Placemark')).map(placemark => ({
        placemark,
        surveyNumber: this.findSurvey(placemark),
        description: placemark.getElementsByTagNameNS('*', 'name')[0]?.textContent?.trim() ?? '',
      }));
      if (!marks.length) throw new Error('No KML placemarks were found.');
      this.xml = xml;
      this.sourceName = file.name.replace(/\.(kmz|kml)$/i, '') || 'joined';
      this.marks.set(marks);
      this.kmlFields.set(['Placemark name', ...new Set(marks.flatMap(mark => Object.keys(this.properties(mark.placemark))))]);
      this.kmlField = this.kmlFields().find(field => /survey|lpm|plot/i.test(field)) ?? 'Placemark name';
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not read the KML map.');
    }
  }

  join() {
    if (!this.ready() || !this.xml) return;
    const rowsBySurvey = new Map<string, SheetRow>();
    for (const row of this.rows()) {
      const key = this.key(row[this.sheetColumn]);
      if (key) rowsBySurvey.set(key, row);
    }
    const doc = this.xml;
    const ns = doc.documentElement.namespaceURI ?? 'http://www.opengis.net/kml/2.2';
    for (const mark of this.marks()) {
      const properties = this.properties(mark.placemark);
      const key = this.key(this.fieldValue(mark));
      const row = rowsBySurvey.get(key);
      if (!row) continue;
      let extended = mark.placemark.getElementsByTagNameNS('*', 'ExtendedData')[0];
      if (!extended) {
        extended = doc.createElementNS(ns, 'ExtendedData');
        const geometry = Array.from(mark.placemark.children).find(child =>
          ['Point', 'LineString', 'Polygon', 'MultiGeometry', 'Model', 'Track', 'MultiTrack'].includes(child.localName),
        );
        mark.placemark.insertBefore(extended, geometry ?? null);
      }
      for (const [name, value] of Object.entries(row)) {
        if (value && !properties[name]) {
          const data = doc.createElementNS(ns, 'Data');
          data.setAttribute('name', name);
          const displayName = doc.createElementNS(ns, 'displayName');
          displayName.textContent = name;
          const valueNode = doc.createElementNS(ns, 'value');
          valueNode.textContent = value;
          data.append(displayName, valueNode);
          extended.appendChild(data);
        }
      }
    }
    const output = new Blob([new XMLSerializer().serializeToString(doc)], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8' });
    saveBlob(output, `${this.sourceName}-joined.kml`);
  }

  private key(value: string | undefined) {
    return (value ?? '').trim().toLowerCase().replace(/\s+/g, '');
  }

  private properties(placemark: Element): Record<string, string> {
    const values: Record<string, string> = {};
    for (const node of Array.from(placemark.getElementsByTagNameNS('*', 'Data'))) {
      const name = node.getAttribute('name');
      const value = node.getElementsByTagNameNS('*', 'value')[0]?.textContent?.trim();
      if (name && value !== undefined) values[name] = value;
    }
    for (const node of Array.from(placemark.getElementsByTagNameNS('*', 'SimpleData'))) {
      const name = node.getAttribute('name');
      if (name) values[name] = node.textContent?.trim() ?? '';
    }
    return values;
  }

  private findSurvey(placemark: Element) {
    const values = this.properties(placemark);
    const match = Object.entries(values).find(([name]) => /survey|lpm|plot/i.test(name));
    return match?.[1] ?? placemark.getElementsByTagNameNS('*', 'name')[0]?.textContent?.trim() ?? '';
  }

  private fieldValue(mark: SurveyMark) {
    if (this.kmlField === 'Placemark name') return mark.description;
    return this.properties(mark.placemark)[this.kmlField] ?? mark.surveyNumber;
  }
}
