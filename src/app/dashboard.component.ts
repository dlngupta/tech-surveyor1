import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="dashboard">
      <div class="hero">
        <div class="logo">
          <svg viewBox="0 0 80 80" width="110" height="110">
            <rect x="4" y="4" width="72" height="72" rx="16" fill="#1a3a5c"/>
            <path d="M15 65 L40 25 L65 65 Z" fill="#2e7d32"/>
            <path d="M25 65 L40 40 L55 65 Z" fill="#43a047"/>
            <circle cx="40" cy="28" r="14" fill="#fff"/>
            <circle cx="40" cy="28" r="8" fill="#e53935"/>
            <path d="M40 42 L34 28 L46 28 Z" fill="#fff"/>
            <path d="M10 60 Q25 50 40 58 Q55 66 70 56" fill="#1565c0" opacity="0.7"/>
          </svg>
        </div>
        <h1>Tech Surveyor</h1>
        <p class="subtitle">Professional KML/KMZ &bull; GPS &bull; Survey GIS</p>
      </div>

      <div class="actions">
        <button class="nav-btn kml" (click)="go('/map')">
          <div class="btn-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5a.5.5 0 00.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5a.5.5 0 00-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/></svg>
          </div>
          <span>KML / GIS Tools</span>
          <svg class="arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
        <button class="nav-btn portals" (click)="go('/portals')">
          <div class="btn-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
          </div>
          <span>Government Portals</span>
          <svg class="arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
        <button class="nav-btn gos" (click)="go('/gos')">
          <div class="btn-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zM8 15h8v2H8v-2zm0-4h8v2H8v-2z"/></svg>
          </div>
          <span>GOs &amp; Circulars</span>
          <svg class="arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      <p class="footer-text">Built for field survey and land-record work</p>
    </div>
  `,
  styles: [`
    .dashboard {
      min-height: 100vh;
      background: linear-gradient(180deg, #e8f0f7 0%, #f0f4f8 40%);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 20px 32px;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .hero { text-align: center; margin-bottom: 36px; }
    .logo { margin-bottom: 20px; filter: drop-shadow(0 4px 12px rgba(0,0,0,0.15)); }
    h1 {
      font-size: 34px;
      color: #1a3a4a;
      margin: 0 0 8px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .subtitle { color: #777; font-size: 15px; margin: 0; letter-spacing: 0.3px; }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
      max-width: 420px;
    }
    .nav-btn {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 18px 20px;
      border: none;
      border-radius: 16px;
      font-size: 17px;
      font-weight: 600;
      color: #fff;
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
      box-shadow: 0 4px 12px rgba(0,0,0,0.12);
      text-align: left;
    }
    .nav-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,0,0,0.18);
    }
    .nav-btn:active { transform: translateY(0); }
    .nav-btn span { flex: 1; }
    .btn-icon {
      width: 44px; height: 44px;
      background: rgba(255,255,255,0.2);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .arrow { opacity: 0.6; flex-shrink: 0; }
    .kml { background: linear-gradient(135deg, #2874a6, #3498db); }
    .portals { background: linear-gradient(135deg, #1a3a4a, #2c5f6f); }
    .gos { background: linear-gradient(135deg, #27693a, #43a047); }
    .footer-text {
      margin-top: 44px;
      color: #aaa;
      font-size: 13px;
      letter-spacing: 0.2px;
    }
  `],
})
export class DashboardComponent {
  constructor(private router: Router) {}
  go(path: string) { this.router.navigate([path]); }
}
