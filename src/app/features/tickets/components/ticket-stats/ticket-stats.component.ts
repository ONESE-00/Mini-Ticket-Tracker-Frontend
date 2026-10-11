import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { ZardCardImports } from '@/shared/components/card/card.imports';
import { ZardSkeletonComponent } from '@/shared/components/skeleton/skeleton.component';

import type { TicketStats } from '../../ticket.model';
import type { TicketStatus } from '../../ticket.model';

interface StatCard {
  key: 'total' | TicketStatus;
  label: string;
  /** Accent class for the metric number. */
  accent: string;
  /** The status this card filters by, or null for Total (clears the filter). */
  filter: TicketStatus | null;
}

/**
 * Four summary cards fed by GET /tickets/stats. Clicking a card applies (or
 * clears, for Total) the status filter on the parent. Presentation-only: the
 * parent owns fetching and re-fetches after writes.
 */
@Component({
  selector: 'app-ticket-stats',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ZardCardImports, ZardSkeletonComponent],
  templateUrl: './ticket-stats.component.html',
})
export class TicketStatsComponent {
  readonly stats = input<TicketStats | null>(null);
  readonly loading = input(false);
  /** Currently active status filter, so the matching card can be highlighted. */
  readonly selectedStatus = input<TicketStatus | null>(null);

  readonly statusSelect = output<TicketStatus | null>();

  protected readonly cards: StatCard[] = [
    { key: 'total', label: 'Total', accent: 'text-foreground', filter: null },
    { key: 'open', label: 'Open', accent: 'text-blue-600 dark:text-blue-400', filter: 'open' },
    { key: 'in_progress', label: 'In progress', accent: 'text-accent-foreground', filter: 'in_progress' },
    { key: 'closed', label: 'Closed', accent: 'text-emerald-600 dark:text-emerald-400', filter: 'closed' },
  ];

  protected count(key: StatCard['key']): number {
    const s = this.stats();
    return s ? s[key] : 0;
  }

  protected isActive(card: StatCard): boolean {
    return this.selectedStatus() === card.filter && card.filter !== null;
  }

  protected onSelect(card: StatCard): void {
    // Clicking the already-active status clears it; Total always clears.
    if (card.filter === null || this.selectedStatus() === card.filter) {
      this.statusSelect.emit(null);
    } else {
      this.statusSelect.emit(card.filter);
    }
  }

  protected readonly accentForActive = computed(() => this.selectedStatus());
}
