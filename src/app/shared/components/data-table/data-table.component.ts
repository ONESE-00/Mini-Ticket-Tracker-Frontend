import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component, ViewEncapsulation, computed, contentChildren, input, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowDown, lucideArrowUp, lucideChevronsUpDown, lucideSearch } from '@ng-icons/lucide';

import { ZardBadgeComponent } from '@/shared/components/badge/badge.component';
import { ZardButtonComponent } from '@/shared/components/button/button.component';
import { ZardCheckboxComponent } from '@/shared/components/checkbox/checkbox.component';
import { ZardEmptyComponent } from '@/shared/components/empty/empty.component';
import { ZardInputComponent } from '@/shared/components/input/input.component';
import { ZardPaginationComponent } from '@/shared/components/pagination/pagination.component';
import { ZardSelectImports } from '@/shared/components/select/select.imports';
import { ZardSkeletonComponent } from '@/shared/components/skeleton/skeleton.component';
import { ZardTableImports } from '@/shared/components/table/table.imports';

import { DataTableCellDirective } from './data-table-cell.directive';
import type { ActionEvent, ColumnDef, FilterChange, FilterDef, PageState, RowAction, SortState } from './data-table.types';

/**
 * Presentation-only, config-driven data table. The parent owns the data,
 * current page, filters and sort; the table renders what it is given and emits
 * intent. It carries no domain knowledge — any row shape works.
 *
 * Projection:
 *  - a toolbar slot via `[dataTableToolbar]` for the Create button / bulk bar.
 *  - named cell overrides via `<ng-template dataTableCell="key" let-row>` for
 *    columns of type 'custom'.
 */
@Component({
  selector: 'app-data-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    DatePipe,
    FormsModule,
    NgTemplateOutlet,
    NgIcon,
    ZardTableImports,
    ZardBadgeComponent,
    ZardButtonComponent,
    ZardCheckboxComponent,
    ZardEmptyComponent,
    ZardInputComponent,
    ZardPaginationComponent,
    ZardSkeletonComponent,
    ZardSelectImports,
  ],
  viewProviders: [provideIcons({ lucideArrowDown, lucideArrowUp, lucideChevronsUpDown, lucideSearch })],
  templateUrl: './data-table.component.html',
})
export class DataTableComponent<T extends Record<string, unknown>> {
  // ----- inputs
  readonly columns = input.required<ColumnDef<T>[]>();
  readonly data = input<T[]>([]);
  readonly loading = input(false);
  readonly total = input(0);
  readonly page = input(1); // 1-based
  readonly limit = input(10);
  readonly limitOptions = input<number[]>([10, 20, 50]);
  readonly selectable = input(false);
  readonly selectedIds = input<string[]>([]);
  readonly rowIdKey = input<string>('id');
  readonly actions = input<RowAction<T>[]>([]);
  readonly filters = input<FilterDef[]>([]);
  readonly filterValues = input<Record<string, string>>({});
  readonly searchable = input(false);
  readonly searchPlaceholder = input('Search…');
  readonly sort = input<SortState | null>(null);
  readonly emptyMessage = input('No results found.');
  readonly emptyTitle = input('Nothing here yet');
  readonly rowClickable = input(false);

  // ----- outputs
  readonly searchChange = output<string>();
  readonly filterChange = output<FilterChange>();
  readonly sortChange = output<SortState>();
  readonly pageChange = output<PageState>();
  readonly selectionChange = output<string[]>();
  readonly actionClick = output<ActionEvent<T>>();
  readonly rowClick = output<T>();

  // ----- projected custom cell templates
  private readonly cellTemplates = contentChildren(DataTableCellDirective);

  // ----- local UI state
  protected readonly searchText = signal('');
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  protected readonly String = String;

