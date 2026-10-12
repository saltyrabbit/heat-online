import { test } from "node:test";
import assert from "node:assert/strict";
import {
  room,
  player,
  configure,
  start,
  draft,
  plan,
  react,
  view,
  autoBots,
  makeUpgrade,
  upgradePool,
  shiftCost,
  extraSlips,
  draftMoves,
  cornerCost,
  cornerLimit,
  slipDistances,
  coolAvailable,
} from "../lib/game.ts";
import { getTrack, TRACKS, terrainAt, roadCorners } from "../lib/tracks.ts";
import {
  modules,
  DEFAULT_MODULES,
  UPGRADES,
  maxCars,
  roadAt,
  sectorEffect,
} from "../lib/modules.ts";
import { geometry, innerLane } from "../lib/track-geometry.ts";
import { roundFlowState } from "../lib/round-status.ts";
const card = (value = 0, type = "speed") => ({
  id: crypto.randomUUID(),
  value,
  type,
  basic: type === "speed",
});
const heatTotal = (p) =>
  p.engine +
  [...p.hand, ...p.deck, ...p.discard, ...p.played].filter(
    (c) => c.type === "heat",
  ).length;
function fixture(nums = [], trackId = "usa", pos = 0) {
  const r = room("EXPTEST", "A", "a", 1, trackId);
  r.players.push(player("B", "b", 1), player("C", "c", 2));
  start(r);
  const [p, q, z] = r.players;
  r.phase = "turn";
  r.queue = [p.id, q.id, z.id];
  p.pos = pos;
  p.lane = 0;
  p.gear = 3;
  p.engine = 6;
  p.played = nums.map(makeUpgrade);
  p.hand = [card(0, "heat"), card(0, "stress"), card(2), card(3)];
  p.deck = [card(1), card(2)];
  p.discard = [];
  q.pos = pos + 15;
  z.pos = pos + 25;
  r.turn = {
    id: p.id,
    start: pos,
    speed: 1,
    cool: 1,
    boost: false,
    adrenaline: false,
    slip: false,
    step: "react",
    stress: [],
    plus: 0,
    effects: {},
  };
  return { r, p, q, z };
}
const effect = (r, p, c, k, ids = []) =>
  react(r, p, "effect", ids, { cardId: c.id, effect: k });
