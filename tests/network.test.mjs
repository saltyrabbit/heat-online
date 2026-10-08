import assert from "node:assert/strict";
import { botPlan } from "../lib/game.ts";
const base = process.env.HEAT_TEST_URL || "http://localhost:5173";
const sessions = [
  crypto.randomUUID(),
  crypto.randomUUID(),
  crypto.randomUUID(),
];
async function call(i, body) {
  const res = await fetch(base + "/api/rooms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: "heat_sid=" + sessions[i],
    },
    body: JSON.stringify({ requestId: crypto.randomUUID(), ...body }),
  });
  return { status: res.status, data: await res.json() };
}
async function get(i, code) {
  const res = await fetch(base + "/api/rooms?code=" + code, {
    headers: { cookie: "heat_sid=" + sessions[i] },
  });
  return { status: res.status, data: await res.json() };
}
const created = await call(0, {
  action: "create",
  name: "网络测试 A",
  laps: 1,
});
assert.equal(created.status, 200, JSON.stringify(created));
let r = created.data;
const code = r.code;
const joined = await call(1, { action: "join", code, name: "网络测试 B" });
assert.equal(joined.status, 200);
r = (await get(0, code)).data;
assert.equal(r.players.length, 2);
assert.equal((await get(2, code)).status, 403);
const sameVersion = r.version;
const simultaneous = await Promise.all([
  call(0, { action: "bot", code, version: sameVersion }),
  call(0, { action: "bot", code, version: sameVersion }),
]);
assert.deepEqual(simultaneous.map((v) => v.status).sort(), [200, 409]);
r = (await get(0, code)).data;
const bot = r.players.find((p) => p.bot);
const remove = await call(0, {
  action: "remove",
  code,
  version: r.version,
  playerId: bot.id,
});
assert.equal(remove.status, 200);
r = remove.data;
const reqId = crypto.randomUUID();
const started = await call(0, {
  action: "start",
  code,
  version: r.version,
  requestId: reqId,
});
assert.equal(started.status, 200);
const duplicate = await call(0, {
  action: "start",
  code,
  version: r.version,
  requestId: reqId,
});
assert.equal(duplicate.status, 200);
assert.equal(duplicate.data.version, started.data.version);
r = started.data;
const ids = [(await get(0, code)).data.me, (await get(1, code)).data.me];
let operations = 0;
for (let guard = 0; guard < 800 && r.phase !== "finished"; guard++) {
  let i;
  if (r.phase === "plan") {
    i = ids.findIndex((id) =>
      r.players.some((p) => p.id === id && !p.plan && !p.rank),
    );
    assert.ok(i >= 0);
    r = (await get(i, code)).data;
    const copy = structuredClone(r),
      p = copy.players.find((p) => p.id === copy.me);
    copy.players.forEach((p) => {
      p.plan = false;
      p.deck = [];
      p.discard = [];
      p.played = [];
    });
    botPlan(copy, p);
    const result = await call(i, {
      action: "plan",
      code,
      version: r.version,
      gear: p.gear,
      cards: p.played.map((c) => c.id),
    });
    assert.equal(result.status, 200, JSON.stringify(result));
    r = result.data;
    assert.ok(
      r.players.filter((p) => p.id !== r.me).every((p) => p.hand.length === 0),
    );
  } else if (r.phase === "turn") {
    i = ids.indexOf(r.turn.id);
    r = (await get(i, code)).data;
    const p = r.players.find((p) => p.id === r.me);
    if (operations === 0) {
      const attacker = await call(1 - i, {
        action: "react",
        kind: "boost",
        code,
        version: r.version,
      });
      assert.equal(attacker.status, 400);
      operations++;
    }
    const kind =
      r.turn.step === "discard"
        ? "finish"
        : r.turn.cool && p.hand.some((c) => c.type === "heat")
          ? "cool"
          : "check";
    const result = await call(i, {
      action: "react",
      kind,
      code,
      version: r.version,
      cards: [],
    });
    assert.equal(result.status, 200, JSON.stringify(result));
    r = result.data;
  } else throw Error("unexpected phase " + r.phase);
  operations++;
}
assert.equal(r.phase, "finished");
assert.deepEqual(r.players.map((p) => p.rank).sort(), [1, 2]);
assert.equal((await get(0, code)).data.me, ids[0]);
assert.equal((await get(1, code)).data.me, ids[1]);
console.log(
  JSON.stringify({
    passed: true,
    code,
    operations,
    rounds: r.round,
    checks: [
      "concurrent writes",
      "idempotent actions",
      "seat recovery",
      "hidden hands",
      "wrong-turn rejection",
      "two-client complete race",
    ],
  }),
);
