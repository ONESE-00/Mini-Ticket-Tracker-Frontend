import { HttpErrorResponse, HttpResponse, type HttpEvent, type HttpInterceptorFn, type HttpRequest } from '@angular/common/http';
import { Observable, delay, of, throwError } from 'rxjs';

import { canTransition } from '../../features/tickets/ticket.constants';
import type { BulkUpdateResult, CreateTicketDto, Ticket, TicketHistoryEntry, TicketStats, TicketStatus, UpdateTicketDto } from '../../features/tickets/ticket.model';
import type { ApiError, SpringPage } from '../api/api.types';
import { mockStore, newId } from './mock-data';

// Matches the ApiService base: environment.apiBaseUrl ('/api') + '/v1/tickets'.
const TICKETS = '/api/v1/tickets';

const latency = () => 200 + Math.floor(Math.random() * 200); // 200–400ms

/**
 * Dev-only mock backend. Wired in app.config only when environment.useMock is
 * true. Speaks the exact Spring Boot contract: Pageable query params (0-based
 * `page`, `size`, `sort=prop,dir`) in, Spring `Page<T>` out, `ApiError` bodies
 * on failures, forward-only status state machine, bulk partial success.
 */
export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  const url = req.url.split('?')[0];
  const isTickets = url === TICKETS || url.startsWith(`${TICKETS}/`);
  if (!isTickets) {
    return next(req);
  }

  try {
    const event = route(req, url);
    return of(event).pipe(delay(latency()));
  } catch (err) {
    // route() throws HttpErrorResponse for the error paths.
    return (throwError(() => err) as Observable<HttpEvent<unknown>>).pipe(delay(latency()));
  }
};

function route(req: HttpRequest<unknown>, url: string): HttpResponse<unknown> {
  const method = req.method.toUpperCase();
  const idMatch = url.match(/^\/api\/v1\/tickets\/([^/]+)(\/history)?$/);

  // Collection endpoints
  if (url === TICKETS) {
    if (method === 'GET') return ok(listTickets(req));
    if (method === 'POST') return created(createTicket(req.body as CreateTicketDto));
    if (method === 'PATCH') return ok(bulkUpdate(req.body as { ids: string[]; status: TicketStatus }));
  }

  if (url === `${TICKETS}/stats` && method === 'GET') {
    return ok(computeStats());
  }

  // Item endpoints
  if (idMatch) {
    const id = idMatch[1];
    const isHistory = Boolean(idMatch[2]);
    if (isHistory && method === 'GET') return ok(historyFor(id));
    if (!isHistory && method === 'GET') return ok(getTicket(id));
    if (!isHistory && method === 'PATCH') return ok(updateTicket(id, req.body as UpdateTicketDto));
  }

  throw httpError(404, 'NotFound', 'We couldn’t find what you were looking for.');
}

// ------------------------------------------------------------- handlers

function listTickets(req: HttpRequest<unknown>): SpringPage<Ticket> {
  const q = req.params;
  const page = Math.max(0, Number(q.get('page') ?? 0)); // 0-based
  const size = Math.max(1, Number(q.get('size') ?? 10));
  const status = q.get('status') as TicketStatus | null;
  const priority = q.get('priority');
  const search = (q.get('search') ?? '').trim().toLowerCase();
  const sort = q.get('sort') ?? 'createdAt,desc';

  let rows = [...mockStore.tickets];

  if (status) rows = rows.filter((t) => t.status === status);
  if (priority) rows = rows.filter((t) => t.priority === priority);
  if (search) {
    rows = rows.filter((t) => t.title.toLowerCase().includes(search) || (t.description ?? '').toLowerCase().includes(search));
  }

  rows = sortRows(rows, sort);

  const totalElements = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / size));
  const start = page * size;
  const content = rows.slice(start, start + size);

  return {
    content,
    number: page,
    size,
    totalElements,
    totalPages,
    first: page === 0,
    last: page >= totalPages - 1,
    numberOfElements: content.length,
    empty: content.length === 0,
  };
}

function sortRows(rows: Ticket[], sort: string): Ticket[] {
  const [prop, dir = 'asc'] = sort.split(',');
  const factor = dir.toLowerCase() === 'desc' ? -1 : 1;
  const key = prop as keyof Ticket;
  return rows.sort((a, b) => {
    const av = a[key] ?? '';
    const bv = b[key] ?? '';
    if (av < bv) return -1 * factor;
    if (av > bv) return 1 * factor;
    return 0;
  });
}

