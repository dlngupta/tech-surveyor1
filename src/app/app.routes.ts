import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { MapComponent } from './app.component';
import { PortalsPageComponent } from './portals-page.component';
import { GosComponent } from './gos.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'map', component: MapComponent },
  { path: 'portals', component: PortalsPageComponent },
  { path: 'gos', component: GosComponent },
  { path: '**', redirectTo: '' },
];
