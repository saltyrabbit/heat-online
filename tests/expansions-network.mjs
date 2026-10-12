// Nine independent browser identities: capacity, persistent seats and private views.
import assert from "node:assert/strict";
const base = process.env.HEAT_TEST_URL || "http://127.0.0.1:5173/heat";
const sessions = Array.from({ length: 10 }, () => crypto.randomUUID());
let code;
async function call(i, body) {
  const res = await fetch(base + "/api/rooms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: "heat_sid=" + sessions[i],
    },
    body: JSON.stringify({ code, requestId: crypto.randomUUID(), ...body }),
  });
  return { status: res.status, data: await res.json() };
}
async function get(i) {
  const res = await fetch(base + "/api/rooms?code=" + code, {
    headers: { cookie: "heat_sid=" + sessions[i] },
  });
  return { status: res.status, data: await res.json() };
}
const settings = {
  weather: true,
  regular: true,
  advanced: false,
  heavyRain: true,
  tunnelVision: true,
  rockyRoads: true,
};
const created = await call(0, {
  action: "create",
  name: "九席验证 1",
  trackId: "southAfrica",
  modules: settings,
});
assert.equal(created.status, 200);
code = created.data.code;
let r = created.data;
const ids = [r.me];
for (let i = 1; i < 9; i++) {
  const joined = await call(i, { action: "join", name: "九席验证 " + (i + 1) });
  assert.equal(joined.status, 200);
  ids.push(joined.data.me);
  r = joined.data;
}
assert.equal(new Set(r.players.map((p) => p.color)).size, 9);
assert.equal((await call(9, { action: "join", name: "超额席位" })).status, 400);
assert.equal((await get(9)).status, 403);
const configured = await call(0, {
  action: "configure",
  version: r.version,
  trackId: r.trackId,
  laps: r.laps,
  modules: { ...settings, heavyRain: false },
});
assert.equal(configured.status, 400);
assert.deepEqual((await get(0)).data.modules, settings);
assert.equal((await get(0)).data.version, r.version);
assert.equal(
  (await call(1, { action: "start", version: r.version })).status,
  400,
);
r = (await call(0, { action: "start", version: r.version })).data;
assert.equal(r.phase, "draft");
while (r.phase === "draft") {
  const i = ids.indexOf(r.garage.queue[0]);
  const result = await call(i, {
    action: "draft",
    version: r.version,
    cardId: r.garage.market[0].id,
  });
  assert.equal(result.status, 200, JSON.stringify(result));
  r = result.data;
}
assert.equal(r.phase, "plan");
assert.ok(r.players.every((p) => p.upgrades.length === 3));
for (let i = 0; i < 9; i++) {
  const state = (await get(i)).data;
  assert.equal(state.me, ids[i]);
  assert.equal(state.players.find((p) => p.id === ids[i]).hand.length, 7);
  assert.ok(
    state.players
      .filter((p) => p.id !== ids[i])
      .every((p) => !p.hand.length && !("deck" in p) && !p.discard.length),
  );
  const rejoined = await call(i, { action: "join", name: "应保留原昵称" });
  assert.equal(rejoined.status, 200);
  assert.equal(rejoined.data.me, ids[i]);
  assert.equal(rejoined.data.players.length, 9);
}
r = (await get(0)).data;
assert.equal((await call(9, { action: "join", name: "晚到车手" })).status, 400);
assert.equal(
  (
    await call(0, {
      action: "configure",
      version: r.version,
      trackId: "usa",
      laps: 2,
      modules: settings,
    })
  ).status,
  400,
);
for (let i = 0; i < 9; i++) {
  r = (await get(i)).data;
  const p = r.players.find((p) => p.id === ids[i]);
  const chosen = p.hand.find((c) => c.type !== "heat");
  assert.ok(chosen);
  const planned = await call(i, {
    action: "plan",
    version: r.version,
    gear: 1,
    cards: [chosen.id],
  });
  assert.equal(planned.status, 200, JSON.stringify(planned));
  r = planned.data;
  if (i < 8) assert.ok(r.players.every((p) => !p.played.length));
}
assert.equal(r.phase, "turn");
const revealed = r.actions.filter(
  (a) => a.kind === "played" && a.round === r.round,
);
assert.equal(revealed.length, 9);
assert.equal(new Set(revealed.map((a) => a.playerId)).size, 9);
for (let i = 0; i < 9; i++)
  assert.deepEqual((await get(i)).data.actions, r.actions);
console.log(
  JSON.stringify({
    passed: true,
    clients: 9,
    code,
    privacy: true,
    seatsRestored: true,
    capacityAtomic: true,
    regularGarage: true,
    allCardsRevealed: true,
  }),
);
