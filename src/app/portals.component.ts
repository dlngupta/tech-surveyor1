import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface Portal { name: string; url: string; cat: string; desc: string; }

// Add more portals here (name, url, category, description).
export const PORTALS: Portal[] = [
  { name: 'Webland', url: 'https://webland.ap.gov.in/', cat: 'Land administration', desc: 'AP land records and administration' },
  { name: 'Webland 2.0 POLR6', url: 'https://webland2.ap.gov.in/POLR6/loginpage.aspx', cat: 'Land administration', desc: 'Ground Truthing, land register and ROR progress' },
  { name: 'MeeBhoomi', url: 'https://meebhoomi.ap.gov.in/', cat: 'Land services', desc: 'Adangal, 1-B and land record extracts' },
  { name: 'BhuNaksha', url: 'https://bhunaksha.ap.gov.in/', cat: 'Cadastral maps', desc: 'Village cadastral / survey maps' },
  { name: 'Bhuvan', url: 'https://bhuvan.nrsc.gov.in/', cat: 'Maps & imagery', desc: 'ISRO geoportal and thematic maps' },
  { name: 'AP Meeseva', url: 'https://ap.meeseva.gov.in/', cat: 'Citizen & Revenue services', desc: 'Citizen and revenue services' },
  { name: 'APSeva', url: 'https://apseva.ap.gov.in/', cat: 'Citizen services', desc: 'Andhra Pradesh government services' },
  { name: 'PGRS', url: 'https://pgrs.ap.gov.in/', cat: 'Citizen services', desc: 'Public Grievance Redressal System' },
  { name: 'IGRS', url: 'https://registration.ap.gov.in/igrs', cat: 'Registration', desc: 'Registration and stamps (AP IGRS)' },
  { name: 'Beneficiary Management', url: 'https://bm-sgsw.ap.gov.in/BM/', cat: 'Government services', desc: 'Andhra Pradesh beneficiary management portal' },
  { name: 'ECINET', url: 'https://ecinet.eci.gov.in/login', cat: 'Government services', desc: 'Election Commission of India portal for authorized users' },
];

@Component({
  selector: 'app-portals', standalone: true, imports: [FormsModule],
  template: `
  <div class="ov">
    <div class="top"><b>Government Portals</b>
      <input placeholder="Search portals" [(ngModel)]="q">
      <button (click)="closed.emit()">✕ Close</button></div>
    @for (g of groups(); track g[0]) {
      <h4>{{ g[0] }}</h4>
      @for (p of g[1]; track p.url) {
        <a class="card" [href]="p.url" target="_blank" rel="noopener">
          <b>{{ p.name }}</b><span>{{ p.desc }}</span><small>{{ p.url }}</small></a>
      }
    }
    @if (!groups().length) { <p>No matching portals.</p> }
    <p class="note">Opens in a new tab. If the browser shows a certificate warning, continue only if you trust the network
      (government sites sometimes send an incomplete certificate chain).</p>
  </div>`,
  styles: [`
    .ov{position:fixed;inset:0;background:#fff;color:#222;overflow:auto;padding:12px;z-index:10}
    .top{display:flex;gap:8px;align-items:center}.top input{flex:1}
    .card{display:flex;flex-direction:column;gap:2px;padding:10px;margin:6px 0;border:1px solid #bbb;border-radius:8px;text-decoration:none;color:inherit}
    small{color:#666}.note{font-size:12px;color:#666}
  `],
})
export class PortalsComponent {
  @Output() closed = new EventEmitter<void>();
  q = '';
  groups(): [string, Portal[]][] {
    const t = this.q.trim().toLowerCase(), m = new Map<string, Portal[]>();
    PORTALS.filter(p => !t || (p.name + p.cat + p.desc).toLowerCase().includes(t))
      .forEach(p => m.set(p.cat, [...(m.get(p.cat) || []), p]));
    return [...m.entries()];
  }
}
