import { Component, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AdangalComponent } from './survey-tools/adangal.component';
import { CadComponent } from './survey-tools/cad.component';
import { DlrJoinComponent } from './survey-tools/dlr-join.component';
import { NoticesComponent } from './survey-tools/notices.component';
import { TiffComponent } from './survey-tools/tiff.component';
import { UnitConverterComponent } from './survey-tools/unit-converter.component';

@Component({
  selector: 'app-surveyor-tool-page',
  standalone: true,
  imports: [AdangalComponent, CadComponent, DlrJoinComponent, NoticesComponent, TiffComponent, UnitConverterComponent],
  template: `
    <main class="page">
      <header>
        <button class="back" (click)="back()" aria-label="Back to Surveyor Corner">←</button>
        <h1>{{ title() }}</h1>
      </header>
      @switch (tool()) {
        @case ('notices') { <app-notices-tool /> }
        @case ('adangal') { <app-adangal-tool /> }
        @case ('tiff') { <app-tiff-tool /> }
        @case ('dlr') { <app-dlr-join-tool /> }
        @case ('cad') { <app-cad-tool /> }
        @case ('units') { <app-unit-converter-tool /> }
      }
    </main>
  `,
  styles: [`
    .page { min-height: 100vh; box-sizing: border-box; background: #f0f6f9; font-family: system-ui, -apple-system, sans-serif; }
    header { min-height: 72px; box-sizing: border-box; display: flex; align-items: center; gap: 20px; padding: 12px max(20px, calc((100vw - 760px) / 2)); background: #0d4564; color: #fff; }
    header h1 { margin: 0; font-size: 20px; }
    .back { border: 0; padding: 4px; background: none; color: #fff; font-size: 30px; line-height: 1; cursor: pointer; }
  `],
})
export class SurveyorToolPageComponent {
  tool = signal('');
  title = signal('Surveyor Tool');
  private readonly titles: Record<string, string> = {
    notices: 'Resurvey Notices',
    adangal: 'Webland Adangal to Regular Excel',
    tiff: 'TIFF Viewer',
    dlr: 'DLR Joining to KML',
    cad: 'CAD Tools',
    units: 'Unit Converter',
  };

  constructor(route: ActivatedRoute, private router: Router) {
    route.paramMap.subscribe(params => {
      const tool = params.get('tool') ?? '';
      if (!this.titles[tool]) {
        void this.router.navigate(['/surveyor']);
        return;
      }
      this.tool.set(tool);
      this.title.set(this.titles[tool]);
    });
  }

  back() { void this.router.navigate(['/surveyor']); }
}
