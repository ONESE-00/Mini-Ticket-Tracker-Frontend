// In-memory seed data for the mock backend. ~30 tickets with mixed status,
// priority and dates so filters, sorting, pagination and stats all have
// something to show. Shapes match the Spring Boot contract exactly.

import type { Ticket, TicketHistoryEntry } from '../../features/tickets/ticket.model';

// Deterministic uuid-ish id generator for seeds (readable, stable).
let seq = 0;
const uid = (prefix = 't') => `${prefix}-${(++seq).toString().padStart(4, '0')}`;

// Build an ISO date `daysAgo` days before now, at a varied hour.
const daysAgo = (days: number, hour = 9): string => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, (days * 7) % 60, 0, 0);
  return d.toISOString();
};

const TITLES = [
  'Login page returns 500 on submit',
  'Add CSV export to reports',
  'Dark mode toggle not persisting',
  'Pagination skips last page',
  'Email notifications delayed',
  'Dashboard chart misaligned on mobile',
  'Search ignores special characters',
  'Session expires too quickly',
  'Upload fails for files over 10MB',
  'Typo on billing confirmation screen',
  'API rate limit errors under load',
  'Password reset link expired message',
  'Table sort resets after filtering',
  'Timezone shown incorrectly in history',
  'Bulk delete needs a confirmation',
  'Accessibility: focus trap in dialog',
  'Slow query on tickets list endpoint',
  'Webhook retries not backing off',
  'Avatar images not loading in Safari',
  'Add keyboard shortcuts to the table',
  'Stats counts off by one after close',
  'Mobile drawer does not close on route change',
  'Validation message overlaps input',
  'Export includes archived rows',
  'Tooltip clipped inside overflow container',
  'Add priority filter to ticket list',
  'Duplicate toast on retry',
  'Breadcrumb wrong on deep links',
  'Memory leak on repeated searches',
  'Support multi-select in filters',
];

const STATUSES: Ticket['status'][] = ['open', 'in_progress', 'closed'];
const PRIORITIES: Ticket['priority'][] = ['low', 'medium', 'high'];

function seedTickets(): Ticket[] {
  return TITLES.map((title, i) => {
    const status = STATUSES[i % 3];
    const priority = PRIORITIES[(i * 2) % 3];
    const created = daysAgo(TITLES.length - i, 8 + (i % 10));
    // Updated at >= created; closed/in_progress updated more recently.
    const updated = status === 'open' ? created : daysAgo(Math.max(0, TITLES.length - i - 3), 14);
    return {
      id: uid(),
      title,
      description: i % 4 === 0 ? null : `Reported by user. Steps and context for "${title.toLowerCase()}".`,
      status,
      priority,
      createdAt: created,
      updatedAt: updated,
    } satisfies Ticket;
  });
}

export interface MockStore {
  tickets: Ticket[];
  history: TicketHistoryEntry[];
}

/** One shared in-memory store for the session. */
export const mockStore: MockStore = {
  tickets: seedTickets(),
  history: [],
};

// Seed a "created" history entry per ticket, plus a couple of changes on the
// non-open ones so the view timeline has content on day one.
for (const t of mockStore.tickets) {
  mockStore.history.push({
    id: uid('h'),
    ticketId: t.id,
    action: 'created',
    field: null,
    from: null,
    to: null,
    changedAt: t.createdAt,
  });
  if (t.status !== 'open') {
    mockStore.history.push({
      id: uid('h'),
      ticketId: t.id,
      action: 'status_changed',
      field: 'status',
      from: 'open',
      to: 'in_progress',
      changedAt: t.updatedAt,
    });
  }
  if (t.status === 'closed') {
    mockStore.history.push({
      id: uid('h'),
      ticketId: t.id,
      action: 'status_changed',
      field: 'status',
      from: 'in_progress',
      to: 'closed',
      changedAt: t.updatedAt,
    });
  }
}

export function newId(prefix = 't'): string {
  return uid(prefix);
}
