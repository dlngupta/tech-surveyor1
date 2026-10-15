import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <main class="home">
      <header class="brand">
        <div class="brand-icon" aria-hidden="true">TS</div>
        <div><b>Tech Surveyor</b><span>Revenue &amp; survey tools</span></div>
      </header>

      <section class="menu" aria-label="Main menu">
        <button class="menu-card" (click)="go('/surveyor')">
          <span class="icon surveyor">▤</span>
          <span class="card-copy"><b>Surveyor Corner</b><small>KML tools, resurvey notices, TIFF viewer, CAD, Bhuvan and unit converter</small></span>
          <span class="chevron" aria-hidden="true">›</span>
        </button>
        <button class="menu-card" (click)="go('/portals')">
          <span class="icon portals">◎</span>
          <span class="card-copy"><b>Government Portals</b><small>MeeSeva, Webland, MeeBhoomi, BhuNaksha, IGRS and more</small></span>
          <span class="chevron" aria-hidden="true">›</span>
        </button>
        <button class="menu-card" (click)="go('/gos')">
          <span class="icon gos">▣</span>
          <span class="card-copy"><b>GOs &amp; Circulars</b><small>Revenue Government Orders, circulars and instructions</small></span>
          <span class="chevron" aria-hidden="true">›</span>
        </button>
      </section>

      <footer>
        @if (userEmail()) { <span>{{ userEmail() }}</span> }
        @if (accountError()) { <span class="error">{{ accountError() }}</span> }
      </footer>
    </main>
  `,
  styles: [`
    .home { min-height: 100vh; box-sizing: border-box; padding: 26px 20px 32px; background: #f0f6f9; font-family: system-ui, -apple-system, sans-serif; color: #284e63; }
    .brand { max-width: 620px; margin: 12px auto 34px; display: flex; align-items: center; justify-content: center; gap: 13px; }
    .brand-icon { display: grid; place-items: center; width: 54px; height: 54px; border-radius: 17px; background: #0d4564; color: #fff; font-weight: 800; letter-spacing: -1px; box-shadow: 0 4px 12px #0d45642a; }
    .brand b, .brand span { display: block; }
    .brand b { font-size: 23px; }
    .brand span { color: #7a8a92; font-size: 13px; }
    .menu { width: min(100%, 620px); margin: 0 auto; display: grid; gap: 16px; }
    .menu-card { width: 100%; min-height: 126px; box-sizing: border-box; display: flex; align-items: center; gap: 18px; padding: 20px; border: 1px solid #edf0f1; border-radius: 22px; background: #fff; text-align: left; color: inherit; box-shadow: 0 3px 8px #19394c18; cursor: pointer; transition: transform .15s, box-shadow .15s; }
    .menu-card:hover { transform: translateY(-2px); box-shadow: 0 7px 18px #19394c20; }
    .icon { flex: 0 0 72px; width: 72px; height: 72px; display: grid; place-items: center; border-radius: 20px; color: #fff; font-size: 32px; font-weight: 700; }
    .surveyor { background: #176ab3; }
    .portals { background: #0d4564; }
    .gos { background: #2c823f; }
    .card-copy { flex: 1; display: grid; gap: 5px; }
    .card-copy b { font-size: 20px; line-height: 1.2; color: #315c73; }
    .card-copy small { font-size: 15px; line-height: 1.35; color: #74818a; }
    .chevron { color: #99a5aa; font-size: 34px; line-height: 1; }
    footer { width: min(100%, 620px); margin: 32px auto 0; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 12px; color: #7b898f; font-size: 14px; }
    footer button { border: 0; border-radius: 8px; padding: 9px 18px; background: #dbe3e6; color: #345669; font: inherit; cursor: pointer; }
    .error { color: #b42318; }
    @media (max-width: 420px) { .menu-card { gap: 12px; padding: 16px; } .icon { flex-basis: 58px; width: 58px; height: 58px; border-radius: 16px; } .card-copy b { font-size: 17px; } .card-copy small { font-size: 13px; } }
  `],
})
export class DashboardComponent {
  userEmail = signal('');
  accountError = signal('');

  constructor(private router: Router, private drive: SupabaseService) {
    void this.loadEmail();
  }

  go(path: string) { void this.router.navigate([path]); }

  private async loadEmail() {
    try {
      const session = await this.drive.getSession();
      this.userEmail.set(session?.user.email ?? '');
    } catch (e) {
      this.accountError.set(e instanceof Error ? e.message : 'Could not load account details.');
    }
  }
}
