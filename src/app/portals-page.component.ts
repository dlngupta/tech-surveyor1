import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface Portal {
  name: string;
  abbr: string;
  url: string;
  desc: string;
  color: string;
}

const PORTALS: Portal[] = [
  { name: 'MeeSeva', abbr: 'MS', url: 'https://ap.meeseva.gov.in/', desc: 'Citizen & Revenue services', color: '#2e7d32' },
  { name: 'Webland', abbr: 'WL', url: 'https://webland.ap.gov.in/', desc: 'Land administration', color: '#1565c0' },
  { name: 'Webland 2.0', abbr: 'W2', url: 'https://webland2.ap.gov.in/', desc: 'Land services', color: '#00796b' },
  { name: 'MeeBhoomi', abbr: 'MB', url: 'https://meebhoomi.ap.gov.in/', desc: 'AP land records', color: '#e65100' },
  { name: 'BhuNaksha', abbr: 'BN', url: 'https://bhunaksha.ap.gov.in/', desc: 'Cadastral maps', color: '#6a1b9a' },
  { name: 'IGRS', abbr: 'IG', url: 'https://registration.ap.gov.in/igrs', desc: 'Registration services', color: '#c62828' },
];

@Component({
  selector: 'app-portals-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page">
      <header>
        <button class="back" (click)="goBack()">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>
        </button>
        <h1>Government Portals</h1>
      </header>
      <div class="content">
        <p class="hint">Select a portal &bull; Opens in a new tab</p>
        <div class="grid">
          @for (p of filtered(); track p.url) {
            <a class="card" [href]="p.url" target="_blank" rel="noopener">
              <div class="badge" [style.background]="'linear-gradient(135deg, ' + p.color + ', ' + p.color + 'cc)'">{{ p.abbr }}</div>
              <b>{{ p.name }}</b>
              <span class="desc">{{ p.desc }}</span>
              <span class="open" [style.color]="p.color">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M7 7h10v10"/></svg>
                Open in app
              </span>
            </a>
          }
        </div>
        @if (!filtered().length) { <p class="empty-msg">No matching portals.</p> }
      </div>
    </div>
  `,
  styles: [`
    .page { min-height: 100vh; background: #f0f4f8; font-family: system-ui, -apple-system, sans-serif; }
    header {
      background: linear-gradient(135deg, #1a3a4a 0%, #1e4d5e 100%);
      color: #fff;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 16px;
      position: sticky;
      top: 0;
      z-index: 5;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
    .back {
      background: none; border: none; color: #fff; cursor: pointer;
      padding: 6px; border-radius: 8px; display: flex; align-items: center;
    }
    .back:hover { background: rgba(255,255,255,0.12); }
    .content { padding: 16px 20px; max-width: 600px; margin: 0 auto; }
    .hint { color: #888; font-size: 14px; text-align: center; margin: 0 0 20px; }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }
    .card {
      background: #fff;
      border-radius: 16px;
      padding: 22px 16px;
      text-align: center;
      text-decoration: none;
      color: inherit;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
      transition: transform 0.15s, box-shadow 0.15s;
      border: 1px solid #f0f0f0;
    }
    .card:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.1);
    }
    .card:active { transform: translateY(0); }
    .badge {
      width: 60px; height: 60px;
      border-radius: 16px;
      color: #fff;
      font-weight: 700;
      font-size: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    }
    .card b { font-size: 16px; color: #1a3a4a; font-weight: 700; }
    .desc { font-size: 13px; color: #888; line-height: 1.3; }
    .open {
      font-size: 13px; font-weight: 600;
      display: inline-flex; align-items: center; gap: 4px;
    }
    .empty-msg { text-align: center; color: #999; padding: 20px; }
  `],
})
export class PortalsPageComponent {
  q = '';
  constructor(private router: Router) {}

  filtered(): Portal[] {
    const t = this.q.trim().toLowerCase();
    if (!t) return PORTALS;
    return PORTALS.filter(p => (p.name + p.desc).toLowerCase().includes(t));
  }

  goBack() { this.router.navigate(['/']); }
}
