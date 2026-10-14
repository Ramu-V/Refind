// Runs before `next start` on Render (and in any production-style environment).
//
//  1. Waits for PostgreSQL to accept connections.
//  2. Applies pending SQL migrations from ./drizzle (idempotent; tracked by Drizzle).
//  3. Optionally seeds demo data — ONLY if SEED_DEMO_DATA=true AND the users table is empty.
//
// It never drops, truncates, or overwrites existing data.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

const log = (msg) => console.log(`[refind-init] ${msg}`);
const fail = (msg, err) => {
  console.error(`[refind-init] ERROR: ${msg}`);
  if (err) console.error(err instanceof Error ? err.message : err);
  process.exit(1);
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) fail("DATABASE_URL is not set. Link the Render Postgres database to this service.");

if (!process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  fail("AUTH_SECRET is not set. Login sessions cannot work without it.");
}

if (!existsSync("./drizzle/meta/_journal.json")) {
  fail("./drizzle migrations folder is missing. Commit the `drizzle/` directory to Git.");
}

// Render's *external* database URLs require TLS; internal URLs do not.
const needsTls = /\.render\.com/.test(databaseUrl) && !/sslmode=disable/.test(databaseUrl);
const pool = new pg.Pool({
  connectionString: databaseUrl,
  ssl: needsTls ? { rejectUnauthorized: false } : undefined,
  max: 2,
});

async function waitForDatabase(attempts = 30, delayMs = 2000) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await pool.query("select 1");
      return;
    } catch (err) {
      if (i === attempts) fail(`Could not connect to PostgreSQL after ${attempts} attempts.`, err);
      log(`Database not ready (attempt ${i}/${attempts}); retrying…`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

async function main() {
  await waitForDatabase();
  log("Connected to PostgreSQL.");

  try {
    await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
    log("Migrations are up to date.");
  } catch (err) {
    fail(
      "Migration failed. If this database was created some other way (e.g. `drizzle-kit push`), " +
        "point DATABASE_URL at a fresh database.",
      err
    );
  }

  if (process.env.SEED_DEMO_DATA === "true") {
    const { rows } = await pool.query("select count(*)::int as n from users");
    if (rows[0].n === 0) {
      log("SEED_DEMO_DATA=true and the database is empty — loading demo data once.");
      const result = spawnSync("node_modules/.bin/tsx", ["scripts/seed.ts"], {
        stdio: "inherit",
        env: process.env,
      });
      if (result.status !== 0) fail("Demo-data seeding failed; see the output above.");
      log("Demo data loaded.");
    } else {
      log(`Skipping demo seed: database already has ${rows[0].n} user(s). Existing data untouched.`);
    }
  } else {
    log("Demo seeding disabled (SEED_DEMO_DATA is not 'true').");
  }

  await pool.end();
}

main().catch((err) => fail("Unexpected initialisation error.", err));