function createTicket(dto: CreateTicketDto): Ticket {
  if (!dto?.title || dto.title.trim().length === 0) {
    throw httpError(400, 'ValidationError', 'Please check the form and try again.', { title: 'Title is required.' });
  }
  if (dto.title.length > 200) {
    throw httpError(400, 'ValidationError', 'Please check the form and try again.', { title: 'Title must be 200 characters or fewer.' });
  }
  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: newId(),
    title: dto.title.trim(),
    description: dto.description?.trim() ? dto.description.trim() : null,
    status: 'open', // always starts open
    priority: dto.priority ?? 'medium',
    createdAt: now,
    updatedAt: now,
  };
  mockStore.tickets.unshift(ticket);
  mockStore.history.push({ id: newId('h'), ticketId: ticket.id, action: 'created', field: null, from: null, to: null, changedAt: now });
  return ticket;
}

function getTicket(id: string): Ticket {
  const t = mockStore.tickets.find((x) => x.id === id);
  if (!t) throw httpError(404, 'NotFound', 'That ticket no longer exists.');
  return t;
}

function updateTicket(id: string, dto: UpdateTicketDto): Ticket {
  const t = getTicket(id);
  const now = new Date().toISOString();
  const changes: TicketHistoryEntry[] = [];

  if (dto.status !== undefined && dto.status !== t.status) {
    if (!canTransition(t.status, dto.status)) {
      throw httpError(409, 'InvalidTransition', `Cannot move a ticket from ${t.status} to ${dto.status}.`);
    }
    changes.push(entry(id, 'status_changed', 'status', t.status, dto.status, now));
    t.status = dto.status;
  }
  for (const field of ['title', 'description', 'priority'] as const) {
    const next = dto[field];
    if (next !== undefined && next !== t[field]) {
      changes.push(entry(id, 'updated', field, String(t[field] ?? ''), String(next ?? ''), now));
      // @ts-expect-error narrowed assignment across the union is safe here
      t[field] = field === 'description' && next === '' ? null : next;
    }
  }

  if (changes.length) {
    t.updatedAt = now;
    mockStore.history.push(...changes);
  }
  return t;
}

function bulkUpdate(body: { ids: string[]; status: TicketStatus }): BulkUpdateResult {
  const result: BulkUpdateResult = { updated: 0, failed: [] };
  const now = new Date().toISOString();
  for (const id of body?.ids ?? []) {
    const t = mockStore.tickets.find((x) => x.id === id);
    if (!t) {
      result.failed.push({ id, reason: 'Not found' });
      continue;
    }
    if (t.status === body.status) {
      result.failed.push({ id, reason: 'Already in that status' });
      continue;
    }
    if (!canTransition(t.status, body.status)) {
      result.failed.push({ id, reason: `Cannot move from ${t.status} to ${body.status}` });
      continue;
    }
    mockStore.history.push(entry(id, 'status_changed', 'status', t.status, body.status, now));
    t.status = body.status;
    t.updatedAt = now;
    result.updated++;
  }
  return result;
}

function computeStats(): TicketStats {
  const stats: TicketStats = { open: 0, in_progress: 0, closed: 0, total: mockStore.tickets.length };
  for (const t of mockStore.tickets) stats[t.status]++;
  return stats;
}

function historyFor(id: string): TicketHistoryEntry[] {
  return mockStore.history.filter((h) => h.ticketId === id).sort((a, b) => (a.changedAt < b.changedAt ? 1 : -1)); // newest first
}

// ------------------------------------------------------------- helpers

function entry(ticketId: string, action: TicketHistoryEntry['action'], field: TicketHistoryEntry['field'], from: string | null, to: string | null, changedAt: string): TicketHistoryEntry {
  return { id: newId('h'), ticketId, action, field, from, to, changedAt };
}

function ok(body: unknown): HttpResponse<unknown> {
  return new HttpResponse({ status: 200, body });
}

function created(body: unknown): HttpResponse<unknown> {
  return new HttpResponse({ status: 201, body });
}

function httpError(status: number, error: string, message: string, fieldErrors?: Record<string, string>): HttpErrorResponse {
  const body: ApiError = { status, error, message, fieldErrors };
  return new HttpErrorResponse({ status, statusText: error, error: body, url: TICKETS });
}
