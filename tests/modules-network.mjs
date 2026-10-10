// Run against a started server; these clients only see the same private views
// as browsers, never the server's deck or another seat's hand.
import assert from "node:assert/strict";
import { botChoice, cornerCost, cornerLimit } from "../lib/game.ts";
import { upgrade, speedRange } from "../lib/modules.ts";
import { getTrack } from "../lib/tracks.ts";
const base = process.env.HEAT_TEST_URL || "http://127.0.0.1:5173/heat";
const masks =
  process.env.HEAT_TEST_MASK !== undefined
    ? [Number(process.env.HEAT_TEST_MASK)]
    : [0, 1, 2, 3, 4, 5, 6, 7];
for (const mask of masks) {
  const sessions = [crypto.randomUUID(), crypto.randomUUID()];
  let code,
    operations = 0;
  const exercised = new Set();
  const call = async (i, body) => {
    const response = await fetch(base + "/api/rooms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: "heat_sid=" + sessions[i],
      },
      body: JSON.stringify({ requestId: crypto.randomUUID(), code, ...body }),
    });
    const data = await response.json();
    return { status: response.status, data };
  };
  const get = async (i) => {
    const res = await fetch(base + "/api/rooms?code=" + code, {
      headers: { cookie: "heat_sid=" + sessions[i] },
    });
    assert.equal(res.status, 200);
    return res.json();
  };
  const opts = {
    weather: !!(mask & 1),
    regular: !!(mask & 2),
    advanced: !!(mask & 4),
  };
  const created = await call(0, {
    action: "create",
    name: "扩展网络 A",
    trackId: process.env.HEAT_TEST_TRACK || "france",
    laps: process.env.HEAT_TEST_FORMAL ? 0 : 1,
    modules: opts,
  });
  assert.equal(created.status, 200, JSON.stringify(created));
  code = created.data.code;
  let r = (await call(1, { action: "join", name: "扩展网络 B" })).data;
  const ids = [created.data.me, r.me];
  assert.deepEqual(r.modules, opts);
  const forbidden = await call(1, {
    action: "configure",
    version: r.version,
    trackId: r.trackId,
    laps: r.laps,
    modules: { ...opts, weather: !opts.weather },
  });
  assert.equal(forbidden.status, 400);
  r = (await call(0, { action: "start", version: r.version })).data;
  for (let guard = 0; guard < 3000 && r.phase !== "finished"; guard++) {
    const id =
      r.phase === "draft"
        ? r.garage.queue[0]
        : r.phase === "plan"
          ? r.players.find((p) => !p.rank && !p.plan).id
          : r.turn?.id || r.pendingDiscards.at(-1);
    const i = ids.indexOf(id);
    assert.ok(i >= 0);
    r = await get(i);
    const p = r.players.find((p) => p.id === r.me);
    let body;
    if (r.phase === "draft") {
      assert.equal("deck" in r.garage, false);
      assert.equal(p.hand.length, 0);
      assert.equal(!!r.weather, opts.weather);
      const wrong = await call(1 - i, {
        action: "draft",
        version: r.version,
        cardId: r.garage.market[0].id,
      });
      assert.equal(wrong.status, 400);
      // Prefer versatile effects; the API tests exercise the choices which appear.
      const best = [...r.garage.market].sort((a, b) => {
        const score = (c) => {
          const u = upgrade(c),
            e = u.effects;
          return u.heatCard
            ? -10
            : (e.cool || 0) * 2 +
                (e.salvage || 0) * 3 +
                (e.refresh ? 2 : 0) +
                (e.direct ? 5 : 0) +
                (e.accelerate ? 3 : 0) +
                u.speed.at(-1) / 2;
        };
        return score(b) - score(a);
      })[0];
      body = { action: "draft", cardId: best.id };
      exercised.add("draft");
    } else if (r.phase === "plan") {
      assert.ok(r.players.every((p) => !p.played.length));
      const copy = structuredClone(r),
        me = copy.players.find((p) => p.id === copy.me);
      copy.players.forEach((p) => {
        p.deck = [];
        p.discard = [];
        p.played = [];
      });
      const choice = botChoice(copy, me);
      body = { action: "plan", gear: choice.gear, cards: choice.ids };
    } else if (r.phase === "turn") {
      if (r.pendingDiscards?.includes(p.id)) {
        const track = getTrack(r.trackId),
          corners = Array.from({ length: 3 }, (_, i) =>
            track.corners.map((c) => ({
              ...c,
              at:
                c.at +
                (Math.max(0, Math.floor(p.pos / track.length)) + i) *
                  track.length,
            })),
          ).flat(),
          corner = corners.find(
            (c) => c.at > p.pos && c.at < track.length * r.laps,
          );
        const cards = p.hand
          .filter(
            (c) =>
              c.type === "speed" &&
              ((c.value === 0 && !c.upgrade) ||
                (!p.engine &&
                  corner &&
                  corner.at - p.pos <= speedRange(c)[0] &&
                  speedRange(c)[0] >
                    cornerLimit(r, { played: [] }, corner.at, corner.limit) &&
                  !upgrade(c)?.effects.cool)),
          )
          .map((c) => c.id);
        body = { action: "react", kind: "finish", cards };
      } else if (r.turn.step === "reveal") {
        const variables = p.played.filter((c) => upgrade(c)?.speed.length > 1);
        let choices = [{}];
        for (const c of variables)
          choices = choices.flatMap((v) =>
            upgrade(c).speed.map((speed) => ({ ...v, [c.id]: speed })),
          );
        const score = (v) => {
          const n = r.turn.speed + Object.values(v).reduce((a, b) => a + b, 0);
          return (
            n -
            Math.max(
              0,
              cornerCost(r, p, n, r.turn.start, r.turn.start + n) - p.engine,
            ) *
              15
          );
        };
        choices.sort((a, b) => score(b) - score(a));
        body = {
          action: "react",
          kind: "values",
          options: { values: choices[0] },
        };
        exercised.add("values");
      } else if (r.turn.cool && p.hand.some((c) => c.type === "heat")) {
        body = { action: "react", kind: "cool" };
        exercised.add("cool");
      } else {
        const canUse = (c, k) => !r.turn.effects?.[c.id]?.used.includes(k);
        const reduce = p.played.find(
          (c) =>
            upgrade(c)?.effects.reduce &&
            canUse(c, "reduce") &&
            p.hand.some((x) => x.type === "stress"),
        );
        const salvage = p.played.find(
          (c) =>
            upgrade(c)?.effects.salvage &&
            canUse(c, "salvage") &&
            p.discard.length,
        );
        const refresh = p.played.find(
          (c) =>
            upgrade(c)?.effects.refresh &&
            canUse(c, "refresh") &&
            r.cornerCost <= p.engine,
        );
        const direct = p.hand.find(
          (c) =>
            upgrade(c)?.effects.direct &&
            cornerCost(
              r,
              { ...p, played: [...p.played, c] },
              r.turn.speed + c.value,
              r.turn.start,
              p.pos + c.value,
            ) +
              (upgrade(c).effects.heat || 0) <=
              p.engine,
        );
        if (reduce)
          body = {
            action: "react",
            kind: "effect",
            cards: p.hand
              .filter((c) => c.type === "stress")
              .slice(0, upgrade(reduce).effects.reduce)
              .map((c) => c.id),
            options: { cardId: reduce.id, effect: "reduce" },
          };
        else if (salvage)
          body = {
            action: "react",
            kind: "effect",
            cards: p.discard
              .filter((c) => c.basic && c.value <= 2)
              .slice(0, upgrade(salvage).effects.salvage)
              .map((c) => c.id),
            options: { cardId: salvage.id, effect: "salvage" },
          };
        else if (refresh)
          body = {
            action: "react",
            kind: "effect",
            options: { cardId: refresh.id, effect: "refresh" },
          };
        else if (direct)
          body = {
            action: "react",
            kind: "direct",
            options: { cardId: direct.id },
          };
        else if (r.mandatory.length) {
          const m = r.mandatory[0];
          body = {
            action: "react",
            kind:
              m.effect === "heat" && p.engine < m.amount ? "replace" : "effect",
            options: { cardId: m.cardId, effect: m.effect },
          };
        } else {
          const distance = r.slipDistances
            .filter(
              (n) =>
                cornerCost(r, p, r.turn.speed, r.turn.start, p.pos + n) <=
                p.engine,
            )
            .at(-1);
          body = {
            action: "react",
            kind: distance ? "slip" : "check",
            options: { distance },
          };
        }
        exercised.add(body.kind === "effect" ? body.options.effect : body.kind);
      }
    } else throw new Error("Unexpected phase " + r.phase);
    const response = await call(i, { ...body, version: r.version });
    assert.equal(response.status, 200, JSON.stringify(response));
    r = response.data;
    const observer = await get(1 - i);
    assert.equal(observer.version, r.version);
    assert.deepEqual(observer.actions, r.actions);
    assert.deepEqual(observer.roads, r.roads);
    assert.deepEqual(observer.modules, opts);
    assert.ok(
      observer.players
        .filter((p) => p.id !== observer.me)
        .every((p) => !p.hand.length && !p.discard.length),
    );
    operations++;
  }
  assert.equal(r.phase, "finished", `mask ${mask} stalled round ${r.round}`);
  assert.deepEqual(r.players.map((p) => p.rank).sort(), [1, 2]);
  assert.equal((await get(0)).me, ids[0]);
  assert.equal((await get(1)).me, ids[1]);
  console.log(
    JSON.stringify({
      passed: true,
      mask,
      code,
      rounds: r.round,
      operations,
      exercised: [...exercised],
    }),
  );
}
