import { Component } from '@angular/core';
import { Router } from '@angular/router';

interface SurveyorTool {
  name: string;
  description: string;
  icon: string;
  iconText: string;
  path?: string;
  url?: string;
}

@Component({
  selector: 'app-surveyor',
  standalone: true,
  template: `
    <main class="page">
      <header>
        <button class="back" (click)="goBack()" aria-label="Back to home">←</button>
        <h1>Surveyor Corner</h1>
      </header>
      <section class="tools" aria-label="Surveyor tools">
        @for (tool of tools; track tool.name) {
          <button class="tool-card" [class.available]="tool.path || tool.url" [disabled]="!tool.path && !tool.url" (click)="open(tool)">
            <span class="tool-icon" [class]="tool.icon" aria-hidden="true">{{ tool.iconText }}</span>
            <span class="copy">
              <b>{{ tool.name }}</b>
              <small>{{ tool.description }}</small>
              @if (!tool.path && !tool.url) { <span class="status">Planned</span> }
            </span>
            <span class="chevron" aria-hidden="true">›</span>
          </button>
        }
      </section>
    </main>
  `,
  styles: [`
    .page { min-height: 100vh; box-sizing: border-box; background: #f0f6f9; font-family: system-ui, -apple-system, sans-serif; color: #284e63; }
    header { min-height: 72px; box-sizing: border-box; display: flex; align-items: center; gap: 20px; padding: 12px max(20px, calc((100vw - 680px) / 2)); background: #0d4564; color: #fff; }
    header h1 { margin: 0; font-size: 21px; }
    .back { border: 0; padding: 4px; background: none; color: #fff; font-size: 30px; line-height: 1; cursor: pointer; }
    .tools { width: min(calc(100% - 32px), 680px); margin: 0 auto; padding: 4px 0 28px; display: grid; gap: 16px; }
    .tool-card { width: 100%; min-height: 128px; box-sizing: border-box; display: flex; align-items: center; gap: 18px; padding: 18px 20px; border: 1px solid #e9eef0; border-radius: 22px; background: #fff; color: inherit; text-align: left; box-shadow: 0 3px 7px #19394c1a; }
    .tool-card.available { cursor: pointer; transition: transform .15s, box-shadow .15s; }
    .tool-card.available:hover { transform: translateY(-2px); box-shadow: 0 7px 18px #19394c24; }
    .tool-card:disabled { opacity: 1; cursor: default; }
    .tool-icon { flex: 0 0 72px; width: 72px; height: 72px; display: grid; place-items: center; border-radius: 20px; color: white; font-size: 29px; font-weight: 700; }
    .blue { background: #176ab3; } .red { background: #c52d32; } .green { background: #308344; } .teal { background: #078577; } .purple { background: #732caf; } .violet { background: #5137a4; } .navy { background: #1954a0; } .orange { background: #e87500; }
    .copy { min-width: 0; flex: 1; display: grid; gap: 5px; }
    .copy b { color: #315c73; font-size: 19px; line-height: 1.25; }
    .copy small { color: #74818a; font-size: 14px; line-height: 1.35; }
    .status { width: fit-content; padding: 2px 8px; border-radius: 99px; background: #f0f2f3; color: #78838a; font-size: 11px; font-weight: 700; }
    .chevron { color: #99a5aa; font-size: 34px; }
    @media (max-width: 420px) { .tool-card { gap: 12px; padding: 16px; } .tool-icon { flex-basis: 58px; width: 58px; height: 58px; border-radius: 16px; } .copy b { font-size: 17px; } .copy small { font-size: 13px; } }
  `],
})
export class SurveyorComponent {
  readonly tools = [
    { name: 'KML Tools & GT', description: 'Ground Truthing', icon: 'blue', iconText: '⌖', path: '/map' },
    { name: 'Resurvey Notices', description: 'Create editable GT, GV and 9(2) notice drafts for a village from Excel / CSV', icon: 'red', iconText: '▤', path: '/surveyor/notices' },
    { name: 'Webland Adangal to Regular Excel', description: 'Clean an Adangal worksheet and export a regular Excel sheet for notice generation', icon: 'green', iconText: '▱', path: '/surveyor/adangal' },
    { name: 'TIFF Viewer', description: 'Open multi-page FMB, village map and RSR TIFFs: zoom, browse, print and download', icon: 'teal', iconText: '▣', path: '/surveyor/tiff' },
    { name: 'DLR Joining to KML', description: 'Join Excel / CSV survey data (LPM No., extent, pattadar) to matching KML plots', icon: 'purple', iconText: '▱', path: '/surveyor/dlr' },
    { name: 'CAD Tools', description: 'Draw points, lines and areas; measure, undo, export DXF and print a PDF plan', icon: 'violet', iconText: '✎', path: '/surveyor/cad' },
    { name: 'Bhuvan', description: 'ISRO geoportal: satellite imagery and thematic maps', icon: 'navy', iconText: '⌖', url: 'https://bhuvan.nrsc.gov.in/' },
    { name: 'Unit Converter', description: 'Convert land-area and length units used in field surveys', icon: 'orange', iconText: '▦', path: '/surveyor/units' },
  ] satisfies SurveyorTool[];

  constructor(private router: Router) {}

  goBack() { void this.router.navigate(['/']); }

  open(tool: SurveyorTool) {
    if (tool.path) void this.router.navigate([tool.path]);
    else if (tool.url) window.open(tool.url, '_blank', 'noopener');
  }
}
