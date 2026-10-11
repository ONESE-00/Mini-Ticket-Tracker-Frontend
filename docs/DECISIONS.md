# Decisions & Tradeoffs

Running log of non-obvious choices and assumptions. Feeds the README
"Decisions & Tradeoffs" section.

## Contract / scope

- **Stats endpoint added.** `GET /tickets/stats` was missing from the owner's
  endpoint list but is required by the brief and powers the landing stat cards.
  Included in the contract and the mock.
- **Enum spelling `in_progress`.** Underscore everywhere in code and on the wire;
  the UI shows "In progress" as the display label only.
- **History endpoint added.** `GET /tickets/{id}/history` is not in the brief's
  endpoints but the owner spec needs a history timeline. Added to the contract;
  the mock generates entries on every create/update/status change.
- **Closed is terminal.** State machine is forward-only `open -> in_progress ->
  closed`. A closed ticket's status cannot change, but its title, description and
  priority stay editable. Invalid jumps are rejected with HTTP 409.

## Backend / pagination

- **Spring Boot + Spring Data `Pageable`.** The backend owner confirmed Spring
  Boot with the `Pageable` interface for pagination. The UI therefore talks the
  Spring contract on the wire:
  - Request params: `page` (0-based), `size`, `sort=property,direction`.
  - Response: Spring `Page<T>` (`content`, `number`, `size`, `totalElements`,
    `totalPages`, `first`, `last`, ...).
  - `ApiService`/`TicketsApiService` is the single adapter: components work with
    a clean 1-based `Page<T>` (`data/page/limit/total/totalPages`); the service
    translates to/from the Spring shape. This keeps 0-based/1-based confusion out
    of the components.
- **Mock mirrors Spring.** The dev mock interceptor returns the Spring `Page<T>`
  JSON and reads Pageable params, so switching `useMock: false` needs no
  component changes — only a running backend on `:8080` behind the proxy.

## Frontend architecture

- **ZardUI for every component that exists.** Hand-built components only where
  Zard has no equivalent (noted below as they arise). Tailwind utilities only,
  no component CSS, Poppins as `font-sans`, brand colours via theme tokens.
- **Brand tokens.** `--primary` = `#13116c` (oklch 0.268 0.148 271.3), white
  foreground (contrast 15.86). `--accent` = `#f37d00` (oklch 0.711 0.177 54.5),
  near-black foreground (contrast 7.74) — white on orange fails AA, so accent
  text is dark. Focus ring and active sidebar item use the primary blue.
- **`handleResponse` operator factory.** One RxJS operator owns success/error
  toasts. It follows the owner's established service style: a single flat
  `TicketsApiService` holds `HttpClient` directly, every method takes its own
  arguments plus a `showSuccess` boolean (reads default `false` — no toast while
  searching/paginating a table; writes default `true`), and each call pipes
  `.pipe(this.handleResponse({ showSuccess }))`. On success it reads
  `response.message ?? response?.result?.message ?? 'Success'`; on error it reads
  `error?.error?.message || error?.message` and rethrows the original error so
  components can still react (e.g. read `error.error.fieldErrors` onto a form).
  Toasts go through a single `ToastService` wrapper (`alertSuccess`/`alertError`)
  so no feature code imports the Zard toast directly.
- **Light mode only** for now; dark-mode token values are left at Zard defaults.

## Ticket dialog (Phase 5)

- **One dialog, three modes.** `TicketFormDialogComponent` handles create / view /
  edit. View flips to edit in place (same dialog instance) via a `mode` signal,
  rather than opening a second dialog. Opened through `ZardDialogService.create`
  with `zHideHeader`/`zHideFooter` so the component owns its own header, footer
  and per-mode buttons.
- **Result handoff.** `ZardDialogRef` exposes a `result` signal but no
  `afterClosed()` observable, so the opener passes an `onResult` callback via
  `zData`; the dialog calls it with `'saved'` (page refreshes list + stats) or
  `'dismissed'` before closing. Avoids instance-timing races.
- **Fetch on open.** View/edit fetch the ticket by id (never trust the stale
  table row) with a skeleton while loading and an error state + retry. History is
  fetched in parallel and shown as a timeline (newest first, human sentences,
  relative + absolute time).
- **Transitions enforced in the UI.** Edit mode's status select offers only the
  current status and its single next valid transition (`nextStatus`); closed
  tickets lock the field. `PATCH` sends only changed fields. A server 409 is
  surfaced via the toast and leaves the form usable.
- **Validation.** Reactive forms with `z-field` / `z-field-error`; title required
  and max 200. A 400 with `fieldErrors` maps each message onto its control
  (`setErrors({ server })`) for inline display.

## Open items / tradeoffs

- Tickets feature route is lazy-loaded; production initial budget was raised
  while Zard was added (production build tree-shakes well, ~140KB transfer).
- **URL sync skipped** (optional per the brief): query state (status, priority,
  page, …) lives in signals, not the URL, so refresh/share won't preserve
  filters. Would add `Router` query-param sync with more time.

## Component conventions

- **Templates live in their own `.html` files** (`templateUrl`), not inline in
  the `.ts`, to keep UI separate from logic. Inline templates only when a
  component is trivially small and it is explicitly warranted.

## Data table (Phase 3)

- **Presentation-only and generic.** `DataTableComponent<T>` carries no domain
  knowledge; the parent owns data, page, filters and sort and the table emits
  intent (`searchChange` debounced 300ms, `filterChange`, `sortChange`,
  `pageChange`, `selectionChange`, `actionClick`, `rowClick`). Verified by a spec
  that renders two unrelated row shapes (ticket-like and user-like) through the
  same component with no internal changes, asserting each output fires.
- **Badges** render through Zard `z-badge` (`zType="secondary"`) with the tint
  class from the column `badgeMap` merged via the component's `class` input.
- **Checkbox indeterminate:** Zard's `z-checkbox` does not expose a native
  indeterminate state, so the header "select all" shows checked only when every
  row on the current page is selected; partial selection shows unchecked.
  Selection is tracked by id and preserved across pages by the parent.
- **Single-hue badge system.** To avoid a rainbow UI, status badges use blue
  shades (blue-50/100/200, lightening to darkening across open → closed) and
  priority badges use orange shades (orange-50/100/200 across low → high). One
  hue per dimension keeps the table calm and the two axes visually distinct.
- **Filter "clear" sentinel.** Zard's `z-select` rejects empty-string item
  values (it early-returns on `''`), so the "All status/All priority" option
  could not be selected. The data table uses an `__all__` sentinel for the clear
  option and maps it back to an empty value on `filterChange`, so the public
  contract still means "no filter". Covered by a regression test.
- **Stats, two perspectives.** `GET /tickets/stats` returns both status counts
  (open/in_progress/closed/total) and priority counts (low/medium/high). The
  landing page shows a "By status" and a "By priority" card group, each
  click-to-filter. This extends the brief's stats shape (which only required
  status counts) — noted here as an intentional addition.
