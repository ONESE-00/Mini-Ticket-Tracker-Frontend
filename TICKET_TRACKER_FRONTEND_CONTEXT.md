# Mini Ticket Tracker: Frontend Context and Phase Plan

Hand this whole file to the coding agent as the working brief. Work through the phases in order, commit at the end of each phase, and do not skip ahead.

---

## 0. How to work (read first)

1. This is a take-home assessment for Lodwar Services (Mid-Level Full-Stack Developer). Due **Tuesday 13 Oct 2026, 6pm EAT** as a git repo link, with a README and a normal incremental commit history.
2. The reviewers judge **judgment, structure and decision-making, not feature completeness or visual polish**. The brief says 3 to 4 focused hours and "please don't over-build". Keep every phase tight and finish each one fully before the next.
3. The owner is a senior Angular and TypeScript engineer. Write idiomatic, modern Angular, keep files small, and explain only non-obvious choices in short comments.
4. Commit after every phase (messages suggested per phase). Never squash into one giant commit.
5. When something is ambiguous, pick the simplest reasonable assumption and append it to `docs/DECISIONS.md` (it feeds the README "Decisions & Tradeoffs" section). Do not stop to ask unless blocked.
6. **Component rule:** use ZardUI components wherever one exists. Only hand-build a component when Zard has no equivalent, and note that in `docs/DECISIONS.md`. Check the Zard docs and CLI for the exact component list and current API before writing any component code, because APIs change between versions. Do not guess selectors or inputs.
7. **Styling rule:** Tailwind utility classes only. No component-level CSS files, no SCSS, no inline `style=""`. The only CSS file is the global `styles.css` (Tailwind import, font, theme tokens).

---

## 1. Scope reconciliation (important)

The owner's spec is larger than the assessment brief, and it also leaves out one endpoint the brief requires. Treat scope in three tiers so that the required work is always finished first.

| Tier | Item | Source |
|---|---|---|
| **P0 required** | Ticket list showing status and priority | Brief |
| **P0 required** | Form to create a ticket | Brief |
| **P0 required** | Change an existing ticket's status | Brief |
| **P0 required** | Status filter and pagination on the list | Brief |
| **P0 required** | Stats (counts grouped by status) | Brief: `GET /tickets/stats` |
| **P1 owner spec** | Sidebar layout, no top nav, Tickets landing page with stat cards | Owner |
| **P1 owner spec** | Shared global data table (typed columns, events out) | Owner |
| **P1 owner spec** | Modal for create, view, edit; view shows history; "Update" button flips view to edit | Owner |
| **P1 owner spec** | Row buttons (view, update), checkbox column, badges | Owner |
| **P1 owner spec** | `handleResponse()` service with notifications and error handling, plus request helpers | Owner |
| **P2 stretch** | Bulk transition (mass in-progress, mass close) | Owner |
| **P2 stretch** | Search box, priority filter, sort | Owner |

Gaps and assumptions to flag in `docs/DECISIONS.md`:

- **Stats endpoint:** the owner's endpoint list omitted `GET /tickets/stats`. It is required by the brief and powers the landing page stat cards. Include it in the contract.
- **Enum spelling:** the brief uses `in_progress` (underscore). The owner wrote "in-progress" in places. **Use `in_progress` everywhere in code and API.** Show "In progress" as the display label.
- **History needs a backend:** ticket history is not in the brief's endpoints. Add `GET /tickets/{id}/history` to the contract (see section 3). Until the backend exists the mock layer serves it.
- **Closed is terminal:** the state machine is `open -> in_progress -> closed`, forward only. Assumption: a closed ticket's status cannot change, but its title, description and priority stay editable. Note this assumption.

---

## 2. Locked decisions

