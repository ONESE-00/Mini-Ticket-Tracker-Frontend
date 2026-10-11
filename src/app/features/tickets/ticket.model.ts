// Domain model for tickets. Mirrors the API contract in
// TICKET_TRACKER_FRONTEND_CONTEXT.md section 3 verbatim.

export type TicketStatus = 'open' | 'in_progress' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high';

export interface Ticket {
  id: string; // uuid
  title: string; // required, max 200
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export type TicketHistoryAction = 'created' | 'updated' | 'status_changed';
export type TicketHistoryField = 'title' | 'description' | 'priority' | 'status' | null;

export interface TicketHistoryEntry {
  id: string;
  ticketId: string;
  action: TicketHistoryAction;
  field: TicketHistoryField;
  from: string | null;
  to: string | null;
  changedAt: string;
}

export interface TicketStats {
  open: number;
  in_progress: number;
  closed: number;
  total: number;
}

// Request DTOs.
export interface CreateTicketDto {
  title: string;
  description?: string | null;
  priority: TicketPriority;
}

export interface UpdateTicketDto {
  title?: string;
  description?: string | null;
  status?: TicketStatus;
  priority?: TicketPriority;
}

// Query params for GET /tickets.
export interface TicketQuery {
  status?: TicketStatus;
  priority?: TicketPriority;
  search?: string;
  page?: number; // 1-based
  limit?: number;
  sort?: string; // e.g. 'createdAt,desc'
}

// Bulk transition response.
export interface BulkUpdateResult {
  updated: number;
  failed: { id: string; reason: string }[];
}
