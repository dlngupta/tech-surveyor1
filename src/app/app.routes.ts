import { Routes } from '@angular/router';
import { AuthComponent } from './auth.component';
import { DashboardComponent } from './dashboard.component';
import { MapComponent } from './app.component';
import { PortalsPageComponent } from './portals-page.component';
import { GosComponent } from './gos.component';
import { SurveyorComponent } from './surveyor.component';
import { SurveyorToolPageComponent } from './surveyor-tool-page.component';

export const routes: Routes = [
  { path: 'login', component: AuthComponent },
  { path: 'reset-password', component: AuthComponent },
  { path: '', component: DashboardComponent },
  { path: 'map', component: MapComponent },
  { path: 'surveyor', component: SurveyorComponent },
  { path: 'surveyor/:tool', component: SurveyorToolPageComponent },
  { path: 'portals', component: PortalsPageComponent },
  { path: 'gos', component: GosComponent },
  { path: '**', redirectTo: '' },
];