### Stack
- Angular 21, standalone components, **signals**, new control flow (`@if`, `@for`), `inject()`, reactive forms, `ChangeDetectionStrategy.OnPush`. Strict TypeScript.
- ZardUI (`@ngzard/ui` style component library, shadcn-like, components are copied into the repo by its CLI). Verify the current install command in the official docs, do not assume.
- Tailwind CSS (version that the Zard docs require for Angular 21), no other styling approach.
- Font: **Poppins** (weights 400, 500, 600, 700). Self-host through `@fontsource/poppins` or load via the HTML head. Set it as the Tailwind `font-sans` token so all components inherit it.

### Brand tokens
| Role | Hex | Use |
|---|---|---|
| Primary | `#13116c` (deep blue) | Primary buttons, active sidebar item, links, focus ring |
| Accent | `#f37d00` (orange) | Highlights, "Create ticket" call to action, badges that need emphasis, stat card accents |

Zard themes through CSS variables in the global stylesheet. Map the brand colours into the Zard `--primary` and `--accent` variables (and their `-foreground` pairs) in whatever color format the Zard version uses (likely OKLCH, convert the hexes accurately). Ensure white text on primary and dark text or white text on accent both pass contrast. Do not hardcode hex values in templates, always use the tokens.

### Status and priority badge mapping (use Zard badge variants plus Tailwind color classes)
| Value | Label | Suggested look |
|---|---|---|
| open | Open | blue tint |
| in_progress | In progress | orange tint |
| closed | Closed | neutral or green tint |
| low | Low | neutral |
| medium | Medium | amber |
| high | High | red |

Define these once in `src/app/features/tickets/ticket.constants.ts` (labels, badge classes, valid transitions). Never repeat them in templates.

### Layout
- Left **sidebar only** (Zard sidebar). Single menu item for now: **Tickets**. **No top navigation bar.**
- Because there is no top bar, the sidebar needs a collapse trigger that also works on mobile (sheet or drawer behaviour). Place the trigger inside the sidebar or as a small floating button on small screens.

### Folder structure
```
frontend/
  src/app/
    core/
      api/            api.service.ts, api.types.ts
      notifications/  (thin wrapper over Zard toast, if useful)
      mock/           mock-api.interceptor.ts, mock-data.ts
    shared/
      components/
        data-table/   data-table.component.ts, data-table.types.ts
      ui/             (Zard components land here via CLI, keep the CLI default location if it differs)
    layout/
      shell/          shell.component.ts (sidebar + router-outlet)
    features/
      tickets/
        ticket.model.ts
        ticket.constants.ts
        tickets-api.service.ts
        pages/tickets-page/        (landing: stats + table)
        components/
          ticket-stats/
          ticket-form-dialog/      (create | view | edit)
          ticket-history/
          bulk-action-bar/
  docs/DECISIONS.md
```
Repo root will later hold `/frontend` and `/backend` side by side.

---

## 3. API contract (code the frontend against this, build the mock to match)

Base URL via `environment.apiBaseUrl` (default `/api`, with a dev proxy to `http://localhost:8080`).

**Ticket**
```ts
type TicketStatus = 'open' | 'in_progress' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high';

interface Ticket {
  id: string;            // uuid
  title: string;         // required, max 200
  description: string | null;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;     // ISO 8601
  updatedAt: string;
}

interface TicketHistoryEntry {
  id: string;
  ticketId: string;
  action: 'created' | 'updated' | 'status_changed';
  field: 'title' | 'description' | 'priority' | 'status' | null;
  from: string | null;
  to: string | null;
  changedAt: string;
}

interface Page<T> { data: T[]; page: number; limit: number; total: number; totalPages: number; }
interface TicketStats { open: number; in_progress: number; closed: number; total: number; }
interface ApiError { status: number; error: string; message: string; fieldErrors?: Record<string, string>; }
```

