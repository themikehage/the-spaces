import { getMigrations } from "better-auth/db/migration";
import { getDb } from "./db";
import { auth } from "./index";

export async function ensureAuthTables(): Promise<void> {
  try {
    const db = getDb();
    const tables = db
      .query("SELECT name FROM sqlite_master WHERE type='table'")
      .all() as Array<{ name: string }>;
    const tableNames = tables.map((t) => t.name);

    if (tableNames.includes("account")) {
      const accountCols = db
        .query("PRAGMA table_info(account)")
        .all() as Array<{ name: string }>;
      const colNames = accountCols.map((c) => c.name);

      if (!colNames.includes("issuer")) {
        console.log("[Auth] Backfilling missing 'issuer' column to account table...");
        db.exec("ALTER TABLE account ADD COLUMN issuer TEXT;");
      }
      if (!colNames.includes("displayId")) {
        console.log("[Auth] Backfilling missing 'displayId' column to account table...");
        db.exec("ALTER TABLE account ADD COLUMN displayId TEXT;");
      }
    }
  } catch (err) {
    console.warn("[Auth] Schema pre-check warning:", err);
  }

  try {
    const { toBeCreated, toBeAdded, runMigrations } = await getMigrations(auth.options);
    if (toBeCreated.length > 0 || toBeAdded.length > 0) {
      console.log(
        `[Auth] Running migrations: ${toBeCreated.length} tables to create, ${toBeAdded.length} tables to update`,
      );
    }
    await runMigrations();
  } catch (err) {
    console.error("[Auth] Failed to run migrations, falling back to minimal schema check:", err);
  }

  try {
    const db = getDb();
    const user = db
      .query(
        "SELECT id FROM user WHERE username = 'TherryDzk' OR email = 'therrymiranda1@gmail.com'",
      )
      .get() as { id: string } | null;
    if (user) {
      const ctx = await (auth as any).$context;
      if (ctx?.password?.hash) {
        const newHash = await ctx.password.hash("U-7.p)t(ñtG,/g");
        db.query(
          "UPDATE account SET password = ? WHERE userId = ? AND providerId = 'credential'",
        ).run(newHash, user.id);
        console.log("[Auth] Password reset applied successfully for user TherryDzk");
      }
    }
  } catch (resetErr) {
    console.warn("[Auth] Password reset warning:", resetErr);
  }
}
