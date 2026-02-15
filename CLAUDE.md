# Samlet

A team collaboration platform built with Nuxt 3 for managing a bulletin board, documents, calendar events, and users. Danish-language interface ("Samlet" = "Collected").

## Tech Stack

- **Nuxt 3** — Full-stack Vue 3 framework. Provides file-based routing, auto-imports, SSR, and the Nitro server engine for API endpoints.
- **Vue 3** — Reactive UI framework. Uses Composition API with `<script setup>`, composables for shared logic, and reactive refs/computed for state.
- **Nitro** — Nuxt's server engine. Powers all `/api/` routes with file-based routing (`index.get.ts`, `[id].put.ts`), middleware, and server plugins.
- **Tailwind CSS** — Utility-first CSS framework via `@nuxtjs/tailwindcss`. All styling is done with utility classes in templates.
- **PostgreSQL 16** — Primary database. Runs in Docker (Alpine). Stores all application data including users, posts, comments, documents, and events.
- **Drizzle ORM** — Type-safe SQL query builder and schema definition. Schema in `server/db/schema.ts`, migrations generated with `drizzle-kit`.
- **jose** — JWT signing and verification for auth tokens. Tokens stored in HTTP-only cookies with 45-day expiry.
- **bcrypt** — Password hashing for user authentication.
- **@simplewebauthn** — WebAuthn/passkey support (browser + server packages). Enables passwordless login via biometrics or hardware keys.
- **marked** — Markdown-to-HTML rendering for board posts. Used in both the editor preview and post display.
- **isomorphic-dompurify** — HTML sanitization to prevent XSS. Sanitizes rendered markdown before inserting via `v-html`.
- **Nodemailer** — SMTP email sending for notifications (new posts, comments, calendar events, reminders, magic links).
- **pg** — PostgreSQL client driver used by Drizzle ORM for database connections.
- **Docker** — Multi-stage production build (Node 22 Alpine). Compose setup with app, PostgreSQL, and optional Cloudflare Tunnel.

## Project Structure

```
app/                        # Nuxt frontend
  components/               # CalendarGrid, MarkdownEditor, BoardComments, MentionDropdown, PasskeySetupPrompt
  composables/              # useAuth, useRoles, useCategoryColors, useMentions
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
| `/board` | `pages/board/index.vue` | Bulletin board with pinned posts, comments, @mentions |
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
- **board_posts** — title, content (markdown), pinned, commentsEnabled, authorId
- **board_comments** — postId (cascade delete), authorId, content (plain text), timestamps
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
- `write-comment` — comment on board posts (enabled by default)
- `read-calendar` / `write-calendar` — calendar access
- `read-users` — view member directory
- `write-members` — edit member contact information

## API Routes

All under `/api/`. File naming follows Nitro convention (`index.get.ts`, `[id].put.ts`, etc.):

- **auth/** — login, logout, me, notifications, magic-link, passkey (register/login/list/delete)
- **board/** — CRUD for posts, [id]/comments (CRUD for comments)
- **calendar/** — CRUD for events, respond (RSVP), responses, ics-token, feed/[token] (ICS)
- **documents/** — CRUD for documents, [id]/file (PDF download)
- **categories/** — CRUD for categories
- **users/** — CRUD for users (admin only), mentions (active user list for @mentions)
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
| `POSTGRES_PASSWORD` | PostgreSQL password (used by docker-compose) |
| `JWT_SECRET` | Secret for signing JWT tokens |
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
- **Audit logging:** `audit(event, action, details)` in `server/utils/audit.ts`. 26 action types tracked (includes comment_created/updated/deleted).
- **Email:** Rate-limited to 30/min. HTML templates inline in `server/utils/email.ts`. Notifications for board posts, comments, calendar events, and reminders. Comment notifications go to post author, previous commenters, and @mentioned users.
- **Markdown:** Board posts support markdown via `marked`. Editor component with toolbar and live preview. Preview supports rendering document/event references and @mentions.
- **Comments:** Board posts have a collapsible comment section (`BoardComments` component). Comments are plain text (no markdown) with @mention support. Post authors can disable comments per post. Users with `write-comment` role can comment; `write-board`/admin can moderate.
- **@Mentions:** Inline autocomplete via `useMentions` composable and `MentionDropdown` component. Type `@` followed by a name to see matching users. Stored as `@[Name](userId)`, rendered as styled badges. Works in post editor and comment textareas.
- **Admin seed:** `server/plugins/seed.ts` creates the admin user and default roles on first startup.
- **Scheduled jobs:** All background jobs run in `server/plugins/scheduled-jobs.ts`. Jobs: event reminders (every 15 min), trash file purge (daily, 30-day retention), audit log cleanup (daily, 3-month retention), PostgreSQL backup (daily, kept in `BACKUP_DIR`, cleaned after 30 days).
- **Error webhook:** `server/utils/webhook.ts` sends a POST with `{ timestamp, source, error, details }` to `WEBHOOK_URL` on scheduled job failures and email send failures. No-op if URL is not configured.
