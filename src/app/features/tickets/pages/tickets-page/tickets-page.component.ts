import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { EMPTY, catchError, startWith, switchMap, tap } from 'rxjs';

import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { DataTableComponent } from '@/shared/components/data-table/data-table.component';
import type { ActionEvent, ColumnDef, FilterChange, FilterDef, PageState, RowAction, SortState } from '@/shared/components/data-table/data-table.types';

import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEye, lucidePencil, lucidePlus } from '@ng-icons/lucide';

import { TicketStatsComponent } from '../../components/ticket-stats/ticket-stats.component';
import { PRIORITY_BADGE_MAP, STATUS_BADGE_MAP } from '../../ticket-badges';
import { PRIORITY_LABELS, STATUS_LABELS } from '../../ticket.constants';
import type { Ticket, TicketPriority, TicketQuery, TicketStats, TicketStatus } from '../../ticket.model';
import { TicketsApiService } from '../../tickets-api.service';

/** Row type the generic data table sees (its template default is the base record). */
type TicketRow = Record<string, unknown>;

/** The reactive query state the page owns and feeds to the API. */
interface TicketsQueryState {
  status: TicketStatus | null;
  priority: TicketPriority | null;
  search: string;
  page: number;
  limit: number;
  sort: SortState;
}

@Component({
  selector: 'app-tickets-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataTableComponent, TicketStatsComponent, ZardButtonComponent, NgIcon],
  viewProviders: [provideIcons({ lucideEye, lucidePencil, lucidePlus })],
  templateUrl: './tickets-page.component.html',
})
export default class TicketsPageComponent {
  private readonly ticketsApi = inject(TicketsApiService);

  // ---- query state (signals)
  protected readonly query = signal<TicketsQueryState>({
    status: null,
    priority: null,
    search: '',
    page: 1,
    limit: 10,
    sort: { key: 'createdAt', direction: 'desc' },
  });

  // ---- list result driven by the query (switchMap cancels stale requests)
  protected readonly loading = signal(false);
  private readonly listResult = toSignal(
    toObservable(this.query).pipe(
      switchMap((q) => {
        this.loading.set(true);
        const apiQuery: TicketQuery = {
          status: q.status ?? undefined,
          priority: q.priority ?? undefined,
          search: q.search || undefined,
          page: q.page,
          limit: q.limit,
          sort: `${q.sort.key},${q.sort.direction}`,
        };
        return this.ticketsApi.searchTickets(apiQuery).pipe(
          tap(() => this.loading.set(false)),
          catchError(() => {
            this.loading.set(false);
            return EMPTY;
          }),
        );
      }),
    ),
    { initialValue: null },
  );

  protected readonly rows = computed(() => (this.listResult()?.data ?? []) as unknown as TicketRow[]);
  protected readonly total = computed(() => this.listResult()?.total ?? 0);

  // ---- stats (fetched independently; refetchable after writes)
  private readonly statsReload = signal(0);
  protected readonly stats = toSignal<TicketStats | null>(
    toObservable(this.statsReload).pipe(
      startWith(0),
      switchMap(() => this.ticketsApi.getTicketStats().pipe(catchError(() => EMPTY))),
    ),
    { initialValue: null },
  );
  protected readonly statsLoading = computed(() => this.stats() === null);

  // ---- selection (for Phase 6 bulk actions)
  protected readonly selectedIds = signal<string[]>([]);

  // ---- table configuration
  // The generic DataTableComponent defaults its row type to Record<string,unknown>
  // in templates, so the config arrays are typed against that base. Row objects
  // are still Tickets at runtime; handlers cast where ticket fields are needed.
  protected readonly columns: ColumnDef<TicketRow>[] = [
    { key: 'title', header: 'Title', type: 'text', sortable: true },
    { key: 'status', header: 'Status', type: 'badge', badgeMap: STATUS_BADGE_MAP, width: 'w-36' },
    { key: 'priority', header: 'Priority', type: 'badge', badgeMap: PRIORITY_BADGE_MAP, width: 'w-32' },
    { key: 'createdAt', header: 'Created', type: 'date', sortable: true, width: 'w-36' },
    { key: 'actions', header: '', type: 'actions', width: 'w-32' },
  ];

  protected readonly actions: RowAction<TicketRow>[] = [
    { id: 'view', label: 'View', icon: 'lucideEye', variant: 'ghost' },
    { id: 'update', label: 'Update', icon: 'lucidePencil', variant: 'outline' },
  ];

  protected readonly filters: FilterDef[] = [
    {
      key: 'status',
      label: 'Status',
      options: (Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => ({ value: s, label: STATUS_LABELS[s] })),
    },
    {
      key: 'priority',
      label: 'Priority',
      options: (Object.keys(PRIORITY_LABELS) as TicketPriority[]).map((p) => ({ value: p, label: PRIORITY_LABELS[p] })),
    },
  ];

  protected readonly filterValues = computed<Record<string, string>>(() => ({
    status: this.query().status ?? '',
    priority: this.query().priority ?? '',
  }));

  protected readonly sort = computed(() => this.query().sort);
  protected readonly page = computed(() => this.query().page);
  protected readonly limit = computed(() => this.query().limit);
  protected readonly selectedStatus = computed(() => this.query().status);

  // ---- handlers (all reset to page 1 except explicit paging/sort)
  protected onSearch(search: string): void {
    this.query.update((q) => ({ ...q, search, page: 1 }));
  }

  protected onFilter(change: FilterChange): void {
    const value = change.value || null;
    this.query.update((q) => ({
      ...q,
      [change.key]: value,
      page: 1,
    }));
  }

  protected onStatusCard(status: TicketStatus | null): void {
    this.query.update((q) => ({ ...q, status, page: 1 }));
  }

  protected onSort(sort: SortState): void {
    this.query.update((q) => ({ ...q, sort, page: 1 }));
  }

  protected onPage(page: PageState): void {
    this.query.update((q) => ({ ...q, page: page.page, limit: page.limit }));
  }

  protected onSelectionChange(ids: string[]): void {
    this.selectedIds.set(ids);
  }

  // ---- Create button (dialog wired in Phase 5)
  protected onCreate(): void {
    // Placeholder until Phase 5 wires the dialog.
  }

  protected onAction(event: ActionEvent<TicketRow>): void {
    // View / Update open the dialog in Phase 5. Row is a Ticket at runtime.
    const _ticket = event.row as unknown as Ticket;
    void _ticket;
  }

  /** Re-fetch the list and stats after a write (used by later phases). */
  protected refresh(): void {
    this.query.update((q) => ({ ...q }));
    this.statsReload.update((n) => n + 1);
  }
}
