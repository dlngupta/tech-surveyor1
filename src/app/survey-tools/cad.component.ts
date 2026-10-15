import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { saveBlob } from './spreadsheet';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

interface CadShape {
  type: 'line' | 'polygon' | 'point';
  points: Array<{ x: number; y: number }>;
}

@Component({
  selector: 'app-cad-tool',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="tool">
      <h2>CAD Tools</h2>
      <p>Draw simple point, line and closed-polygon plans in a metre-based workspace. Add vertices by clicking; finish a line or polygon with the button. Export editable DXF or a printable PDF plan.</p>
      <div class="toolbar">
        <label>Tool<select [(ngModel)]="mode"><option value="select">Select</option><option value="point">Point</option><option value="line">Line</option><option value="polygon">Polygon</option></select></label>
        <label>Scale (drawing units per metre)<input type="number" min="0.001" step="0.1" [(ngModel)]="unitsPerMeter"></label>
        <label class="snap"><input type="checkbox" [(ngModel)]="snapToGrid"> Snap to 1 m grid</label>
        <label>Trace plan (image / PDF)<input type="file" accept="image/*,.pdf" (change)="loadPlan($event)"></label>
        @if (mode === 'polygon' || mode === 'line') { <button (click)="finish()" [disabled]="draft().length < (mode === 'polygon' ? 3 : 2)">Finish {{ mode === 'polygon' ? 'polygon' : 'line' }}</button> }
        <button (click)="undo()" [disabled]="!shapes().length && !draft().length">Undo</button>
        <button (click)="clear()" [disabled]="!shapes().length && !draft().length">Clear</button>
        @if (selectedArea() !== null) {
          <label>Divide into<input type="number" min="2" max="20" step="1" [(ngModel)]="divideCount"></label>
          <button (click)="divideSelected()">Divide polygon</button>
          <button (click)="deleteSelected()">Delete selected</button>
        }
        <button (click)="downloadDxf()" [disabled]="!shapes().length">Export DXF</button>
        <button (click)="downloadPdf()" [disabled]="!shapes().length">Export PDF plan</button>
      </div>
      <p class="help">{{ helpText() }}</p>
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      @if (selectedArea() !== null) { <p class="area">Selected polygon: {{ selectedArea()!.toFixed(2) }} m² · {{ (selectedArea()! / 4046.8564224).toFixed(4) }} acres</p> }
      <div class="board-wrap">
        <svg class="board" viewBox="0 0 1000 700" preserveAspectRatio="none" (click)="canvasClick($event)" (dblclick)="finish()" (pointermove)="moveShape($event)" (pointerup)="endDrag()" (pointerleave)="endDrag()">
          <defs><pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="#dfe8eb" stroke-width="1"/></pattern></defs>
          <rect width="1000" height="700" fill="url(#grid)"/>
          @if (underlay()) { <image [attr.href]="underlay()" x="0" y="0" width="1000" height="700" opacity=".55" preserveAspectRatio="none" pointer-events="none"/> }
          @for (shape of shapes(); track $index; let i = $index) {
            @if (shape.type === 'polygon') { <polygon [attr.points]="pointString(shape)" [class.selected]="selected() === i" (pointerdown)="beginDrag(i, $event)"/> }
            @else if (shape.type === 'line') { <polyline [attr.points]="pointString(shape)" [class.selected]="selected() === i" (pointerdown)="beginDrag(i, $event)"/> }
            @else { <circle [attr.cx]="shape.points[0].x" [attr.cy]="shape.points[0].y" r="5" [class.selected]="selected() === i" (pointerdown)="beginDrag(i, $event)"/> }
          }
          @if (draft().length > 0) {
            <polyline [attr.points]="draftString()" class="draft"/>
            @for (p of draft(); track $index) { <circle class="draft-point" [attr.cx]="p.x" [attr.cy]="p.y" r="4"/> }
          }
          <text x="18" y="682" class="grid-label">Grid: 50 units · Coordinates are interpreted as metres at 1 drawing unit = 1 m.</text>
        </svg>
      </div>
    </section>
  `,
  styles: [`
    .tool { padding: 24px; color: #284e63; font: 15px/1.5 system-ui, sans-serif; }
    h2 { margin: 0 0 8px; font-size: 22px; } p { color: #71818a; }
    .toolbar { display: flex; flex-wrap: wrap; align-items: end; gap: 8px; }
    .toolbar label { display: grid; gap: 3px; color: #456577; font-size: 12px; font-weight: 700; }
    .toolbar input, .toolbar select { min-height: 36px; max-width: 180px; padding: 6px; border: 1px solid #ccd8dd; border-radius: 7px; background: white; font: inherit; }
    .toolbar .snap { display: flex; flex-direction: row; align-items: center; min-height: 36px; }
    .toolbar .snap input { min-height: auto; }
    button { min-height: 36px; padding: 7px 10px; border: 1px solid #cbd8dd; border-radius: 7px; background: white; color: #315c73; font: inherit; cursor: pointer; }
    button:disabled { opacity: .45; cursor: not-allowed; }
    .help, .area { margin: 10px 0; font-size: 13px; } .area { color: #267344; font-weight: 700; }
    .error { color: #b42318; }
    .board-wrap { width: 100%; overflow: auto; background: #fff; border: 1px solid #d9e2e5; border-radius: 10px; }
    .board { display: block; width: 100%; min-width: 620px; height: min(65vh, 520px); cursor: crosshair; }
    polyline, polygon { fill: #4a9b8933; stroke: #087a69; stroke-width: 3; vector-effect: non-scaling-stroke; cursor: pointer; }
    polyline { fill: none; } .selected { stroke: #e87500; fill: #f3a03455; }
    circle { fill: #176ab3; stroke: white; stroke-width: 2; vector-effect: non-scaling-stroke; cursor: pointer; }
    .draft { fill: none; stroke: #d64141; stroke-dasharray: 6 4; } .draft-point { fill: #d64141; }
    .grid-label { fill: #829198; font-size: 12px; }
    @media print { .toolbar, .help, h2, .tool > p { display: none; } .board { height: auto; min-width: 0; } }
  `],
})
export class CadComponent {
  shapes = signal<CadShape[]>([]);
  draft = signal<Array<{ x: number; y: number }>>([]);
  selected = signal<number | null>(null);
  underlay = signal('');
  error = signal('');
  mode: 'select' | 'point' | 'line' | 'polygon' = 'polygon';
  unitsPerMeter = 1;
  snapToGrid = true;
  divideCount = 2;
  private dragState?: { index: number; startX: number; startY: number; points: Array<{ x: number; y: number }> };

  helpText() {
    if (this.mode === 'select') return 'Choose a polygon to see its area.';
    if (this.mode === 'point') return 'Click once on the board to place a point.';
    return this.mode === 'line' ? 'Click to add line vertices; click Finish line or double-click to complete.' : 'Click to add polygon vertices; click Finish polygon or double-click to complete.';
  }

  selectedArea() {
    const shape = this.shapes()[this.selected() ?? -1];
    if (!shape || shape.type !== 'polygon') return null;
    return this.polygonArea(shape) / Math.max(0.001, Number(this.unitsPerMeter)) ** 2;
  }

  canvasClick(event: MouseEvent) {
    const rect = (event.currentTarget as SVGSVGElement).getBoundingClientRect();
    const point = { x: (event.clientX - rect.left) / rect.width * 1000, y: (event.clientY - rect.top) / rect.height * 700 };
    if (this.mode === 'select') { this.selected.set(null); return; }
    const snapped = this.snap(point);
    if (this.mode === 'point') {
      this.shapes.update(shapes => [...shapes, { type: 'point', points: [snapped] }]);
      this.selected.set(this.shapes().length - 1);
      return;
    }
    this.draft.update(points => [...points, snapped]);
  }

  finish() {
    const points = this.draft();
    const minimum = this.mode === 'polygon' ? 3 : 2;
    if (points.length < minimum || (this.mode !== 'polygon' && this.mode !== 'line')) return;
    const type = this.mode;
    this.shapes.update(shapes => [...shapes, { type, points: [...points] }]);
    this.draft.set([]);
    this.selected.set(this.shapes().length - 1);
  }

  undo() {
    if (this.draft().length) this.draft.update(points => points.slice(0, -1));
    else this.shapes.update(shapes => shapes.slice(0, -1));
    this.selected.set(null);
  }

  clear() { this.shapes.set([]); this.draft.set([]); this.selected.set(null); }
  select(index: number) { this.selected.set(index); }
  deleteSelected() {
    const index = this.selected();
    if (index === null) return;
    this.shapes.update(shapes => shapes.filter((_, i) => i !== index));
    this.selected.set(null);
  }

  divideSelected() {
    const index = this.selected();
    const count = Math.max(2, Math.min(20, Math.floor(Number(this.divideCount) || 2)));
    const shape = this.shapes()[index ?? -1];
    if (!shape || shape.type !== 'polygon') return;
    const minX = Math.min(...shape.points.map(point => point.x));
    const maxX = Math.max(...shape.points.map(point => point.x));
    if (maxX - minX < 0.001) return;
    const pieces: CadShape[] = [];
    for (let part = 0; part < count; part++) {
      const left = minX + (maxX - minX) * part / count;
      const right = minX + (maxX - minX) * (part + 1) / count;
      const clipped = this.clipVertical(shape.points, left, true)
        .flatMap(points => this.clipVertical(points, right, false));
      for (const points of clipped) {
        if (points.length >= 3 && this.pointsArea(points) > 0.01) pieces.push({ type: 'polygon', points });
      }
    }
    if (pieces.length < 2) return;
    this.shapes.update(shapes => [...shapes.slice(0, index!), ...pieces, ...shapes.slice(index! + 1)]);
    this.selected.set(index);
  }

  beginDrag(index: number, event: PointerEvent) {
    event.stopPropagation();
    if (this.mode !== 'select') return;
    const point = this.coordinates(event);
    const shape = this.shapes()[index];
    this.selected.set(index);
    this.dragState = { index, startX: point.x, startY: point.y, points: shape.points.map(p => ({ ...p })) };
    (event.currentTarget as SVGElement).setPointerCapture(event.pointerId);
  }

  moveShape(event: PointerEvent) {
    const drag = this.dragState;
    if (!drag) return;
    const point = this.coordinates(event);
    const dx = point.x - drag.startX, dy = point.y - drag.startY;
    this.shapes.update(shapes => shapes.map((shape, index) => index === drag.index
      ? { ...shape, points: drag.points.map(original => this.snap({ x: original.x + dx, y: original.y + dy })) }
      : shape));
  }

  endDrag() { this.dragState = undefined; }

  async loadPlan(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.error.set('');
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 700;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('This browser could not create an image canvas.');
      context.fillStyle = '#fff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      if (/\.pdf$/i.test(file.name)) {
        const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: Math.min(1000 / page.getViewport({ scale: 1 }).width, 700 / page.getViewport({ scale: 1 }).height) });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: context, viewport, canvas } as any).promise;
      } else {
        const image = await createImageBitmap(file);
        const scale = Math.min(canvas.width / image.width, canvas.height / image.height);
        context.drawImage(image, 0, 0, image.width * scale, image.height * scale);
        image.close();
      }
      this.underlay.set(canvas.toDataURL('image/png'));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not open the plan to trace.');
    }
  }

  pointString(shape: CadShape) { return shape.points.map(point => `${point.x},${point.y}`).join(' '); }
  draftString() { return this.draft().map(point => `${point.x},${point.y}`).join(' '); }

  downloadDxf() {
    const lines = ['0', 'SECTION', '2', 'HEADER', '9', '$INSUNITS', '70', '6', '0', 'ENDSEC', '0', 'SECTION', '2', 'ENTITIES'];
    for (const shape of this.shapes()) {
      if (shape.type === 'point') {
        const point = shape.points[0];
        lines.push('0', 'POINT', '8', '0', '10', String(point.x), '20', String(700 - point.y), '30', '0');
      } else {
        lines.push('0', shape.type === 'polygon' ? 'LWPOLYLINE' : 'LWPOLYLINE', '8', '0', '90', String(shape.points.length), '70', shape.type === 'polygon' ? '1' : '0');
        for (const point of shape.points) lines.push('10', String(point.x), '20', String(700 - point.y));
      }
    }
    lines.push('0', 'ENDSEC', '0', 'EOF');
    saveBlob(new Blob([lines.join('\r\n')], { type: 'application/dxf' }), 'survey-plan.dxf');
  }

  async downloadPdf() {
    const document = await PDFDocument.create();
    const page = document.addPage([595.28, 841.89]);
    const font = await document.embedFont(StandardFonts.Helvetica);
    page.drawText('Survey plan - schematic drawing', { x: 40, y: 800, size: 14, font });
    page.drawText(`Scale: ${Math.max(0.001, Number(this.unitsPerMeter))} drawing units per metre`, { x: 40, y: 780, size: 9, font, color: rgb(.3, .35, .38) });
    const originX = 40, originY = 100, scale = 0.5;
    if (this.underlay()) {
      const imageBytes = Uint8Array.from(atob(this.underlay().split(',')[1]), character => character.charCodeAt(0));
      const image = await document.embedPng(imageBytes);
      page.drawImage(image, { x: originX, y: originY, width: 500, height: 350, opacity: 0.55 });
    }
    for (const shape of this.shapes()) {
      const points = shape.points.map(point => ({ x: originX + point.x * scale, y: originY + point.y * scale }));
      if (shape.type === 'point') {
        page.drawCircle({ x: points[0].x, y: 741 - points[0].y, size: 3, color: rgb(.09, .42, .7) });
        continue;
      }
      const count = shape.type === 'polygon' ? points.length : points.length - 1;
      for (let i = 0; i < count; i++) {
        const start = points[i], end = points[(i + 1) % points.length];
        page.drawLine({ start: { x: start.x, y: 741 - start.y }, end: { x: end.x, y: 741 - end.y }, thickness: 1.4, color: rgb(.04, .48, .41) });
      }
    }
    const bytes = await document.save();
    saveBlob(new Blob([bytes], { type: 'application/pdf' }), 'survey-plan.pdf');
  }

  private polygonArea(shape: CadShape) {
    return this.pointsArea(shape.points);
  }

  private pointsArea(points: Array<{ x: number; y: number }>) {
    return Math.abs(points.reduce((sum, point, i) => {
      const next = points[(i + 1) % points.length];
      return sum + point.x * next.y - next.x * point.y;
    }, 0) / 2);
  }

  private coordinates(event: PointerEvent | MouseEvent) {
    const target = event.target;
    const svg = event.currentTarget instanceof SVGSVGElement
      ? event.currentTarget
      : target instanceof SVGGraphicsElement ? target.ownerSVGElement : null;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / rect.width * 1000, y: (event.clientY - rect.top) / rect.height * 700 };
  }

  private snap(point: { x: number; y: number }) {
    if (!this.snapToGrid) return point;
    return { x: Math.round(point.x), y: Math.round(point.y) };
  }

  private clipVertical(points: Array<{ x: number; y: number }>, edge: number, keepGreater: boolean): Array<Array<{ x: number; y: number }>> {
    const inside = (point: { x: number }) => keepGreater ? point.x >= edge : point.x <= edge;
    const output: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < points.length; i++) {
      const current = points[i], previous = points[(i + points.length - 1) % points.length];
      const currentInside = inside(current), previousInside = inside(previous);
      if (currentInside !== previousInside) {
        const t = (edge - previous.x) / (current.x - previous.x);
        output.push({ x: edge, y: previous.y + t * (current.y - previous.y) });
      }
      if (currentInside) output.push(current);
    }
    return output.length >= 3 ? [output] : [];
  }
}
