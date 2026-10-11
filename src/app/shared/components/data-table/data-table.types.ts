// Public contract for the global, config-driven data table. Nothing in here
// is domain-specific — the table renders whatever these describe and emits
// intent back to the parent, which owns the data, paging, filters and sort.

export type ColumnType = 'text' | 'badge' | 'date' | 'number' | 'actions' | 'custom';

/** Per-cell badge appearance, resolved from a column's `badgeMap` by cell value. */
export interface BadgeConfig {
  label: string;
  /** Tailwind classes for the badge tint. */
  class: string;
}

export interface ColumnDef<T> {
  /** Row key to read, or a virtual key for 'actions' / 'custom'. */
  key: string;
  header: string;
  type: ColumnType;
  sortable?: boolean;
  /** Tailwind width class, e.g. 'w-40'. */
  width?: string;
  /** Right-align numeric columns, etc. */
  align?: 'left' | 'right' | 'center';
  /** For type 'badge': maps a cell value to its badge config. */
  badgeMap?: Record<string, BadgeConfig>;
  /** For type 'text' | 'number': override the displayed string. */
  formatter?: (row: T) => string;
  /** For type 'custom': the name of a projected <ng-template> cell override. */
  cellTemplate?: string;
}

export interface RowAction<T> {
  id: string; // e.g. 'view', 'update'
  label: string;
  icon?: string; // lucide icon name
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  /** Hide the action for a given row. */
  visible?: (row: T) => boolean;
  /** Render the action disabled for a given row. */
  disabled?: (row: T) => boolean;
}

export interface FilterDef {
  key: string; // e.g. 'status'
  label: string;
  options: { value: string; label: string }[];
}

export interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

export interface PageState {
  page: number; // 1-based
  limit: number;
}

/** Payload for the actionClick output. */
export interface ActionEvent<T> {
  actionId: string;
  row: T;
}

/** Payload for the filterChange output. */
export interface FilterChange {
  key: string;
  value: string;
}
