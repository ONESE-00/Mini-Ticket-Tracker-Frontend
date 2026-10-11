// Bridges ticket constants to the generic data table's BadgeConfig maps,
// so the page configures columns declaratively without repeating label/class
// pairs in the template.

import type { BadgeConfig } from '@/shared/components/data-table/data-table.types';

import { PRIORITY_BADGE_CLASS, PRIORITY_LABELS, STATUS_BADGE_CLASS, STATUS_LABELS } from './ticket.constants';
import type { TicketPriority, TicketStatus } from './ticket.model';

export const STATUS_BADGE_MAP: Record<string, BadgeConfig> = Object.fromEntries(
  (Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => [s, { label: STATUS_LABELS[s], class: STATUS_BADGE_CLASS[s] }]),
);

export const PRIORITY_BADGE_MAP: Record<string, BadgeConfig> = Object.fromEntries(
  (Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((p) => [p, { label: PRIORITY_LABELS[p], class: PRIORITY_BADGE_CLASS[p] }]),
);