  // ----- derived
  protected readonly columnCount = computed(() => this.columns().length + (this.selectable() ? 1 : 0));
  protected readonly skeletonRows = computed(() => Array.from({ length: Math.min(this.limit(), 8) }, (_, i) => i));
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / Math.max(1, this.limit()))));
  protected readonly rangeStart = computed(() => (this.total() === 0 ? 0 : (this.page() - 1) * this.limit() + 1));
  protected readonly rangeEnd = computed(() => Math.min(this.page() * this.limit(), this.total()));
  protected readonly selectedSet = computed(() => new Set(this.selectedIds()));
  protected readonly allSelected = computed(() => {
    const rows = this.data();
    return rows.length > 0 && rows.every((r) => this.selectedSet().has(this.rowId(r)));
  });

  protected hasToolbar(): boolean {
    // The toolbar slot is projected content; show the row if any config needs it.
    return true;
  }

  // ----- helpers
  protected rowId(row: T): string {
    return String(row[this.rowIdKey()]);
  }

  protected isSelected(row: T): boolean {
    return this.selectedSet().has(this.rowId(row));
  }

  protected filterValue(key: string): string {
    return this.filterValues()[key] ?? '';
  }

  protected dateValue(col: ColumnDef<T>, row: T): string | number | Date | null {
    const v = row[col.key];
    if (v === null || v === undefined) {
      return null;
    }
    return v as string | number | Date;
  }

  protected displayText(col: ColumnDef<T>, row: T): string {
    if (col.formatter) {
      return col.formatter(row);
    }
    const v = row[col.key];
    return v === null || v === undefined || v === '' ? '—' : String(v);
  }

  protected badgeFor(col: ColumnDef<T>, row: T) {
    const value = String(row[col.key] ?? '');
    return col.badgeMap?.[value] ?? null;
  }

  protected templateFor(name: string) {
    return this.cellTemplates().find((t) => t.name() === name)?.templateRef ?? null;
  }

  protected sortIcon(key: string): string {
    const s = this.sort();
    if (!s || s.key !== key) {
      return 'lucideChevronsUpDown';
    }
    return s.direction === 'asc' ? 'lucideArrowUp' : 'lucideArrowDown';
  }

  protected ariaSort(col: ColumnDef<T>): 'ascending' | 'descending' | 'none' | null {
    if (!col.sortable) {
      return null;
    }
    const s = this.sort();
    if (!s || s.key !== col.key) {
      return 'none';
    }
    return s.direction === 'asc' ? 'ascending' : 'descending';
  }

  // ----- interactions
  protected onSearchInput(value: string): void {
    this.searchText.set(value);
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => this.searchChange.emit(value), 300);
  }

  protected onSort(key: string): void {
    const s = this.sort();
    const direction: 'asc' | 'desc' = s && s.key === key && s.direction === 'asc' ? 'desc' : 'asc';
    this.sortChange.emit({ key, direction });
  }

  protected onPageChange(page: number): void {
    if (page !== this.page()) {
      this.pageChange.emit({ page, limit: this.limit() });
    }
  }

  protected onLimitChange(value: string): void {
    const limit = Number(value);
    if (limit && limit !== this.limit()) {
      this.pageChange.emit({ page: 1, limit });
    }
  }

  protected onRowClick(row: T): void {
    if (this.rowClickable()) {
      this.rowClick.emit(row);
    }
  }

  protected onActionClick(action: RowAction<T>, row: T, event: Event): void {
    event.stopPropagation();
    this.actionClick.emit({ actionId: action.id, row });
  }

  protected toggleRow(row: T, checked: boolean): void {
    const id = this.rowId(row);
    const next = new Set(this.selectedSet());
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    this.selectionChange.emit([...next]);
  }

  protected toggleSelectAll(checked: boolean): void {
    if (checked) {
      // Union current page ids with any already-selected (cross-page) ids.
      const next = new Set(this.selectedSet());
      for (const r of this.data()) {
        next.add(this.rowId(r));
      }
      this.selectionChange.emit([...next]);
    } else {
      // Remove only this page's ids, keep selections from other pages.
      const pageIds = new Set(this.data().map((r) => this.rowId(r)));
      this.selectionChange.emit(this.selectedIds().filter((id) => !pageIds.has(id)));
    }
  }
}
