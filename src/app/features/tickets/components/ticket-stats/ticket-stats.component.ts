import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { ZardCardImports } from '@/shared/components/card/card.imports';
import { ZardSkeletonComponent } from '@/shared/components/skeleton/skeleton.component';

import type { TicketPriority, TicketStats, TicketStatus } from '../../ticket.model';

interface StatusCard {
  key: 'total' | TicketStatus;
  label: string;
  accent: string;
  filter: TicketStatus | null; // null = Total (clears status filter)
}

interface PriorityCard {
  key: TicketPriority;
  label: string;
  accent: string;
}

/**
 * Summary cards fed by GET /tickets/stats, in two perspectives:
 *  - Status: Total / Open / In progress / Closed (filters by status).
 *  - Priority: Low / Medium / High (filters by priority).
 * Clicking a card toggles the matching filter on the parent; Total clears
 * the status filter. Presentation-only — the parent owns fetching.
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
  readonly selectedStatus = input<TicketStatus | null>(null);
  readonly selectedPriority = input<TicketPriority | null>(null);

  readonly statusSelect = output<TicketStatus | null>();
  readonly prioritySelect = output<TicketPriority | null>();

  // Status perspective uses blue accents; priority uses orange — matching badges.
  protected readonly statusCards: StatusCard[] = [
    { key: 'total', label: 'Total', accent: 'text-foreground', filter: null },
    { key: 'open', label: 'Open', accent: 'text-blue-600 dark:text-blue-400', filter: 'open' },
    { key: 'in_progress', label: 'In progress', accent: 'text-blue-700 dark:text-blue-300', filter: 'in_progress' },
    { key: 'closed', label: 'Closed', accent: 'text-blue-800 dark:text-blue-200', filter: 'closed' },
  ];

  protected readonly priorityCards: PriorityCard[] = [
    { key: 'low', label: 'Low', accent: 'text-orange-600 dark:text-orange-400' },
    { key: 'medium', label: 'Medium', accent: 'text-orange-700 dark:text-orange-300' },
    { key: 'high', label: 'High', accent: 'text-orange-800 dark:text-orange-200' },
  ];

  protected count(key: 'total' | TicketStatus | TicketPriority): number {
    const s = this.stats();
    return s ? s[key] : 0;
  }

  protected isStatusActive(card: StatusCard): boolean {
    return card.filter !== null && this.selectedStatus() === card.filter;
  }

  protected isPriorityActive(card: PriorityCard): boolean {
    return this.selectedPriority() === card.key;
  }

  protected onStatus(card: StatusCard): void {
    if (card.filter === null || this.selectedStatus() === card.filter) {
      this.statusSelect.emit(null);
    } else {
      this.statusSelect.emit(card.filter);
    }
  }

  protected onPriority(card: PriorityCard): void {
    this.prioritySelect.emit(this.selectedPriority() === card.key ? null : card.key);
  }
}