**Endpoints**
| Method | Path | Notes |
|---|---|---|
| POST | `/tickets` | Body `{title, description?, priority}`. Status always starts `open`. Returns the created ticket. |
| GET | `/tickets` | Query: `status`, `priority`, `search` (title and description, case-insensitive), `page` (1-based), `limit`, `sort` (e.g. `createdAt,desc`). Returns `Page<Ticket>`. |
| GET | `/tickets/stats` | Returns `TicketStats`. Declared before `/tickets/{id}` on the backend so it does not collide. |
| GET | `/tickets/{id}` | Single ticket. 404 if missing. |
| GET | `/tickets/{id}/history` | Returns `TicketHistoryEntry[]`, newest first. |
| PATCH | `/tickets/{id}` | Partial body `{title?, description?, status?, priority?}`. Invalid status jump returns **409** with `ApiError`. |
| PATCH | `/tickets` | **Bulk (P2).** Body `{ids: string[], status: TicketStatus}`. Returns `{updated: number, failed: {id: string, reason: string}[]}`. Partial success is allowed. |

**State machine (enforced on the server, mirrored in the UI):** `open -> in_progress -> closed`. Same-status PATCH is a no-op. Skipping (`open -> closed`) or going backwards is rejected with 409. The UI must never offer an invalid transition (see `VALID_TRANSITIONS` in `ticket.constants.ts`).

---

## 4. Phases

Each phase lists: goal, tasks, acceptance checks, commit message. The agent must verify the acceptance checks (run the app, build, lint) before committing.

### Phase 0: Scaffold and tooling
**Goal:** an empty Angular 21 app with Tailwind, Zard, Poppins and brand tokens working.

Tasks
1. Create `frontend/` with Angular 21 (standalone, routing on, `styles.css`, strict mode).
2. Install and configure Tailwind per the Zard docs for Angular 21.
3. Initialise ZardUI with its CLI, then add the components needed across later phases in one go: sidebar, button, badge, checkbox, table (if offered), dialog, input, textarea, select, form (field, label, error helpers if offered), pagination, card, skeleton, toast, dropdown or tooltip (optional), separator, and any icon support Zard recommends. Skip ones that do not exist, and record anything missing in `docs/DECISIONS.md`.
4. Add Poppins and set it as the default sans font.
5. Map brand colours (`#13116c`, `#f37d00`) into the Zard theme variables, including dark-mode values only if cheap (light mode is enough).
6. Add `environment.ts` files with `apiBaseUrl` and `useMock` flag, plus a `proxy.conf.json` to `http://localhost:8080`.
7. Create the folder structure from section 2 and an empty `docs/DECISIONS.md`.

Accept: `ng serve` shows a page rendered in Poppins with a primary-blue Zard button and an orange accent element. `ng build` passes with no warnings about missing styles.
Commit: `chore(frontend): scaffold Angular 21 with Tailwind, ZardUI, Poppins and brand theme`

### Phase 1: Core data layer
**Goal:** typed models, the API service with `handleResponse()` and helpers, and a mock backend that matches the contract.

Tasks
1. `ticket.model.ts` and `ticket.constants.ts` (types from section 3, status and priority labels, badge classes, `VALID_TRANSITIONS`, helper `nextStatus(status)`).
2. `core/api/api.service.ts` containing:
   - Helper methods for every API request eg createTicket(), updateTicket(), searchTickets(), getTicketById()... obviously each function takes in the needed data as arguments
   - **`handleResponse<T>(options?)`** as an RxJS operator factory. Options: `successMessage?`, `errorMessage?`, `silent?`. On success it shows a success toast when `successMessage` is given. On error it maps `HttpErrorResponse` into the `ApiError` shape (network failure, 400 with `fieldErrors`, 404, 409, 5xx each get a human message), shows an error toast, and rethrows a typed `ApiError` so components can still react (for example to place `fieldErrors` onto form controls).
   - Notifications go through the Zard toast, wrapped once so that the rest of the app never imports the toast directly.
