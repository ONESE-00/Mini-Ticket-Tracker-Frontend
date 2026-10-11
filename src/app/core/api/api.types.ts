// Transport-level API types shared across features.

// -------- Spring Data shapes (what the backend actually returns/accepts) --------

/**
 * Raw Spring Data `Page<T>` JSON. `number` is 0-based. We never leak this
 * shape into components — the ApiService adapts it into the UI `Page<T>` below.
 */
export interface SpringPage<T> {
  content: T[];
  number: number; // 0-based page index
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  numberOfElements: number;
  empty: boolean;
}

/**
 * Query params understood by Spring `Pageable`. `page` is 0-based, `size` is
 * the page size, `sort` is `property,direction` (repeatable). The ApiService
 * builds these from the UI's 1-based query state.
 */
export interface PageableParams {
  page: number; // 0-based
  size: number;
  sort?: string; // e.g. 'createdAt,desc'
  [key: string]: string | number | undefined; // extra filters (status, priority, search)
}

// -------- UI-facing shapes (what components consume) --------

/**
 * Normalised page the UI works with. `page` is 1-based for human-friendly
 * display and pagination controls.
 */
export interface Page<T> {
  data: T[];
  page: number; // 1-based
  limit: number;
  total: number;
  totalPages: number;
}

/** Adapt a Spring Data page into the UI page (0-based -> 1-based). */
export function fromSpringPage<T>(sp: SpringPage<T>): Page<T> {
  return {
    data: sp.content ?? [],
    page: (sp.number ?? 0) + 1,
    limit: sp.size ?? (sp.content?.length ?? 0),
    total: sp.totalElements ?? 0,
    totalPages: sp.totalPages ?? 0,
  };
}

// Normalised error shape the whole app reacts to. The API service maps every
// HttpErrorResponse into this before rethrowing, so components can read
// `fieldErrors` onto form controls without knowing about HttpErrorResponse.
export interface ApiError {
  status: number;
  error: string;
  message: string;
  fieldErrors?: Record<string, string>;
}
