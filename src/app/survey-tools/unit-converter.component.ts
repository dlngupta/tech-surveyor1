import { Component, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Unit { name: string; symbol: string; factor: number; }

@Component({
  selector: 'app-unit-converter-tool',
  standalone: true,
  imports: [FormsModule, DecimalPipe],
  template: `
    <section class="tool">
      <h2>Unit Converter</h2>
      <p>Convert commonly used land-area and survey-length units. Conversions use internationally defined unit factors where applicable.</p>
      <div class="controls">
        <label>Measurement<select [(ngModel)]="kind" (ngModelChange)="updateUnits()"><option value="area">Area</option><option value="length">Length</option></select></label>
        <label>Value<input type="number" min="0" step="any" [(ngModel)]="amount"></label>
        <label>From<select [(ngModel)]="from">@for (unit of units(); track unit.symbol) { <option [value]="unit.symbol">{{ unit.name }} ({{ unit.symbol }})</option> }</select></label>
        <button class="swap" (click)="swap()" aria-label="Swap units">⇄</button>
        <label>To<select [(ngModel)]="to">@for (unit of units(); track unit.symbol) { <option [value]="unit.symbol">{{ unit.name }} ({{ unit.symbol }})</option> }</select></label>
      </div>
      @if (result() !== null) { <output>{{ result() | number:'1.0-6' }} {{ to }}</output> }
      <div class="reference">
        @if (kind === 'area') { <p>Includes square metres, square feet, square yards, acres, cents, guntas, and hectares.</p> }
        @else { <p>Includes metres, feet, yards, kilometres, miles, chains, and links.</p> }
        <small>Local/custom units may vary by jurisdiction; verify official conversion rules before using a result for legal records.</small>
      </div>
    </section>
  `,
  styles: [`
    .tool { padding: 24px; color: #284e63; font: 15px/1.5 system-ui, sans-serif; }
    h2 { margin: 0 0 8px; font-size: 22px; } p, small { color: #71818a; }
    .controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; align-items: end; margin-top: 22px; }
    label { display: grid; gap: 5px; color: #456577; font-size: 13px; font-weight: 700; }
    input, select { box-sizing: border-box; width: 100%; min-height: 42px; padding: 8px; border: 1px solid #ccd8dd; border-radius: 8px; background: white; font: inherit; }
    .swap { min-height: 42px; border: 1px solid #cbd8dd; border-radius: 8px; background: white; color: #315c73; font-size: 22px; cursor: pointer; }
    output { display: block; margin-top: 24px; padding: 18px; border-radius: 12px; background: #e8f3f0; color: #18664c; font-size: 27px; font-weight: 800; overflow-wrap: anywhere; }
    .reference { margin-top: 22px; padding: 12px 15px; border-left: 3px solid #8eb4c4; background: #f5f8f9; }
  `],
})
export class UnitConverterComponent {
  kind: 'area' | 'length' = 'area';
  amount = 1;
  from = 'm2';
  to = 'acre';
  units = signal<Unit[]>([]);

  constructor() { this.updateUnits(); }

  result() {
    const amount = Number(this.amount);
    const from = this.units().find(unit => unit.symbol === this.from);
    const to = this.units().find(unit => unit.symbol === this.to);
    if (!Number.isFinite(amount) || !from || !to) return null;
    return amount * from.factor / to.factor;
  }

  swap() { [this.from, this.to] = [this.to, this.from]; }

  updateUnits() {
    const area: Unit[] = [
      { name: 'Square metre', symbol: 'm²', factor: 1 },
      { name: 'Square foot', symbol: 'ft²', factor: 0.09290304 },
      { name: 'Square yard', symbol: 'yd²', factor: 0.83612736 },
      { name: 'Acre', symbol: 'acre', factor: 4046.8564224 },
      { name: 'Cent', symbol: 'cent', factor: 40.468564224 },
      { name: 'Gunta', symbol: 'gunta', factor: 101.17141056 },
      { name: 'Hectare', symbol: 'ha', factor: 10000 },
    ];
    const length: Unit[] = [
      { name: 'Metre', symbol: 'm', factor: 1 },
      { name: 'Foot', symbol: 'ft', factor: 0.3048 },
      { name: 'Yard', symbol: 'yd', factor: 0.9144 },
      { name: 'Kilometre', symbol: 'km', factor: 1000 },
      { name: 'Mile', symbol: 'mi', factor: 1609.344 },
      { name: 'Chain', symbol: 'chain', factor: 20.1168 },
      { name: 'Link', symbol: 'link', factor: 0.201168 },
    ];
    this.units.set(this.kind === 'area' ? area : length);
    this.from = this.kind === 'area' ? 'm²' : 'm';
    this.to = this.kind === 'area' ? 'acre' : 'ft';
  }
}
