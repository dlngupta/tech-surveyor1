import { ChangeDetectorRef, Component, signal } from '@angular/core';
import UTIF from 'utif';
import { saveBlob } from './spreadsheet';

interface TiffPage {
  name: string;
  page: number;
  width: number;
  height: number;
  pixels: Uint8Array;
  source: File;
}

@Component({
  selector: 'app-tiff-tool',
  standalone: true,
  template: `
    <section class="tool">
      <h2>TIFF Viewer</h2>
      <p>Open single- or multi-page TIFF images. Zoom, step through images, print, or download the original file.</p>
      <label class="file">Select TIFF image(s)<input type="file" accept=".tif,.tiff,image/tiff" multiple (change)="load($event)"></label>
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      @if (pages().length) {
        <div class="controls">
          <button (click)="move(-1)" [disabled]="index() === 0">Previous</button>
          <span>{{ index() + 1 }} / {{ pages().length }} · {{ current()?.name }}</span>
          <button (click)="move(1)" [disabled]="index() >= pages().length - 1">Next</button>
          <button (click)="changeZoom(-0.25)">−</button><b>{{ Math.round(zoomLevel() * 100) }}%</b><button (click)="changeZoom(0.25)">+</button>
          <button (click)="print()">Print</button>
          <button (click)="download()">Download original</button>
        </div>
        <div class="canvas-wrap"><canvas #canvas></canvas></div>
      }
    </section>
  `,
  styles: [`
    .tool { padding: 24px; color: #284e63; font: 15px/1.5 system-ui, sans-serif; }
    h2 { margin: 0 0 8px; font-size: 22px; } p { color: #71818a; }
    .file { display: block; padding: 16px; border: 1px dashed #7a9dad; border-radius: 12px; background: #f7fafb; }
    .file input { display: block; margin-top: 10px; }
    .controls { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin: 16px 0; }
    button { padding: 8px 11px; border: 1px solid #cbd8dd; border-radius: 8px; background: white; color: #315c73; font: inherit; cursor: pointer; }
    button:disabled { opacity: .5; }
    .canvas-wrap { max-width: 100%; max-height: 65vh; overflow: auto; background: #e9eef0; }
    canvas { display: block; max-width: 100%; height: auto; margin: 0 auto; transform-origin: top center; }
    .error { color: #b42318; }
    @media print { .file, .controls, h2, .tool > p { display: none; } .canvas-wrap { max-height: none; overflow: visible; } canvas { max-width: 100%; transform: none !important; } }
  `],
})
export class TiffComponent {
  readonly Math = Math;
  pages = signal<TiffPage[]>([]);
  index = signal(0);
  zoomLevel = signal(1);
  error = signal('');
  private canvas?: HTMLCanvasElement;

  constructor(private changeDetector: ChangeDetectorRef) {}

  current() { return this.pages()[this.index()]; }

  async load(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    this.error.set('');
    this.pages.set([]);
    this.index.set(0);
    try {
      const pages: TiffPage[] = [];
      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const ifds = UTIF.decode(buffer);
        if (!ifds.length) throw new Error(`${file.name} has no readable TIFF image.`);
        for (let page = 0; page < ifds.length; page++) {
          const ifd = ifds[page];
          UTIF.decodeImage(buffer, ifd);
          pages.push({
            name: ifds.length > 1 ? `${file.name} (${page + 1})` : file.name,
            page,
            width: ifd.width,
            height: ifd.height,
            pixels: UTIF.toRGBA8(ifd),
            source: file,
          });
        }
      }
      this.pages.set(pages);
      this.zoomLevel.set(1);
      this.changeDetector.detectChanges();
      this.render();
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not decode this TIFF image.');
    }
  }

  move(delta: number) {
    const next = Math.max(0, Math.min(this.pages().length - 1, this.index() + delta));
    this.index.set(next);
    this.render();
  }

  changeZoom(delta: number) {
    this.zoomLevel.set(Math.max(0.25, Math.min(5, this.zoomLevel() + delta)));
    this.render();
  }

  print() { window.print(); }

  download() {
    const page = this.current();
    if (page) saveBlob(page.source, page.source.name);
  }

  private render() {
    const page = this.current();
    if (!page) return;
    const canvas = this.canvas ?? document.querySelector<HTMLCanvasElement>('app-tiff-tool canvas');
    if (!canvas) return;
    this.canvas = canvas;
    canvas.width = page.width;
    canvas.height = page.height;
    canvas.style.width = `${page.width * this.zoomLevel()}px`;
    canvas.style.height = `${page.height * this.zoomLevel()}px`;
    const context = canvas.getContext('2d');
    if (!context) { this.error.set('This browser could not create an image canvas.'); return; }
    context.putImageData(new ImageData(new Uint8ClampedArray(page.pixels), page.width, page.height), 0, 0);
  }
}
