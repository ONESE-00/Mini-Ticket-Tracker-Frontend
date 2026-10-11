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

## Open items / to revisit

- Lazy-load the tickets feature route to keep the initial bundle small (Zard adds
  weight); production initial budget temporarily raised while scaffolding.
