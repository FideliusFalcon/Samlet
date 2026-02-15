# Samlet

En samarbejdsplatform til foreninger med opslagstavle, dokumentarkiv, kalender og brugerstyring.

## Funktioner

- **Opslagstavle** — Opret og fastgør opslag med markdown-formatering, kommentarer og @omtaler
- **Dokumentarkiv** — Upload og organiser PDF-dokumenter i kategorier
- **Kalender** — Opret begivenheder med RSVP, ICS-feed og påmindelser via e-mail
- **Brugerstyring** — Rollebaseret adgang, login med adgangskode, passkeys eller magic links
- **Notifikationer** — E-mail-notifikationer for nye opslag, kommentarer, begivenheder og påmindelser
- **Automatisk backup** — Daglig PostgreSQL-backup med 30 dages opbevaring

## Deployment

Projektet kører med Docker Compose (app, PostgreSQL).

### 1. Klon og konfigurer

```bash
git clone <repo-url> samlet
cd samlet
cp .env.example .env
```

Ret `.env` med dine værdier — som minimum:

```env
POSTGRES_PASSWORD=en-sikker-adgangskode
JWT_SECRET=en-tilfaeldig-streng-paa-mindst-32-tegn
ADMIN_EMAIL=din@email.dk
ADMIN_PASSWORD=dit-admin-password
```

### 2. Start

```bash
docker compose up -d
```

Appen er tilgængelig på port 3000. Databasemigrationer og oprettelse af admin-brugeren sker automatisk ved første opstart.

### 3. Cloudflare Tunnel (valgfrit)

Hvis du vil eksponere appen via Cloudflare Tunnel, tilføj dit token i `.env`:

```env
CLOUDFLARE_TUNNEL_TOKEN=dit-tunnel-token
```

Hvis du ikke bruger Cloudflare Tunnel, kan `cloudflared`-servicen fjernes fra `docker-compose.yml`.

### 4. E-mail (valgfrit)

Konfigurer SMTP for notifikationer og magic links:

```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=din-bruger
SMTP_PASS=din-adgangskode
SMTP_FROM=noreply@ditdomaene.dk
```

### 5. Gendannelse fra backup

Backups oprettes dagligt som gzippede `pg_dump`-filer i `backups`-volumen (f.eks. `samlet_20260215_0300.sql.gz`).

Kopier backup-filen ud af volumen:

```bash
docker compose cp app:/app/backups/samlet_20260215_0300.sql.gz .
```

Gendan til databasen:

```bash
gunzip -c samlet_20260215_0300.sql.gz | docker compose exec -T db psql -U samlet -d samlet
```

Hvis databasen har eksisterende data, drop og genskab den først:

```bash
docker compose exec db psql -U samlet -d postgres -c "DROP DATABASE samlet;"
docker compose exec db psql -U samlet -d postgres -c "CREATE DATABASE samlet OWNER samlet;"
gunzip -c samlet_20260215_0300.sql.gz | docker compose exec -T db psql -U samlet -d samlet
```

Genstart appen bagefter:

```bash
docker compose restart app
```

## Miljøvariabler

Se `.env.example` for alle tilgængelige variabler.

---

`opslagstavle` `kommentarer` `@omtaler` `dokumentarkiv` `kalender` `brugerstyring` `rollebaseret adgang` `passkeys` `magic links` `RSVP` `ICS-feed` `e-mail-notifikationer` `påmindelser` `markdown` `PDF-upload` `automatisk backup` `foreningsportal` `selvhostet`
