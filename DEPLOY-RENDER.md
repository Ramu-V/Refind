# Deploying ReFind to Render

ReFind = Next.js app + PostgreSQL. **Accounts, reports and uploaded images are all stored in
PostgreSQL**, so a persistent database is what keeps your data — the web server itself keeps nothing.

This repo already contains everything Render needs:

| File | Purpose |
| --- | --- |
| `render.yaml` | Blueprint: creates the web service + PostgreSQL and wires them together |
| `drizzle/` | SQL migrations that create all 7 tables on an empty database |
| `scripts/render-init.mjs` | Runs before the server starts: waits for DB, applies migrations, optional one-time demo seed |
| `.env.example` | Documents the 3 environment variables |

## 1. Put the code on GitHub

Render deploys from Git. From the project folder on your computer:

```bash
git init
git add .
git commit -m "ReFind"
git branch -M main
git remote add origin https://github.com/<your-username>/refind.git   # create the empty repo on github.com first
git push -u origin main
```

`.gitignore` already keeps `.env*`, `node_modules/` and `.next/` out of the repo. Make sure
`drizzle/`, `render.yaml`, `scripts/` and `package-lock.json` **are** committed.

## 2. Create the services on Render

1. Sign in at <https://dashboard.render.com> (connect your GitHub account when asked).
2. **New + → Blueprint** → choose your `refind` repository → **Apply**.
3. Render creates **`refind-db`** (PostgreSQL) and **`refind`** (web service), generates `AUTH_SECRET`
   for you, and injects `DATABASE_URL`. You don't paste any secrets.
4. Wait for the first deploy (a few minutes). In the service **Logs** you should see:
   ```
   [refind-init] Migrations are up to date.
   ✓ Ready
   ```

## 3. Get your public URL

Open the **`refind`** service in the dashboard. The URL is shown under the service name:

```
https://<service-name>.onrender.com
```

The name is `refind` if it's free, otherwise Render adds a suffix. That `onrender.com` address is
stable — it does not change between deploys. You can also attach your own domain under
**Settings → Custom Domains**.

## 4. Check it works (2 minutes)

1. Open the URL → landing page loads.
2. **Sign up** with a new account → you land on the dashboard.
3. **Report an item** with a photo → the photo preview shows, then the report page shows the image.
4. Open the report in a private/incognito window after logging in as another user → image still shows.
5. In Render: **Manual Deploy → Restart** (or wait for a redeploy) → refresh: report + image still there.

## 5. Decisions you should make

* **Database plan (`render.yaml` → `databases[0].plan`)** — set to `basic-256mb` (paid) so data lasts.
  Render's *free* Postgres **expires after 30 days and is then deleted** — only use `free` for a short trial.
  See <https://render.com/pricing> for current prices.
* **Web plan** — `free` sleeps after 15 min of no traffic; the next visitor waits ~1 minute.
  Use a paid plan for an always-on site.
* **Demo data (`SEED_DEMO_DATA`)** — `"true"` loads the demo campus data **once, only into an empty
  database**, and never again. The login page's demo-account buttons use the password `refind123`, so on a
  public site **anyone can sign in as those demo users**. For a clean launch set it to `"false"`
  (the demo-account box on the login page will then point at accounts that don't exist).

## 6. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Build fails with "out of memory" / exit 137 | Next.js builds need RAM. Move the web service to a plan with more memory (e.g. `1c-2g`). |
| `DATABASE_URL is not set` in logs | The web service isn't linked to `refind-db`. Re-apply the Blueprint. |
| `AUTH_SECRET is not set` | Add it under **Environment** (any long random string: `openssl rand -base64 32`). |
| `Migration failed … created some other way` | `DATABASE_URL` points at a database that already has tables from `drizzle-kit push`. Use a fresh database. |
| First page load is slow | Free web service was asleep; it wakes in ~1 minute. |

## Notes

* Use the **Internal** database URL (the Blueprint does this). External URLs need TLS; `render-init.mjs`
  handles that automatically only for its own connection.
* Uploaded images live in the `stored_item_images` PostgreSQL table, not on disk, so they survive
  restarts, redeploys and spin-downs on any plan.
* Schema changes later: `npx drizzle-kit generate`, commit the new file in `drizzle/`, push — the next
  start applies it automatically.
