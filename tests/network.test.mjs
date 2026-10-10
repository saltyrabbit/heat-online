import assert from "node:assert/strict";
import { getTrack } from "../lib/tracks.ts";
import { botChoice } from "../lib/game.ts";
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
  laps: process.env.HEAT_TEST_FORMAL ? 0 : 1,
  trackId: process.env.HEAT_TEST_TRACK || "usa",
});
assert.equal(created.status, 200, JSON.stringify(created));
let r = created.data;
const code = r.code;
const joined = await call(1, { action: "join", code, name: "网络测试 B" });
assert.equal(joined.status, 200);
r = (await get(0, code)).data;
assert.equal(r.players.length, 2);
assert.equal((await get(2, code)).status, 403);
assert.equal(r.trackId, process.env.HEAT_TEST_TRACK || "usa");
assert.equal(
  r.laps,
  process.env.HEAT_TEST_FORMAL ? getTrack(r.trackId).laps : 1,
);
// Settings are host-only, persisted, and immediately visible to another seat.
const chosenTrack = r.trackId,
  chosenLaps = r.laps;
const forbidden = await call(1, {
  action: "configure",
  code,
  version: r.version,
  trackId: "italy",
  laps: 3,
});
assert.equal(forbidden.status, 400);
const invalid = await call(0, {
  action: "configure",
  code,
  version: r.version,
  trackId: "fake",
  laps: 2,
});
assert.equal(invalid.status, 400);
const configured = await call(0, {
  action: "configure",
  code,
  version: r.version,
  trackId: "italy",
  laps: 2,
});
assert.equal(configured.status, 200);
assert.equal(configured.data.laps, 3);
const synchronized = (await get(1, code)).data;
assert.equal(synchronized.trackId, "italy");
assert.equal(synchronized.laps, 3);
r = (
  await call(0, {
    action: "configure",
    code,
    version: configured.data.version,
    trackId: chosenTrack,
    laps: chosenLaps,
  })
).data;
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
assert.equal(
  (
    await call(0, {
      action: "configure",
      code,
      version: r.version,
      trackId: "france",
      laps: 2,
    })
  ).status,
  400,
);
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
    const choice = botChoice(copy, p);
    const result = await call(i, {
      action: "plan",
      code,
      version: r.version,
      gear: choice.gear,
      cards: choice.ids,
    });
    assert.equal(result.status, 200, JSON.stringify(result));
    r = result.data;
    if (r.phase === "turn") {
      const chosen = (r.actions || []).filter((action) => action.round === r.round && action.kind === "played");
      for (const driver of r.players.filter((p) => !p.rank)) {
        const snapshots = chosen.filter((action) => action.playerId === driver.id);
        assert.equal(snapshots.length, 1);
        assert.ok(snapshots[0].cards.length > 0);
      }
    }
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
  const observer = (await get(1 - i, code)).data;
  assert.equal(observer.version, r.version);
  assert.deepEqual(observer.actions, r.actions);
  assert.deepEqual(observer.reveals, r.reveals);
  assert.ok((observer.actions || []).every((action) => action.round <= observer.round));
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
      "live round action and reveal synchronization",
      "simultaneous chosen-card revelation",
    ],
  }),
);
