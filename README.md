# Mini Ticket Tracker — Frontend

Angular 21 single-page app for the Mini Ticket Tracker. Talks to the Spring Boot
backend under `/api`.

- **Dev server port:** `4200` (default)
- **Backend (dev):** proxied to `http://localhost:8090` via `proxy.conf.json`

---

## Prerequisites

- Node.js 20+ and npm
- The backend running (default `http://localhost:8090`) for live data

---

## 1. Install

```bash
npm ci
```

## 2. Run from source (development)

```bash
npm start      # or: ng serve
```

Open <http://localhost:4200>. The dev server proxies all `/api` requests to the
backend, so no CORS setup is needed.

## 3. Build and deploy (production)

```bash
npm run build  # or: ng build
```

The optimized static files are written to `dist/app/`. Deploy that folder to any
static web server (Nginx, Apache, S3/CloudFront, etc.).

> In production there is no dev proxy. Serve the app so that requests to `/api`
> reach the backend — e.g. put the backend behind the same host/domain, or add a
> reverse-proxy rule mapping `/api` to the backend URL.

---

## 4. Changing ports

### Frontend dev-server port (no effect on the backend)

```bash
ng serve --port 4300
```

Or set it permanently in `package.json`:

```json
"start": "ng serve --port 4300"
```

### Backend address the frontend talks to

Edit **`proxy.conf.json`** and change `target` to wherever the backend runs:

```json
{
  "/api": {
    "target": "http://localhost:8090",   // <-- change host/port here
    "secure": false,
    "changeOrigin": true
  }
}
```

Restart `npm start` after editing. This only affects development; for production
see the deployment note in section 3.
