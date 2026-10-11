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

// Tailwind tint classes for badges. Tokens/utility classes only, no inline hex.
export const STATUS_BADGE_CLASS: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  in_progress: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
  closed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
};

export const PRIORITY_BADGE_CLASS: Record<TicketPriority, string> = {
  low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  high: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
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
