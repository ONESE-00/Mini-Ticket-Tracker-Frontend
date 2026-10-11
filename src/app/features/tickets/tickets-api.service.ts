import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, tap, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ToastService } from '../../core/notifications/toast.service';
import { fromSpringPage, type Page, type SpringPage } from '../../core/api/api.types';
import type { BulkUpdateResult, CreateTicketDto, Ticket, TicketHistoryEntry, TicketQuery, TicketStats, TicketStatus, UpdateTicketDto } from './ticket.model';

/**
 * Tickets API. Each method takes its own arguments plus a `showSuccess` flag:
 * reads default to `false` (no toast while searching/paginating a table),
 * writes default to `true` (announce the result). Every call pipes through
 * `handleResponse`, which owns success/error notifications and rethrows the
 * error so components can still react (e.g. map field errors onto a form).
 *
 * Pagination talks Spring `Pageable`: 0-based `page`, `size`,
 * `sort=property,direction`; responses are Spring `Page<T>` adapted to the UI's
 * 1-based `Page<T>` by the service.
 */
@Injectable({ providedIn: 'root' })
export class TicketsApiService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly api_url = environment.apiBaseUrl;

  // ---------------------------------------------------------------- tickets

  /** GET /tickets — filtered, searched, sorted, paginated. Silent by default. */
  searchTickets(query: TicketQuery = {}, showSuccess: boolean = false) {
    const params = this.toTicketParams(query);
    return this.http
      .get<SpringPage<Ticket>>(`${this.api_url}/v1/tickets`, { params })
      .pipe(this.handleResponse({ showSuccess }), map((sp): Page<Ticket> => fromSpringPage(sp)));
  }

  /** GET /tickets/stats — status counts for the landing cards. Silent by default. */
  getTicketStats(showSuccess: boolean = false) {
    return this.http.get<TicketStats>(`${this.api_url}/v1/tickets/stats`).pipe(this.handleResponse({ showSuccess }));
  }

  /** GET /tickets/{id}. Silent by default (opened in a dialog). */
  getTicketById(id: string, showSuccess: boolean = false) {
    return this.http.get<Ticket>(`${this.api_url}/v1/tickets/${id}`).pipe(this.handleResponse({ showSuccess }));
  }

  /** GET /tickets/{id}/history — newest first. Silent by default. */
  getTicketHistory(id: string, showSuccess: boolean = false) {
    return this.http.get<TicketHistoryEntry[]>(`${this.api_url}/v1/tickets/${id}/history`).pipe(this.handleResponse({ showSuccess }));
  }

  /** POST /tickets — status always starts `open`. Announces by default. */
  createTicket(data: CreateTicketDto, showSuccess: boolean = true) {
    return this.http.post<Ticket>(`${this.api_url}/v1/tickets`, data).pipe(this.handleResponse({ showSuccess }));
  }

  /** PATCH /tickets/{id} — partial update. 409 on invalid status jump. Announces by default. */
  updateTicket(id: string, data: UpdateTicketDto, showSuccess: boolean = true) {
    return this.http.patch<Ticket>(`${this.api_url}/v1/tickets/${id}`, data).pipe(this.handleResponse({ showSuccess }));
  }

  /**
   * PATCH /tickets — bulk transition, partial success allowed. Silent by default
   * because the page shows a tailored summary built from `failed[]`
   * ("3 updated, 1 skipped") instead of a generic toast.
   */
  bulkUpdateTickets(ids: string[], status: TicketStatus, showSuccess: boolean = false) {
    return this.http.patch<BulkUpdateResult>(`${this.api_url}/v1/tickets`, { ids, status }).pipe(this.handleResponse({ showSuccess }));
  }

  // ------------------------------------------------------- response operator

  /**
   * Shared RxJS operator. On success it optionally shows a success toast built
   * from the response body; on error it shows an error toast and rethrows the
   * original error so components can still react to it.
   */
  handleResponse<T>({ showSuccess = true }: { showSuccess?: boolean } = {}) {
    return (source$: Observable<T>) =>
      source$.pipe(
        tap((response: T) => {
          if (showSuccess && response) {
            const body = response as { message?: string; result?: { message?: string } };
            const successMsg = body.message ?? body?.result?.message ?? 'Success';
            this.toast.alertSuccess(successMsg);
            console.log('Success', successMsg);
          }
        }),
        catchError((error) => {
          const errorMsg = error?.error?.message || error?.message || 'Something went wrong';
          console.warn('Error:', error);
          this.toast.alertError(errorMsg);
          return throwError(() => error);
        }),
      );
  }

  // --------------------------------------------------------------- internals

  /** Build Spring Pageable + filter params from the UI query (1-based -> 0-based). */
  private toTicketParams(query: TicketQuery): Record<string, string> {
    const raw: Record<string, string | number | undefined> = {
      page: Math.max(0, (query.page ?? 1) - 1),
      size: query.limit ?? 10,
      sort: query.sort ?? 'createdAt,desc',
      status: query.status,
      priority: query.priority,
      search: query.search?.trim() ? query.search.trim() : undefined,
    };
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
      if (value !== undefined && value !== null && value !== '') {
        params[key] = String(value);
      }
    }
    return params;
  }
}
