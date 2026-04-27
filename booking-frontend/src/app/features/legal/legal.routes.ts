import { Routes } from '@angular/router';
import { TermsComponent } from './terms.component';
import { PrivacyComponent } from './privacy.component';

export const LEGAL_ROUTES: Routes = [
  {
    path: 'terms',
    component: TermsComponent,
  },
  {
    path: 'privacy',
    component: PrivacyComponent,
  },
];
