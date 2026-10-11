import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'tickets' },
  {
    path: 'tickets',
    title: 'Tickets',
    loadComponent: () => import('./features/tickets/pages/tickets-page/tickets-page.component'),
  },
  {
    path: '**',
    title: 'Not found',
    loadComponent: () => import('./features/not-found/not-found.component'),
  },
];
