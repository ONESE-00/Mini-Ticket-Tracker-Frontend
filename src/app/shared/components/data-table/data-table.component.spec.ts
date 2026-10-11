import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DataTableComponent } from './data-table.component';
import type { ActionEvent, ColumnDef, FilterChange, PageState, RowAction, SortState } from './data-table.types';

// --- Row type A: ticket-like ---
interface TicketRow extends Record<string, unknown> {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

// --- Row type B: user-like (completely different shape) ---
interface UserRow extends Record<string, unknown> {
  userId: string;
  name: string;
  email: string;
}

@Component({
  imports: [DataTableComponent],
  template: `
    <app-data-table
      [columns]="columns()"
      [data]="data()"
      [total]="data().length"
      [page]="1"
      [limit]="10"
      [selectable]="true"
      [selectedIds]="selected()"
      [actions]="actions()"
      [rowIdKey]="rowIdKey()"
      (selectionChange)="lastSelection = $event"
      (sortChange)="lastSort = $event"
      (pageChange)="lastPage = $event"
      (actionClick)="lastAction = $event"
    />
  `,
})
class HostComponent {
  readonly columns = signal<ColumnDef<Record<string, unknown>>[]>([]);
  readonly data = signal<Record<string, unknown>[]>([]);
  readonly selected = signal<string[]>([]);
  readonly actions = signal<RowAction<Record<string, unknown>>[]>([]);
  readonly rowIdKey = signal('id');

  lastSelection: string[] | null = null;
  lastSort: SortState | null = null;
  lastPage: PageState | null = null;
  lastAction: ActionEvent<Record<string, unknown>> | null = null;
  lastFilter: FilterChange | null = null;
}

describe('DataTableComponent (generic)', () => {
  async function setup() {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    return { fixture, host: fixture.componentInstance };
  }

  it('renders ticket-like rows with no table changes', async () => {
    const { fixture, host } = await setup();
    host.rowIdKey.set('id');
    host.columns.set([
      { key: 'title', header: 'Title', type: 'text', sortable: true },
      { key: 'status', header: 'Status', type: 'text' },
      { key: 'createdAt', header: 'Created', type: 'date' },
    ] as ColumnDef<Record<string, unknown>>[]);
    const tickets: TicketRow[] = [
      { id: 't1', title: 'Fix login', status: 'open', createdAt: '2026-01-01T00:00:00Z' },
      { id: 't2', title: 'Add export', status: 'closed', createdAt: '2026-02-01T00:00:00Z' },
    ];
    host.data.set(tickets);
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Fix login');
    expect(text).toContain('Add export');
    expect(text).toContain('Showing 1 to 2 of 2');
  });

  it('renders user-like rows with a different shape and id key', async () => {
    const { fixture, host } = await setup();
    host.rowIdKey.set('userId');
    host.columns.set([
      { key: 'name', header: 'Name', type: 'text' },
      { key: 'email', header: 'Email', type: 'text' },
    ] as ColumnDef<Record<string, unknown>>[]);
    const users: UserRow[] = [
      { userId: 'u1', name: 'Ada Lovelace', email: 'ada@example.com' },
      { userId: 'u2', name: 'Alan Turing', email: 'alan@example.com' },
    ];
    host.data.set(users);
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ada Lovelace');
    expect(text).toContain('alan@example.com');
  });

  it('emits selectionChange when the component toggles a row', async () => {
    const { fixture, host } = await setup();
    host.columns.set([{ key: 'title', header: 'Title', type: 'text' }] as ColumnDef<Record<string, unknown>>[]);
    host.data.set([{ id: 't1', title: 'A' }] as TicketRow[]);
    await fixture.whenStable();
    fixture.detectChanges();

    const table = fixture.debugElement.children[0].componentInstance as DataTableComponent<Record<string, unknown>>;
    // toggleRow is protected; cast to invoke through the public contract surface.
    (table as unknown as { toggleRow: (r: Record<string, unknown>, c: boolean) => void }).toggleRow({ id: 't1', title: 'A' }, true);
    expect(host.lastSelection).toEqual(['t1']);
  });

  it('emits sortChange toggling asc/desc', async () => {
    const { fixture, host } = await setup();
    host.columns.set([{ key: 'title', header: 'Title', type: 'text', sortable: true }] as ColumnDef<Record<string, unknown>>[]);
    host.data.set([{ id: 't1', title: 'A' }] as TicketRow[]);
    await fixture.whenStable();
    fixture.detectChanges();

    const table = fixture.debugElement.children[0].componentInstance as DataTableComponent<Record<string, unknown>>;
    (table as unknown as { onSort: (k: string) => void }).onSort('title');
    expect(host.lastSort).toEqual({ key: 'title', direction: 'asc' });
  });

  it('emits pageChange with the new limit and resets to page 1', async () => {
    const { fixture, host } = await setup();
    host.columns.set([{ key: 'title', header: 'Title', type: 'text' }] as ColumnDef<Record<string, unknown>>[]);
    host.data.set([{ id: 't1', title: 'A' }] as TicketRow[]);
    await fixture.whenStable();
    fixture.detectChanges();

    const table = fixture.debugElement.children[0].componentInstance as DataTableComponent<Record<string, unknown>>;
    (table as unknown as { onLimitChange: (v: string) => void }).onLimitChange('20');
    expect(host.lastPage).toEqual({ page: 1, limit: 20 });
  });

  it('emits actionClick with the action id and row', async () => {
    const { fixture, host } = await setup();
    host.columns.set([
      { key: 'title', header: 'Title', type: 'text' },
      { key: 'actions', header: '', type: 'actions' },
    ] as ColumnDef<Record<string, unknown>>[]);
    host.actions.set([{ id: 'view', label: 'View' }] as RowAction<Record<string, unknown>>[]);
    const row = { id: 't1', title: 'A' };
    host.data.set([row] as TicketRow[]);
    await fixture.whenStable();
    fixture.detectChanges();

    const table = fixture.debugElement.children[0].componentInstance as DataTableComponent<Record<string, unknown>>;
    (table as unknown as { onActionClick: (a: RowAction<Record<string, unknown>>, r: Record<string, unknown>, e: Event) => void }).onActionClick(
      { id: 'view', label: 'View' },
      row,
      new Event('click'),
    );
    expect(host.lastAction).toEqual({ actionId: 'view', row });
  });
});