3. `features/tickets/tickets-api.service.ts` built on the helpers: `list(query)`, `get(id)`, `create(dto)`, `update(id, dto)`, `bulkUpdate(ids, status)`, `stats()`, `history(id)`. Each pipes through `handleResponse` with sensible messages (reads are silent on success, writes announce success).
4. `core/mock/mock-api.interceptor.ts` plus `mock-data.ts`: an HTTP interceptor active only when `environment.useMock` is true. It keeps an in-memory store of about 30 seeded tickets (mixed status and priority, varied dates) and implements **every endpoint in the contract**, including filtering, search, sorting, pagination, the 409 state-machine rule, bulk partial failures, history generation on each change, and a small artificial delay (200 to 400 ms) so loading states are visible.

Accept: a temporary test page or console check can call each service method and get contract-shaped data; a 409 shows an error toast; no component code talks to `HttpClient` directly.
Commit: `feat(frontend): add typed API layer, handleResponse and mock backend`

### Phase 2: App shell and routing
**Goal:** sidebar layout, no top bar, routing to the Tickets page.

Tasks
1. `shell.component.ts` with the Zard sidebar, brand header area (text logo is fine), one **Tickets** nav item with an icon and active state in primary blue, and a `<router-outlet>` content area with comfortable padding and a max width.
2. Mobile behaviour: sidebar collapses into a drawer, with a trigger that is reachable without a top bar.
3. Routes: `''` redirects to `/tickets`; `/tickets` lazy-loads `TicketsPageComponent` (placeholder for now). Add a simple not-found route.
4. Mount the Zard toaster once in the shell.

Accept: desktop shows fixed sidebar and content; mobile (375px) can open and close the sidebar; active item highlights; no horizontal scroll at any width.
Commit: `feat(frontend): add sidebar shell and tickets routing`

### Phase 3: Global shareable data table
**Goal:** a reusable, presentation-only table that is driven entirely by config and communicates back through outputs. It must contain no ticket-specific code.

Design principle: **the table is dumb and server-driven.** The parent owns data, page, filters and sort. The table renders what it is given and emits intent.

Types (`data-table.types.ts`)
```ts
type ColumnType = 'text' | 'badge' | 'date' | 'number' | 'actions' | 'custom';

interface BadgeConfig { label: string; class: string }   // per cell value

interface ColumnDef<T> {
  key: keyof T & string;           // or a virtual key for 'actions'
  header: string;
  type: ColumnType;
  sortable?: boolean;
  width?: string;                  // Tailwind class, e.g. 'w-40'
  badgeMap?: Record<string, BadgeConfig>;   // for type 'badge'
  dateFormat?: string;             // for type 'date'
  formatter?: (row: T) => string;  // for 'text' | 'number' overrides
  cellTemplate?: string;           // key of a projected ng-template, for 'custom'
}

interface RowAction<T> {
  id: string;                      // e.g. 'view', 'update'
  label: string;
  icon?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  visible?: (row: T) => boolean;
  disabled?: (row: T) => boolean;
}

interface FilterDef {
  key: string;                     // e.g. 'status'
  label: string;
  options: { value: string; label: string }[];
}

interface SortState { key: string; direction: 'asc' | 'desc' }
interface PageState { page: number; limit: number }
```

Component API (signal inputs and outputs)
- Inputs: `columns`, `data`, `loading`, `total`, `page`, `limit`, `limitOptions`, `selectable`, `selectedIds` (set from parent so it can clear selection), `rowIdKey` (default `'id'`), `actions` (RowAction list), `filters` (FilterDef list), `filterValues`, `searchable`, `searchPlaceholder`, `sort`, `emptyMessage`.
- Outputs: `searchChange` (debounced about 300 ms, emits string), `filterChange` (`{key, value}`), `sortChange` (`SortState`), `pageChange` (`PageState`), `selectionChange` (array of selected ids, covers select all on current page and individual), `actionClick` (`{actionId, row}`), `rowClick` (optional).
- Content projection: a `toolbar` slot (for the bulk action bar and the Create button) and `ng-template` cell overrides for `custom` columns.

