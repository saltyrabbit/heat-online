import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

// The Node build substitutes only the room store; the hosted Worker keeps D1.
let database: DatabaseSync | undefined;
export function getRoomDatabase() {
  if (!database) {
    const file = resolve(process.env.HEAT_DATABASE_PATH || "data/heat.sqlite");
    mkdirSync(dirname(file), { recursive: true });
    database = new DatabaseSync(file);
    database.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS rooms (
        code TEXT PRIMARY KEY NOT NULL, data TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 0, expires INTEGER NOT NULL
      );`);
  }
  const db = database;
  return {
    prepare(sql: string) {
      function bound(values: (string | number | null)[]) {
        return {
          bind(...params: (string | number | null)[]) { return bound(params); },
          async first<T>() { return (db.prepare(sql).get(...values) as T | undefined) ?? null; },
          async run() {
            const result = db.prepare(sql).run(...values);
            return { meta: { changes: Number(result.changes) } };
          },
        };
      }
      return bound([]);
    },
  };
}
