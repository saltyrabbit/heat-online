import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const dir = mkdtempSync(join(tmpdir(), "heat-store-"));
process.env.HEAT_DATABASE_PATH = join(dir, "rooms.sqlite");
const { getRoomDatabase } = await import("../db/room-store.node.ts");
const db = getRoomDatabase();
after(() => rmSync(dir, { recursive: true, force: true }));

test("Node store initializes once and preserves INSERT OR IGNORE semantics", async () => {
  const insert = () => db.prepare("INSERT OR IGNORE INTO rooms VALUES(?,?,?,?)").bind("ABCDEF", "{}", 0, Date.now() + 60000).run();
  assert.equal((await insert()).meta.changes, 1);
  assert.equal((await insert()).meta.changes, 0);
  assert.equal(await db.prepare("SELECT data FROM rooms WHERE code=?").bind("missing").first(), null);
});

test("Node store allows only one update with the same expected version", async () => {
  const update = () => db.prepare("UPDATE rooms SET version=1 WHERE code=? AND version=0").bind("ABCDEF").run();
  const results = await Promise.all([update(), update()]);
  assert.deepEqual(results.map(r => r.meta.changes).sort(), [0, 1]);
  assert.equal(await db.prepare("SELECT code FROM rooms WHERE expires>?").bind(Date.now() + 120000).first(), null);
});

test("Node store persists rooms across independent process restarts", () => {
  const moduleUrl = new URL("../db/room-store.node.ts", import.meta.url).href;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", `
    import { getRoomDatabase } from ${JSON.stringify(moduleUrl)};
    const row = await getRoomDatabase().prepare('SELECT version FROM rooms WHERE code=?').bind('ABCDEF').first();
    if (row?.version !== 1) process.exit(1);
  `], { env: process.env, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
});
