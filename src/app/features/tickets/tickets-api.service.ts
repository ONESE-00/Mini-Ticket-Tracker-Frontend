import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';

import { ApiService } from '../../core/api/api.service';
import { fromSpringPage, type Page, type SpringPage } from '../../core/api/api.types';
import type { BulkUpdateResult, CreateTicketDto, Ticket, TicketHistoryEntry, TicketQuery, TicketStats, TicketStatus, UpdateTicketDto } from './ticket.model';

/**
 * Feature API for tickets. Reads are silent on success; writes announce via the
 * success toast (handled inside ApiService helpers). Pagination talks Spring
 * `Pageable`: 0-based `page`, `size`, `sort=property,direction`; responses come
 * back as Spring `Page<T>` and are adapted to the UI's 1-based `Page<T>`.
 */
@Injectable({ providedIn: 'root' })
export class TicketsApiService {
  private readonly api = inject(ApiService);
  private readonly base = '/v1/tickets';

  /** GET /tickets — filtered, searched, sorted, paginated. */
  list(query: TicketQuery = {}) {
    const params = {
      // UI is 1-based; Spring Pageable is 0-based.
      page: Math.max(0, (query.page ?? 1) - 1),
      size: query.limit ?? 10,
      sort: query.sort ?? 'createdAt,desc',
      status: query.status,
      priority: query.priority,
      search: query.search,
    };
    return this.api.get<SpringPage<Ticket>>(this.base, params).pipe(map((sp): Page<Ticket> => fromSpringPage(sp)));
  }

  /** GET /tickets/stats — status counts for the landing cards. */
  stats() {
    return this.api.get<TicketStats>(`${this.base}/stats`);
  }

  /** GET /tickets/{id}. */
  get(id: string) {
    return this.api.get<Ticket>(`${this.base}/${id}`);
  }

  /** GET /tickets/{id}/history — newest first. */
  history(id: string) {
    return this.api.get<TicketHistoryEntry[]>(`${this.base}/${id}/history`);
  }

  /** POST /tickets — status always starts `open`. */
  create(dto: CreateTicketDto) {
    return this.api.post<Ticket>(this.base, dto, { successMessage: 'Ticket created.' });
  }

  /** PATCH /tickets/{id} — only changed fields. 409 on invalid status jump. */
  update(id: string, dto: UpdateTicketDto) {
    return this.api.patch<Ticket>(`${this.base}/${id}`, dto, { successMessage: 'Ticket updated.' });
  }

  /** PATCH /tickets — bulk transition. Partial success allowed. */
  bulkUpdate(ids: string[], status: TicketStatus) {
    // Silence the generic success toast; the page shows a tailored summary
    // built from `failed[]` instead ("3 updated, 1 skipped").
    return this.api.patch<BulkUpdateResult>(this.base, { ids, status }, { showSuccess: false });
  }
}
