import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Tickets landing page. Placeholder for now — stats, table, filters and
 * pagination arrive in Phase 4.
 */
@Component({
  selector: 'app-tickets-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="flex flex-col gap-1">
      <h1 class="text-2xl font-semibold tracking-tight">Tickets</h1>
      <p class="text-sm text-muted-foreground">Track and triage work across your team.</p>
    </header>
  `,
})
export default class TicketsPageComponent {}
