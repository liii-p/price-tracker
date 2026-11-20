# price-tracker
Keep track of the price of items and get notified when there's a good deal!

Paste a product link, pick how low the price needs to go (25% off, 50% off, a custom % or a specific price), and the app checks the price on a schedule and emails you when it drops to your target.

Built with Next.js 16, Prisma + SQLite, and Resend. Designed to be self-hosted by a single user.

## Setup

Requires Node.js 22+.

```bash
npm install                 # also generates the Prisma client
cp .env.example .env        # then edit the values (see below)
npx prisma migrate deploy   # creates the SQLite database
npm run dev                 # http://localhost:3000
```

> If npm says better-sqlite3's install script was blocked, run `npm install-scripts approve better-sqlite3 && npm rebuild better-sqlite3`.

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLite file, e.g. `file:./dev.db` |
| `RESEND_API_KEY` | Resend API key. If empty, alerts are printed to the server console instead of being emailed |
| `ALERT_EMAIL` | Where alerts are sent |
| `EMAIL_FROM` | Sender, e.g. `Price Tracker <alerts@yourdomain.com>` |
| `CHECK_CRON` | How often to check prices, in cron syntax (default every 6 hours: `0 */6 * * *`) |
| `CRON_SECRET` | Secret for triggering checks via `POST /api/check` |
| `APP_URL` | Public URL of the app, used for links in emails |

### Email (Resend)

1. Create a free account at [resend.com](https://resend.com) and an API key, then set `RESEND_API_KEY`.
2. For testing, you can send from `onboarding@resend.dev`, but Resend only delivers those emails to the address on your Resend account.
3. To send to other addresses, verify your own domain in Resend and set `EMAIL_FROM` to an address on it.

## How it works

- **Price detection**: the page's structured data (JSON-LD `Product` offers) is tried first, then product meta tags and microdata, then site-specific CSS selectors in [src/lib/scraper/sites.ts](src/lib/scraper/sites.ts). If a shop isn't supported, add its price selector there. If a price can't be found (some shops build the page with JavaScript or block bots), you can enter it manually when adding the item, and record prices you see on the item page.
- **Targets**: percentage targets are calculated from the item's *original price* (the price when you added it, which you can edit later).
- **Alerts**: one email is sent when the price first reaches or drops below the target. If the price goes back above the target and drops again, you get another email. Changing an item's target re-checks its current price straight away.
- **Scheduling**: when running as a long-lived Node server (`npm start`), checks run in-process on `CHECK_CRON`. You can also trigger a check from any external scheduler:

  ```bash
  curl -X POST -H "x-cron-secret: $CRON_SECRET" https://your-app/api/check
  # GET and `Authorization: Bearer $CRON_SECRET` also work (the format Vercel Cron uses)
  ```

## Running with Docker

The easiest way to keep price checks running all the time is Docker Compose on any always-on machine (home server, NAS, Raspberry Pi, VPS):

```bash
cp .env.example .env    # fill in your secrets and Resend settings
docker compose up -d --build
```

The app is then at http://localhost:3000 (or `http://<machine-ip>:3000` from other devices).

- **Settings** come from `.env` when the container starts. They're never copied into the image (see `.dockerignore`). After editing `.env`, run `docker compose up -d` to apply the changes.
- **Data** lives in the `price-data` Docker volume at `/data/price-tracker.db`, so rebuilding or upgrading the container keeps your watchlist. Database migrations run automatically on startup.
- **Time zone**: `TZ` in `docker-compose.yml` (default `Australia/Adelaide`) controls when `CHECK_CRON` fires and how dates are shown. Override it with `TZ=Europe/London docker compose up -d`.
- **`APP_URL`** should be the address you open the app at, so links in emails work.
- The container restarts automatically after crashes and reboots (`restart: unless-stopped`), as long as Docker itself starts at boot.

Useful commands:

```bash
docker compose logs -f                       # follow logs (price checks, email errors)
git pull && docker compose up -d --build     # update to the latest code
docker compose cp price-tracker:/data/price-tracker.db ./backup.db   # back up the database
```

Without Compose:

```bash
docker build -t price-tracker .
docker run -d --name price-tracker --restart unless-stopped -p 3000:3000 \
  --env-file .env -e DATABASE_URL=file:/data/price-tracker.db \
  -v price-data:/data price-tracker
```

## Deploying

Any host that runs a persistent Node server and keeps a writable disk for the SQLite file works, e.g. a home server, a VPS, Fly.io or Railway (with a volume):

```bash
npm ci && npx prisma migrate deploy && npm run build && npm start
```

On serverless platforms (e.g. Vercel), the in-process scheduler won't run and SQLite won't persist. If you deploy there, switch Prisma to a hosted Postgres database, set `DISABLE_SCHEDULER=true`, and call `/api/check` from the platform's cron feature.

## Development

```bash
npm test        # unit tests (price parsing, alert logic, scraper fixtures)
npm run lint
npm run build
```
