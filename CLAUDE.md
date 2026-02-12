# Samlet

A team collaboration platform built with Nuxt 3 for managing a bulletin board, documents, calendar events, and users. Danish-language interface ("Samlet" = "Collected").

## Tech Stack

- **Frontend:** Nuxt 3 (Vue 3), Tailwind CSS
- **Backend:** Nitro (Nuxt server engine)
- **Database:** PostgreSQL 16 with Drizzle ORM
- **Auth:** JWT (jose), bcrypt, WebAuthn passkeys (@simplewebauthn), magic links
- **Email:** Nodemailer with HTML templates
- **Deployment:** Docker multi-stage build, Cloudflare Tunnel

## Project Structure

```
app/                        # Nuxt frontend
  components/               # CalendarGrid, MarkdownEditor, PasskeySetupPrompt
  composables/              # useAuth, useRoles, useCategoryColors
  layouts/                  # default (nav header), auth (centered)
  middleware/auth.global.ts # Redirects unauthenticated users to /login
  pages/                    # Vue router pages (see below)
  plugins/auth.ts           # Fetches user on app init
  assets/css/main.css       # Tailwind + markdown content styles
server/                     # Nitro backend
  api/                      # Auto-routed API endpoints
  db/schema.ts              # Drizzle schema (all tables)
  db/migrations/            # SQL migrations
  middleware/auth.ts         # JWT verification, sets event.context.user
  plugins/seed.ts             # Seeds admin user on first run
  plugins/scheduled-jobs.ts   # All scheduled background jobs (see below)
  utils/                      # auth, audit, db, email, jwt, storage, webhook
shared/                     # Code shared between frontend and backend
  types/index.ts            # TypeScript interfaces
  utils/roles.ts            # Role constants
  utils/markdown.ts         # Markdown rendering (marked)
```

## Pages

| Route | File | Purpose |
|---|---|---|
| `/` | `pages/index.vue` | Redirects to `/board` |
| `/login` | `pages/login.vue` | Login (password, passkey, magic link) |
| `/board` | `pages/board/index.vue` | Bulletin board with pinned posts |
| `/documents` | `pages/documents/index.vue` | Document list, upload, category filter |
| `/documents/:id` | `pages/documents/[id].vue` | PDF viewer |
| `/calendar` | `pages/calendar/index.vue` | Monthly grid + list view, RSVP |
| `/settings` | `pages/settings.vue` | Notifications, passkey management |
| `/admin/users` | `pages/admin/users.vue` | User CRUD, role assignment |
| `/admin/categories` | `pages/admin/categories.vue` | Document category CRUD |
| `/admin/audit` | `pages/admin/audit.vue` | Audit log viewer |

## Database Schema

Defined in `server/db/schema.ts`. Key tables:

- **users** — email, passwordHash, active, notificationsEnabled, icsToken
- **roles** / **user_roles** — RBAC many-to-many
- **categories** — name, color (for documents)
- **documents** — title, filename, storagePath, fileSize, categoryId, uploadedBy
- **board_posts** — title, content (markdown), pinned, authorId
- **calendar_events** — title, description, location, date, startTime, endTime, allDay, createdBy
- **event_responses** — userId, eventId, status (accepted/declined)
- **passkey_credentials** — WebAuthn credential storage per user
- **magic_links** — token, email, expiresAt, used
- **audit_logs** — action, userId, details, ipAddress, timestamp

## Roles

Defined in `shared/utils/roles.ts`:

- `admin` — full access
- `read-files` / `write-files` — document access
- `write-board` — create/edit board posts
- `read-calendar` / `write-calendar` — calendar access

## API Routes

All under `/api/`. File naming follows Nitro convention (`index.get.ts`, `[id].put.ts`, etc.):

- **auth/** — login, logout, me, notifications, magic-link, passkey (register/login/list/delete)
- **board/** — CRUD for posts
- **calendar/** — CRUD for events, respond (RSVP), responses, ics-token, feed/[token] (ICS)
- **documents/** — CRUD for documents, [id]/file (PDF download)
- **categories/** — CRUD for categories
- **users/** — CRUD for users (admin only)
- **roles/** — list available roles
- **admin/audit** — audit log query

## Commands

```bash
npm run dev           # Start dev server (port 3000)
npm run build         # Production build
npm run preview       # Preview production build
npm run db:generate   # Generate Drizzle migrations from schema
npm run db:migrate    # Run pending migrations
npm run db:push       # Push schema directly (dev only)
```

## Environment Variables

See `.env.example`. Key variables (prefixed with `NUXT_` in docker-compose):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `UPLOAD_DIR` | File upload directory (default `./uploads`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seed admin account credentials |
| `SMTP_HOST/PORT/USER/PASS/FROM` | Email sending configuration |
| `NUXT_PUBLIC_SMTP_ENABLED` | Enable email features (`true`/`false`) |
| `BASE_URL` | Public URL for links in emails |
| `WEBAUTHN_RP_ID` / `WEBAUTHN_ORIGIN` | WebAuthn relying party config |
| `WEBHOOK_URL` | Error webhook URL (POST with JSON on failures) |
| `BACKUP_DIR` | PostgreSQL backup directory (default `./backups`) |
| `CLOUDFLARE_TUNNEL_TOKEN` | Cloudflare Tunnel token (docker-compose) |

## Docker

```bash
docker compose up -d   # Starts app, PostgreSQL, and Cloudflare Tunnel
```

Services: `app` (Node 22 Alpine), `db` (Postgres 16 Alpine), `cloudflared`.

## Key Patterns

- **Auth flow:** JWT stored in HTTP-only cookie (`auth_token`), 45-day expiry. Server middleware decodes token and sets `event.context.user`.
- **Authorization:** `requireAuth(event)` and `requireRole(event, 'role-name')` utilities in `server/utils/auth.ts`.
- **File storage:** Uploads saved to `{uploadDir}/{year}/{month}/{uuid}.pdf` via `server/utils/storage.ts`.
- **Audit logging:** `audit(event, action, details)` in `server/utils/audit.ts`. 23 action types tracked.
- **Email:** Rate-limited to 30/min. HTML templates inline in `server/utils/email.ts`. Notifications for board posts, calendar events, and reminders.
- **Markdown:** Board posts support markdown via `marked`. Editor component with toolbar and live preview.
- **Admin seed:** `server/plugins/seed.ts` creates the admin user and default roles on first startup.
- **Scheduled jobs:** All background jobs run in `server/plugins/scheduled-jobs.ts`. Jobs: event reminders (every 15 min), trash file purge (daily, 30-day retention), audit log cleanup (daily, 3-month retention), PostgreSQL backup (daily, kept in `BACKUP_DIR`, cleaned after 30 days).
- **Error webhook:** `server/utils/webhook.ts` sends a POST with `{ timestamp, source, error, details }` to `WEBHOOK_URL` on scheduled job failures and email send failures. No-op if URL is not configured.