const facts = {
  japan: [
    60,
    2,
    7,
    3,
    [
      [11, 4],
      [13, 4],
      [19, 2],
      [46, 5],
      [54, 3],
    ],
  ],
  mexico: [
    60,
    3,
    6,
    2,
    [
      [15, 7],
      [20, 7],
      [39, 6],
      [45, 4],
      [51, 2],
      [52, 2],
    ],
  ],
  spain: [
    109,
    1,
    6,
    3,
    [
      [12, 5],
      [16, 4],
      [30, 4],
      [33, 4],
      [45, 2],
      [66, 5],
      [86, 2],
      [93, 3],
      [96, 4],
      [99, 4],
      [104, 3],
    ],
  ],
  netherlands: [
    55,
    3,
    6,
    3,
    [
      [10, 5],
      [14, 5],
      [17, 3],
      [27, 8],
      [35, 4],
    ],
  ],
  germany: [
    62,
    2,
    5,
    3,
    [
      [12, 5],
      [24, 2],
      [25, 2],
      [38, 6],
      [46, 4],
      [53, 4],
    ],
  ],
  southAfrica: [
    71,
    2,
    7,
    3,
    [
      [12, 4],
      [19, 3],
      [25, 2],
      [35, 6],
      [47, 5],
      [56, 2],
      [63, 4],
    ],
  ],
};
for (const [id, [length, laps, heat, stress, corners]] of Object.entries(
  facts,
)) {
  test(`${id}: board facts, initial decks and periodic geometry`, () => {
    const t = getTrack(id);
    assert.equal(t.length, length);
    assert.equal(t.laps, laps);
    assert.deepEqual(
      t.corners.map((c) => [c.at, c.limit]),
      corners,
    );
    const r = room("SETUP", "A", "a", 0, id);
    r.players.push(player("B", "b", 1));
    start(r);
    for (const p of r.players) {
      assert.equal(p.engine, heat);
      assert.equal(
        [...p.deck, ...p.hand].filter((c) => c.type === "stress").length,
        stress,
      );
      assert.equal(heatTotal(p), heat + 1);
    }
    const g = geometry(t);
    assert.deepEqual(g.point(0), g.point(length));
    assert.deepEqual(g.point(-1), g.point(length - 1));
    for (let i = 0; i < length; i++) {
      const a = g.point(i),
        b = g.point(i + 1);
      assert.ok(Number.isFinite(a.x + a.y + a.angle));
      assert.ok(
        Math.hypot(a.x - b.x, a.y - b.y) > 2,
        `${id} overlapping cells ${i}`,
      );
      assert.ok(
        a.x > 20 && a.x < 820 && a.y > 20 && a.y < 450,
        `${id} bounds ${i}`,
      );
    }
  });
}
test("all 64 module combinations: independent pools and capacity; map enables its own pack", () => {
  const keys = [
    "weather",
    "regular",
    "advanced",
    "heavyRain",
    "tunnelVision",
    "rockyRoads",
  ];
  for (let mask = 0; mask < 64; mask++) {
    const settings = modules(
      Object.fromEntries(keys.map((k, i) => [k, !!(mask & (1 << i))])),
    );
    const pool = upgradePool(settings);
    assert.equal(
      pool.length,
      (settings.regular ? 34 : 0) +
        (settings.advanced
          ? 62 +
            12 *
              (Number(settings.heavyRain) +
                Number(settings.tunnelVision) +
                Number(settings.rockyRoads))
          : 0),
    );
    assert.equal(
      maxCars(settings),
      6 +
        Number(settings.heavyRain) +
        Number(settings.tunnelVision) +
        Number(settings.rockyRoads),
    );
    assert.ok(
      pool.every(
        (c) =>
          !UPGRADES[c.upgrade - 1].pack ||
          settings[UPGRADES[c.upgrade - 1].pack],
      ),
    );
  }
  const r = room("CONFIG", "A", "a");
  configure(r, "japan", 1, {});
  assert.equal(r.modules.heavyRain, true);
  assert.equal(r.modules.tunnelVision, false);
  for (let i = 1; i < 7; i++) r.players.push(player(String(i), String(i), i));
  assert.throws(() => configure(r, "usa", 1, {}), /人数|上限/);
  assert.equal(r.trackId, "japan");
  assert.equal(UPGRADES.length, 66);
  assert.equal(UPGRADES[48].effects.salvage, 4);
  assert.equal(UPGRADES[53].effects.refresh, true);
  assert.deepEqual(UPGRADES[64].speed, [2, 3]);
  assert.deepEqual(UPGRADES[65].speed, [4, 6]);
});
test("Japan flooded spaces: pay only on downshift at round start, on both lanes, including lap wrap", () => {
  const { r, p } = fixture([], "japan", 6);
  r.phase = "plan";
  p.played = [];
  p.hand = [card(1), card(2), card(3)];
  p.gear = 3;
  for (const lane of [0, 1]) {
    p.lane = lane;
    for (const pos of [6, 66]) {
      p.pos = pos;
      assert.equal(shiftCost(r, p, 2), 1);
      assert.equal(shiftCost(r, p, 1), 2);
      assert.equal(shiftCost(r, p, 3), 0);
      assert.equal(shiftCost(r, p, 4), 0);
    }
  }
  p.pos = 5;
  assert.equal(shiftCost(r, p, 2), 0);
  p.pos = 6;
  p.engine = 1;
  assert.throws(() => plan(r, p, 1, [p.hand[0].id]), /热量不足/);
  assert.equal(p.gear, 3);
  assert.equal(p.hand.length, 3);
  plan(
    r,
    p,
    2,
    p.hand.slice(0, 2).map((c) => c.id),
  );
  assert.equal(p.engine, 0);
  assert.equal(p.discard.filter((c) => c.type === "heat").length, 1);
});
test("Spain tunnel prohibits Reduce and cleanup hand discards; permits cool, SuperCool, Scrap and played discard", () => {
  const { r, p } = fixture([50, 51], "spain", 17);
  p.discard = [card(0, "heat")];
  const initial = heatTotal(p);
  assert.throws(
    () =>
      effect(r, p, p.played[0], "reduce", [
        p.hand.find((c) => c.type === "stress").id,
      ]),
    /隧道/,
  );
  react(r, p, "cool");
  effect(r, p, p.played[1], "scrap");
  effect(r, p, p.played[0], "superCool");
  assert.equal(heatTotal(p), initial);
  react(r, p, "check");
  const speed = p.hand.find((c) => c.type === "speed");
  assert.throws(() => react(r, p, "finish", [speed.id]), /隧道/);
  assert.ok(r.pendingDiscards.includes(p.id));
  const upgradeIds = p.played.map((c) => c.id);
  react(r, p, "finish");
  assert.ok(p.hand.some((c) => c.id === speed.id));
  assert.ok(
    upgradeIds.every((id) =>
      [...p.hand, ...p.deck, ...p.discard].some((c) => c.id === id),
    ),
  );
  assert.equal(heatTotal(p), initial);
});
test("SuperCool reads discard, respects amount and no-cooling; effect once, ordinary cooling remains separate", () => {
  const { r, p } = fixture([49]);
  p.discard = [card(0, "heat"), card(0, "heat"), card(4)];
  const initial = heatTotal(p),
    handId = p.hand.find((c) => c.type === "heat").id;
  effect(r, p, p.played[0], "superCool");
  assert.equal(p.engine, 7);
  assert.equal(p.discard.filter((c) => c.type === "heat").length, 1);
  assert.ok(p.hand.some((c) => c.id === handId));
  assert.throws(() => effect(r, p, p.played[0], "superCool"), /已经使用/);
  assert.equal(heatTotal(p), initial);
  const x = fixture([49], "usa", 14);
  x.r.roads = [{ at: 13, kind: "weather" }];
  x.r.weather = { effect: "noCool" };
  assert.throws(() => effect(x.r, x.p, x.p.played[0], "superCool"), /禁止冷却/);
  assert.equal(x.p.engine, 6);
});
test("South Africa gravel is lane specific, pays after played discard before refill, zero Heat ignored, other driver can react", () => {
  const t = getTrack("southAfrica");
  assert.equal(terrainAt(t, 8, 0), undefined);
  assert.equal(terrainAt(t, 8, 1), "gravel");
  assert.equal(terrainAt(t, 79, 1), "gravel");
  for (const [lane, engine, paid] of [
    [0, 2, 0],
    [1, 2, 1],
    [1, 0, 0],
  ]) {
    const { r, p } = fixture([], "southAfrica", 8);
    p.lane = lane;
    p.engine = engine;
    p.played = [card(2)];
    const initial = heatTotal(p);
    react(r, p, "check");
    const current = r.turn?.id;
    assert.notEqual(current, p.id);
    p.deck = [];
    p.discard = [];
    p.hand = [];
    const before = heatTotal(p);
    react(r, p, "finish");
    assert.equal(p.engine, engine - paid);
    assert.equal(heatTotal(p), before);
    assert.equal(r.turn?.id, current);
    if (paid) assert.ok(p.hand.some((c) => c.type === "heat"));
  }
});
test("chicane corner costs share token; sector starts only at exit and no sector effect inside", () => {
  const { r, p } = fixture([], "japan", 9);
  assert.equal(roadCorners(getTrack("japan")).length, 4);
  r.roads = [
    { at: 54, kind: "freeBoost" },
    { at: 13, kind: "weather" },
  ];
  r.weather = { effect: "cool1" };
  assert.equal(sectorEffect(r, 11, getTrack("japan")), undefined);
  assert.equal(sectorEffect(r, 12, getTrack("japan")), undefined);
  assert.equal(sectorEffect(r, 13, getTrack("japan")), "cool1");
  r.roads = [{ at: 13, kind: "limitUp" }];
  assert.equal(roadAt(r, 11).kind, "limitUp");
  assert.equal(cornerLimit(r, p, 11, 4), 5);
  assert.equal(cornerLimit(r, p, 13, 4), 5);
  assert.equal(cornerCost(r, p, 6, 10, 13), 2);
  r.roads = [{ at: 13, kind: "overheat" }];
  assert.equal(cornerCost(r, p, 6, 10, 13), 6);
  for (const id of ["japan", "mexico", "spain", "netherlands", "germany"]) {
    const x = room("ROADSET", "A", "a", 1, id);
    x.players.push(player("B", "b", 1));
    configure(x, id, 1, { weather: true });
    start(x);
    assert.equal(
      x.roads.length,
      getTrack(id).corners.length - getTrack(id).chicanes.length,
    );
    assert.ok(
      x.roads.every(
        (a) => !getTrack(id).chicanes.some(([entry]) => entry === a.at),
      ),
    );
  }
});
test("Draft combines or separates symbols, cannot enter occupied spots, adds movement without speed", () => {
  const { r, p, q, z } = fixture([55, 56]);
  q.pos = 5;
  z.pos = 20;
  const moves = draftMoves(r, p);
  assert.ok(moves.some((m) => m.distance === 4 && m.cardIds.length === 2));
  assert.ok(!moves.some((m) => m.distance === 3));
  react(r, p, "draftMove", [], {
    distance: 4,
    cardIds: p.played.map((c) => c.id),
  });
  assert.equal(p.pos, 4);
  assert.equal(r.turn.speed, 1);
  assert.equal(draftMoves(r, p).length, 0);
  assert.ok(slipDistances(r, p).includes(2));
  assert.throws(
    () =>
      react(r, p, "draftMove", [], {
        distance: 1,
        cardIds: p.played.map((c) => c.id),
      }),
    /牵引无效/,
  );
  const x = fixture([55]);
  x.q.pos = 4;
  x.z.pos = 2;
  assert.equal(
    draftMoves(x.r, x.p).some((m) => m.distance === 3),
    false,
  );
  const y = fixture([56, 56]);
  y.q.pos = 2;
  y.z.pos = 4;
  react(y.r, y.p, "draftMove", [], {
    distance: 1,
    cardIds: [y.p.played[0].id],
  });
  assert.equal(y.p.pos, 1);
  react(y.r, y.p, "adrenaline");
  assert.equal(y.p.pos, 2);
  react(y.r, y.p, "draftMove", [], {
    distance: 1,
    cardIds: [y.p.played[1].id],
  });
  assert.equal(y.p.pos, 3);
});
test("Draft can cross final finish; can land behind a car on another lap; direct Front Wing usable in reaction", () => {
  const { r, p, q } = fixture([55], "usa", 68);
  q.pos = 71;
  const speed = r.turn.speed;
  react(r, p, "draftMove", [], { distance: 2, cardIds: [p.played[0].id] });
  assert.equal(p.pos, 70);
  assert.equal(r.turn.speed, speed);
  const x = fixture([]);
  x.p.hand.push(makeUpgrade(56));
  x.q.pos = 3;
  const c = x.p.hand.at(-1);
  react(x.r, x.p, "direct", [], { cardId: c.id });
  assert.ok(x.p.played.includes(c));
  assert.ok(draftMoves(x.r, x.p).length === 0);
  x.q.pos = 2;
  assert.equal(draftMoves(x.r, x.p).length, 1);
});
test("Extra Slipstream chains in Step 6, bonuses apply again and weather recalculated, corners checked once at end", () => {
  const { r, p, q, z } = fixture([62, 63], "usa", 9);
  q.pos = 10;
  z.pos = 13;
  r.roads = [{ at: 13, kind: "weather" }];
  r.weather = { effect: "slip2" };
  r.turn.speed = 3;
  react(r, p, "slip", [], { distance: 3 });
  assert.equal(p.pos, 12);
  assert.equal(r.turn.step, "slip");
  assert.equal(r.turn.slips, 1);
  assert.equal(extraSlips(p), 2);
  assert.equal(r.turn.speed, 3);
  assert.ok(roundFlowState({ ...r, me: p.id }).labels[6]);
  assert.throws(() => react(r, p, "boost"), /连续尾流/);
  assert.ok(slipDistances(r, p).includes(3));
  // A rival ahead at the next position allows the second chain.
  q.pos = 16;
  z.pos = 13;
  react(r, p, "slip", [], { distance: 3 });
  assert.equal(p.pos, 15);
  assert.equal(r.turn.step, "slip");
  assert.deepEqual(slipDistances(r, p), [2, 3, 4, 5]);
  react(r, p, "slip", [], { distance: 5 });
  assert.equal(p.pos, 20);
  assert.ok(r.pendingDiscards.includes(p.id));
  assert.equal(
    r.actions.filter(
      (a) => a.playerId === p.id && a.text.includes("完成弯道检查"),
    ).length,
    1,
  );
});
test("Extra Slipstream can decline; no-slip, no rival and final-finish restriction apply each time", () => {
  for (const type of ["decline", "noSlip", "finish"]) {
    const { r, p, q, z } = fixture([62], "usa", type === "finish" ? 65 : 9);
    q.pos = p.pos + 1;
    z.pos = type === "finish" ? 67 : 13;
    react(r, p, "slip", [], { distance: 2 });
    if (r.turn?.id !== p.id) continue;
    if (type === "noSlip") {
      r.roads = [{ at: 13, kind: "weather" }];
      r.weather = { effect: "noSlip" };
      p.pos = 13;
      assert.deepEqual(slipDistances(r, p), []);
      assert.throws(() => react(r, p, "slip", [], { distance: 2 }), /不能尾流/);
    }
    if (type === "finish") assert.deepEqual(slipDistances(r, p), []);
    react(r, p, "check");
    assert.ok(r.pendingDiscards.includes(p.id));
  }
});
for (const id of Object.keys(facts))
  test(`${id}: nine cars with all upgrades and weather complete official races and conserve cards`, () => {
    for (let race = 0; race < 4; race++) {
      const r = room("FULLPACK", "A", "a", 0, id);
      configure(r, id, 0, {
        weather: true,
        regular: true,
        advanced: true,
        heavyRain: true,
        tunnelVision: true,
        rockyRoads: true,
      });
      r.players[0].bot = true;
      for (let i = 1; i < 9; i++)
        r.players.push(player(String(i), String(i), i, true));
      start(r);
      assert.equal(new Set(r.players.map((p) => p.color)).size, 9);
      let initial;
      for (let guard = 0; guard < 100 && r.phase !== "finished"; guard++) {
        autoBots(r);
        if (!initial && r.phase !== "draft")
          initial = new Map(r.players.map((p) => [p.id, heatTotal(p)]));
        if (initial)
          for (const p of r.players) {
            assert.equal(
              heatTotal(p),
              initial.get(p.id),
              `Heat loss ${id} ${r.round}`,
            );
            const ids = [...p.hand, ...p.deck, ...p.discard, ...p.played].map(
              (c) => c.id,
            );
            assert.equal(new Set(ids).size, ids.length);
          }
      }
      for (const p of r.players)
        assert.equal(
          heatTotal(p),
          (getTrack(id).engine ?? 6) +
            (r.weather?.engine || 0) +
            p.upgrades.filter((c) => c.type === "heat").length,
          `Heat conserved ${id}`,
        );
      assert.equal(r.phase, "finished", `${id} race ${race}, round ${r.round}`);
      assert.deepEqual(
        r.players.map((p) => p.rank).sort((a, b) => a - b),
        [1, 2, 3, 4, 5, 6, 7, 8, 9],
      );
    }
  });