Behaviour
- Header checkbox with indeterminate state; selection persists correctly across the current page and is cleared by the parent when filters or pages change.
- Badge columns render through Zard badge using `badgeMap`.
- Date columns render a readable local format.
- Loading state shows Zard skeleton rows. Empty state shows `emptyMessage`.
- Pagination footer uses the Zard pagination component and a page-size select. Shows "Showing x to y of total".
- Fully keyboard accessible, header sort buttons have `aria-sort`.

Accept: a demo with two different row types (a ticket-like and a simple user-like) renders correctly using the same component with no code changes inside it, and every output fires with the expected payload (log them).
Commit: `feat(frontend): add global config-driven data table with typed events`

### Phase 4: Tickets landing page (stats, list, filters, pagination)
**Goal:** the P0 list, status filter, pagination and stats, wired to the service.

Tasks
1. `TicketsPageComponent` holds the query state in signals (`status`, `priority`, `search`, `page`, `limit`, `sort`) and derives the request with `toObservable` plus `switchMap` (cancels stale requests). Reset to page 1 whenever search or a filter changes.
2. `TicketStatsComponent`: four Zard cards (Total, Open, In progress, Closed) fed by `GET /tickets/stats`, with skeletons while loading. Clicking a status card applies that status filter (nice and cheap interaction). Re-fetch stats after any write.
3. The table configuration: columns **checkbox, title, status (badge), priority (badge), created at, actions [View, Update]**. Filters: status (required), priority (stretch). Search enabled (stretch). Default sort: newest first.
4. Header area: page title "Tickets", short subtitle, and an orange accent **Create ticket** button in the table toolbar. (Dialog behaviour arrives in Phase 5, wire a placeholder handler now.)
5. Keep the URL in sync with query state (`?status=open&page=2`) so refresh and sharing work. This is optional if time is tight, record as a tradeoff if skipped.

Accept: stat cards show real counts, the table loads, paginates, filters by status and re-counts correctly; changing a filter resets to page 1; slow responses never overwrite newer ones.
Commit: `feat(frontend): tickets landing page with stats, table, filters and pagination`

### Phase 5: Ticket modal (create, view, edit) and history
**Goal:** one dialog component with three modes.

Tasks
1. `TicketFormDialogComponent` using the Zard dialog. Input data: `{ mode: 'create' | 'view' | 'edit'; ticketId?: string }`. The dialog returns a result (`saved` or `dismissed`) so the page knows when to refresh the list and stats.
2. Fields: **title** (required, max 200), **description** (textarea, optional), **priority** (select), **status** (select). Use Zard form, input, textarea and select components with reactive forms and inline validation messages.
3. **Create mode:** status is fixed to `open` and shown disabled (or hidden), submit calls `create`. On a 400 with `fieldErrors`, map errors onto controls.
4. **View mode:** all fields read-only, plus the **ticket history** section (`TicketHistoryComponent`, a vertical timeline: icon or dot, human sentence such as "Status changed from Open to In progress", and relative plus absolute time). Footer has a primary **Update** button that switches the *same dialog* to edit mode without closing it, and a Close button.
5. **Edit mode:** form is editable; **status select only offers the current value and the next valid transition** (from `VALID_TRANSITIONS`); closed tickets show status locked. Save calls `update` with only the changed fields. Cancel returns to view mode (confirm discard only if the form is dirty). History stays visible below and refreshes after a successful save.
6. Row actions: **View** opens `mode='view'`; **Update** opens directly in `mode='edit'`. The toolbar **Create ticket** button opens `mode='create'`.
7. The dialog fetches the ticket by id on open (do not trust the stale table row), with a skeleton while loading and an error state with retry.

Accept: create adds a ticket and the list and stats refresh; view shows history; Update flips to edit in place; invalid transitions cannot be selected; server 409 shows an error toast and leaves the form usable.
Commit: `feat(frontend): ticket dialog with create, view, edit modes and history timeline`

### Phase 6: Row-level status flow and bulk actions (P2 stretch)
**Goal:** fast status changes and mass transitions.

