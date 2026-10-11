import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { ZardSkeletonComponent } from '@/shared/components/skeleton/skeleton.component';

import { PRIORITY_LABELS, STATUS_LABELS } from '../../ticket.constants';
import type { TicketHistoryEntry, TicketPriority, TicketStatus } from '../../ticket.model';
import { relativeTime } from '../../relative-time';

interface TimelineItem {
  id: string;
  sentence: string;
  relative: string;
  absolute: string;
}

/**
 * Vertical timeline of a ticket's history, newest first. Turns each entry into
 * a human sentence ("Status changed from Open to In progress") with relative
 * and absolute timestamps. Presentation-only; the parent fetches the entries.
 */
@Component({
  selector: 'app-ticket-history',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ZardSkeletonComponent],
  templateUrl: './ticket-history.component.html',
})
export class TicketHistoryComponent {
  readonly entries = input<TicketHistoryEntry[] | null>(null);
  readonly loading = input(false);

  protected readonly items = computed<TimelineItem[]>(() =>
    (this.entries() ?? []).map((e) => ({
      id: e.id,
      sentence: this.sentenceFor(e),
      relative: relativeTime(e.changedAt),
      absolute: new Date(e.changedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }),
    })),
  );

  private sentenceFor(e: TicketHistoryEntry): string {
    if (e.action === 'created') {
      return 'Ticket created';
    }
    if (e.field === 'status') {
      return `Status changed from ${this.statusLabel(e.from)} to ${this.statusLabel(e.to)}`;
    }
    if (e.field === 'priority') {
      return `Priority changed from ${this.priorityLabel(e.from)} to ${this.priorityLabel(e.to)}`;
    }
    if (e.field === 'title') {
      return 'Title updated';
    }
    if (e.field === 'description') {
      return 'Description updated';
    }
    return 'Ticket updated';
  }

  private statusLabel(value: string | null): string {
    return value ? (STATUS_LABELS[value as TicketStatus] ?? value) : '—';
  }

  private priorityLabel(value: string | null): string {
    return value ? (PRIORITY_LABELS[value as TicketPriority] ?? value) : '—';
  }
}
