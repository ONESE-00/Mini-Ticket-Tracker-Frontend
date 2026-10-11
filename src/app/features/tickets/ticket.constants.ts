// Single source of truth for status/priority presentation and the state
// machine. Never repeat these maps in templates — import from here.

import type { TicketPriority, TicketStatus } from './ticket.model';

// Human-readable labels (brief uses `in_progress`, display shows "In progress").
export const STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  closed: 'Closed',
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

// Badge tints use a single hue per dimension to avoid a rainbow UI:
//  - Status: blue shades (light -> dark as it progresses open -> closed).
//  - Priority: orange/amber shades (light -> dark as severity rises).
// Utility classes only, no inline hex.
export const STATUS_BADGE_CLASS: Record<TicketStatus, string> = {
  open: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  closed: 'bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100',
};

export const PRIORITY_BADGE_CLASS: Record<TicketPriority, string> = {
  low: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  medium: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  high: 'bg-orange-200 text-orange-900 dark:bg-orange-800 dark:text-orange-100',
};

// Forward-only state machine: open -> in_progress -> closed. Closed is terminal.
export const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  open: ['in_progress'],
  in_progress: ['closed'],
  closed: [],
};

export const STATUS_ORDER: TicketStatus[] = ['open', 'in_progress', 'closed'];
export const PRIORITY_ORDER: TicketPriority[] = ['low', 'medium', 'high'];

/** The single next status in the forward-only flow, or null if terminal. */
export function nextStatus(status: TicketStatus): TicketStatus | null {
  return VALID_TRANSITIONS[status][0] ?? null;
}

/** Whether a status change is allowed (same-status is treated as a no-op/allowed). */
export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return from === to || VALID_TRANSITIONS[from].includes(to);
}