Tasks
1. `BulkActionBarComponent` rendered in the table toolbar slot when the selection is not empty: shows "n selected", **Mark in progress**, **Close**, and **Clear**.
2. Button enablement from the selected rows' statuses: *Mark in progress* applies to selected `open` tickets, *Close* applies to selected `in_progress` tickets. If the selection mixes valid and invalid rows, either disable with a tooltip explaining why or send only the valid ids and report the skipped count. Pick one, write it in `DECISIONS.md`.
3. Call `bulkUpdate`, then show one summary notification ("3 updated, 1 skipped") using `failed[]` from the response. Clear selection and refresh table plus stats.
4. Optional: inline quick action in the row (a single "Advance" button that moves a ticket to its next status). Only add if it costs under 15 minutes.

Accept: selecting rows shows the bar; bulk transitions respect the state machine; partial failures are reported clearly; selection clears afterward.
Commit: `feat(frontend): bulk status transitions with partial-failure reporting`

### Phase 7: Quality pass and README
**Goal:** make it submission-ready.

Tasks
1. States: loading skeletons, empty list state, API failure state with a retry button, disabled buttons while submitting, double-submit protection.
2. Responsive check at 375, 768 and 1280 widths (table scrolls horizontally inside its container, never the page).
3. Accessibility basics: labelled form controls, focus returned to the trigger when the dialog closes, visible focus ring in primary blue, `aria-sort`, checkbox labels.
4. Cleanliness: `ng lint` (if configured) and `ng build` pass, no unused code, no console logs, no leftover demo pages from Phase 3.
5. A few frontend unit tests if time allows (data table selection and events, `handleResponse` error mapping, `VALID_TRANSITIONS`). Keep them small, the brief only requires backend tests.
6. Write `frontend/README.md` covering: prerequisites, install, run with mock (`useMock: true`), run against the real API (proxy), build, project structure, how the Zard components and theme are set up. Draft the **"Decisions & Tradeoffs"** section (5 to 10 sentences) from `docs/DECISIONS.md`: shortcuts taken (mock layer, no auth, no URL sync if skipped, light mode only), assumptions (closed is terminal, history endpoint added, bulk partial success), and what you would do with more time (e2e tests, optimistic updates, virtual scroll, i18n).

Accept: a fresh clone can be set up and run from the README alone.
Commit: `chore(frontend): states, accessibility pass and README`

### Phase 8: Backend handoff (do after the frontend is stable)
Do not start the backend in this session unless asked. Prepare a short `docs/BACKEND_HANDOFF.md` with:
- The contract from section 3 copied verbatim, plus the error response shape and status codes (400 validation with `fieldErrors`, 404, 409 invalid transition).
- Target stack: Java Spring Boot, Gradle, JDK 25, PostgreSQL. Suggested entities `Ticket` and `TicketHistory`, enums stored as strings, UUID ids, `createdAt` and `updatedAt` managed by the server, history rows written inside the same transaction as each change.
- Requirements from the brief that apply to the backend: at least 2 to 3 integration or API tests (create and stats at minimum, add state-machine rejection and filtered list), a repo-level README with setup and run steps, and CORS or proxy settings for `localhost:4200`.
- Switching the frontend from mock to real: set `useMock: false` and confirm the proxy target.

Commit: `docs: add backend handoff notes`

---

## 5. Definition of done

- All **P0** items work end to end against the mock, and later against the real API without frontend changes besides the `useMock` flag.
- Table is genuinely reusable (no ticket knowledge inside it).
- Zard components used everywhere one exists, Tailwind only, Poppins, brand colours via theme tokens.
- No top nav, sidebar works on desktop and mobile.
- Incremental commit history matching the phases above.
- README plus `docs/DECISIONS.md` complete and honest about shortcuts.

## 6. Priority if time runs short

Cut in this order, last item first: (1) bulk actions, (2) priority filter, search and sort, (3) URL sync, (4) frontend unit tests. Never cut P0 items, the history timeline, or the README.
