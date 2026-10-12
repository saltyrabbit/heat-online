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
  botChoice,
  makeUpgrade,
  upgradePool,
  cornerCost,
  cornerLimit,
  boostCost,
  coolAvailable,
  slipDistances,
  canSlip,
  mandatoryPending,
} from "../lib/game.ts";
import {
  DEFAULT_MODULES,
  UPGRADES,
  WEATHERS,
  ROAD_KINDS,
  sector,
  sectorEffect,
  modules,
  upgrade,
} from "../lib/modules.ts";
import { getTrack } from "../lib/tracks.ts";
import { roundFlowState } from "../lib/round-status.ts";
const card = (value = 0, type = "speed", basic = true) => ({
  id: crypto.randomUUID(),
  value,
  type,
  basic,
});
function setup(settings = {}, n = 2, track = "usa") {
  const r = room("MODULE", "A", "a", 1, track);
  r.players.push(
    ...Array.from({ length: n - 1 }, (_, i) => player("P" + i, "p" + i, i + 1)),
  );
  configure(r, track, 1, { ...DEFAULT_MODULES, ...settings });
  start(r);
  return r;
}
function finishDraft(r) {
  while (r.phase === "draft") {
    const p = r.players.find((p) => p.id === r.garage.queue[0]);
    draft(r, p, r.garage.market[0].id);
  }
  return r;
}
function fixture(nums = [], pos = 0) {
  const r = setup(),
    p = r.players[0],
    q = r.players[1];
  r.phase = "turn";
  r.queue = [p.id, q.id];
  q.pos = 30;
  p.pos = pos;
  p.gear = 3;
  p.played = nums.map(makeUpgrade);
  p.hand = [
    card(0, "heat"),
    card(0, "heat"),
    card(0, "heat"),
    card(0, "stress"),
    card(0, "stress"),
    card(4),
  ];
  p.deck = [card(1), card(2), card(3), card(4)];
  p.discard = [];
  p.engine = 6;
  p.refreshIds = [];
  q.played = [card(1)];
  r.turn = {
    id: p.id,
    start: pos,
    speed: p.played.reduce((n, c) => n + c.value, 0),
    cool: 0,
    boost: false,
    adrenaline: true,
    slip: false,
    step: "react",
    stress: [],
    plus: 0,
    effects: {},
  };
  return { r, p, q };
}
const effect = (r, p, c, kind, ids = []) =>
  react(r, p, "effect", ids, { cardId: c.id, effect: kind });
const physicalHeat = (p) =>
  p.engine +
  [...p.deck, ...p.discard, ...p.hand, ...p.played].filter(
    (c) => c.type === "heat",
  ).length;

test("all 8 module combinations are independent and legacy rooms default off", () => {
  for (let mask = 0; mask < 8; mask++) {
    const opts = {
        weather: !!(mask & 1),
        regular: !!(mask & 2),
        advanced: !!(mask & 4),
      },
      r = setup(opts);
    assert.deepEqual(r.modules, { ...DEFAULT_MODULES, ...opts });
    assert.equal(!!r.weather, opts.weather);
    assert.equal(r.phase, opts.regular || opts.advanced ? "draft" : "plan");
  }
  const r = setup();
  delete r.modules;
  assert.deepEqual(view(r, r.players[0].token).modules, DEFAULT_MODULES);
  assert.throws(() => modules({ advanced: 1 }));
  assert.throws(() => modules({ championship: true }));
});
test("official card sets: regular 1–17 twice, advanced 18–48 twice, mixed 96; card-sheet corrections retained", () => {
  assert.equal(UPGRADES.filter((u) => !u.pack).length, 48);
  for (const [opts, count, min, max] of [
    [{ regular: true }, 34, 1, 17],
    [{ advanced: true }, 62, 18, 48],
    [{ regular: true, advanced: true }, 96, 1, 48],
  ]) {
    const pool = upgradePool({ ...DEFAULT_MODULES, ...opts });
    assert.equal(pool.length, count);
    for (let i = min; i <= max; i++)
      assert.equal(pool.filter((c) => c.upgrade === i).length, 2);
    assert.equal(new Set(pool.map((c) => c.id)).size, count);
  }
  assert.equal(UPGRADES[13].effects.slip, 2);
  assert.equal(UPGRADES[18].effects.cool, 1);
  assert.equal(makeUpgrade(17).type, "heat");
  assert.equal(makeUpgrade(48).type, "heat");
});
test("weather cards use official pairings, including cloudy less Stress and freezing less engine Heat", () => {
  assert.deepEqual(
    WEATHERS.map((w) => [
      w.id,
      w.stress,
      w.engine,
      w.deckHeat,
      w.discardHeat,
      w.effect,
    ]),
    [
      ["cloudy", -1, 0, 0, 0, "noCool"],
      ["fog", 0, 1, 0, 0, "noSlip"],
      ["heavy-rain", 1, 0, 0, 0, "slip2"],
      ["freezing", 0, -1, 0, 0, "cool1"],
      ["rain", 0, 0, 3, 0, "cool1"],
      ["sun", 0, 0, 0, 3, "slip2"],
    ],
  );
});
for (const w of WEATHERS)
  test(`official setup ${w.id}: engine, deck, discard and Stress are adjusted before the first draw`, () => {
    const r = setup({ weather: true, regular: true });
    r.weather = w;
    finishDraft(r);
    for (const p of r.players) {
      const cards = [...p.deck, ...p.hand, ...p.discard];
      assert.equal(p.engine, 6 + w.engine - w.deckHeat - w.discardHeat);
      assert.equal(p.discard.length, w.discardHeat);
      assert.equal(
        cards.filter((c) => c.type === "stress").length,
        3 + w.stress,
      );
      assert.equal(p.hand.length, 7);
      assert.equal(
        physicalHeat(p),
        6 + w.engine + p.upgrades.filter((c) => c.type === "heat").length,
      );
    }
  });
test("weather and roads are revealed before draft; road tokens are drawn without replacement from two of each", () => {
  for (let i = 0; i < 40; i++) {
    const r = setup({ weather: true, advanced: true }, 6, "france");
    assert.ok(r.weather);
    assert.equal(r.roads.length, getTrack("france").corners.length);
    for (const kind of ROAD_KINDS)
      assert.ok(r.roads.filter((t) => t.kind === kind).length <= 2);
    assert.deepEqual(
      r.roads.map((t) => t.at),
      getTrack("france").corners.map((c) => c.at),
    );
    assert.equal(r.players[0].hand.length, 0);
  }
});
test("draft has N+3 new cards per round, correct snake order and exactly three upgrades replacing starting cards", () => {
  for (const n of [2, 6]) {
    const r = setup({ regular: true, advanced: true }, n),
      grid = r.players.map((p) => p.id),
      initial = r.garage.deck.length + r.garage.market.length;
    const seen = new Set();
    for (let round = 1; round <= 3; round++) {
      assert.equal(r.garage.round, round);
      assert.equal(r.garage.market.length, n + 3);
      assert.deepEqual(
        r.garage.queue,
        round === 2 ? grid : [...grid].reverse(),
      );
      for (const c of r.garage.market) {
        assert.ok(!seen.has(c.id));
        seen.add(c.id);
      }
      for (const id of [...r.garage.queue])
        draft(
          r,
          r.players.find((p) => p.id === id),
          r.garage.market[0].id,
        );
    }
    assert.equal(seen.size, 3 * (n + 3));
    assert.equal(initial, 96);
    assert.equal(r.phase, "plan");
    for (const p of r.players) {
      assert.equal(p.upgrades.length, 3);
      const cards = [...p.hand, ...p.deck];
      assert.equal(cards.length, 18);
      assert.equal(cards.filter((c) => c.upgrade).length, 3);
      assert.equal(cards.filter((c) => c.basic).length, 12);
      assert.equal(
        cards.filter((c) => !c.basic && !c.upgrade && c.type === "speed")
          .length,
        0,
      );
    }
  }
});
test("draft rejects wrong player, duplicate pick, arbitrary cards and configure after start; view hides pool and private piles", () => {
  const r = setup({ advanced: true }),
    p = r.players.find((p) => p.id === r.garage.queue[0]),
    other = r.players.find((q) => q.id !== p.id);
  assert.throws(() => draft(r, other, r.garage.market[0].id));
  assert.throws(() => draft(r, p, "fake"));
  const chosen = r.garage.market[0].id;
  draft(r, p, chosen);
  assert.throws(() => draft(r, other, chosen));
  assert.throws(() => configure(r, "usa", 1));
  const v = view(r, p.token);
  assert.ok(!("deck" in v.garage));
  assert.ok(!JSON.stringify(v).includes('"token"'));
  finishDraft(r);
  const x = view(r, p.token);
  assert.deepEqual(x.players.find((q) => q.id === other.id).discard, []);
  assert.deepEqual(x.players.find((q) => q.id === other.id).hand, []);
});
test("sector boundaries include this corner, exclude next, wrap finish and negative grid positions", () => {
  const r = setup({ weather: true }),
    track = getTrack("usa");
  r.roads = track.corners.map((c, i) => ({
    at: c.at,
    kind: i === 0 ? "weather" : "freeBoost",
  }));
  r.weather = WEATHERS[0];
  const first = track.corners[0].at,
    last = track.corners.at(-1).at;
  assert.equal(sector(r, first - 1, track).at, last);
  assert.equal(sector(r, first, track).at, first);
  assert.equal(sector(r, track.corners[1].at - 1, track).at, first);
  assert.equal(sector(r, track.corners[1].at, track).at, track.corners[1].at);
  assert.equal(sector(r, -1, track).at, last);
  assert.equal(sectorEffect(r, first, track), "noCool");
});
test("corner +1/-1 and personal modifiers stack, apply only to this driver, on every crossed line", () => {
  const { r, p, q } = fixture([37, 41]),
    track = getTrack("usa"),
    c = track.corners[0];
  r.roads = [{ at: c.at, kind: "limitDown" }];
  assert.equal(cornerLimit(r, p, c.at, c.limit), c.limit + 2);
  assert.equal(cornerLimit(r, q, c.at, c.limit), c.limit - 1);
  assert.equal(cornerCost(r, p, c.limit + 3, c.at - 1, c.at), 1);
  r.roads[0].kind = "limitUp";
  assert.equal(cornerCost(r, p, c.limit + 3, c.at - 1, c.at), 0);
  r.roads = [];
  assert.equal(
    cornerCost(r, p, 20, 0, track.corners[1].at),
    track.corners.slice(0, 2).reduce((n, c) => n + 20 - c.limit - 3, 0),
  );
});
test("overheat adds one only when exceeding the modified limit, including personal modifiers", () => {
  const { r, p } = fixture([37]),
    c = getTrack("usa").corners[0];
  r.roads = [{ at: c.at, kind: "overheat" }];
  assert.equal(cornerCost(r, p, c.limit + 1, c.at - 1, c.at), 0);
  assert.equal(cornerCost(r, p, c.limit + 2, c.at - 1, c.at), 2);
});
test("no-cooling weather blocks gear, adrenaline and upgrade; moving out restores unused cooling", () => {
  const { r, p } = fixture([3], getTrack("usa").corners[0].at);
  r.turn.cool = 4;
  r.weather = WEATHERS[0];
  r.roads = [
    { at: getTrack("usa").corners[0].at, kind: "weather" },
    { at: getTrack("usa").corners[1].at, kind: "freeBoost" },
  ];
  assert.equal(coolAvailable(r, p), 0);
  assert.throws(() => react(r, p, "cool"));
  p.pos = getTrack("usa").corners[1].at;
  assert.equal(coolAvailable(r, p), 7);
  react(r, p, "cool");
  assert.equal(r.turn.cool, 3);
  assert.equal(p.engine, 7);
});
test("weather cooldown is once per turn even if re-entering, can be used in third gear after movement", () => {
  const { r, p } = fixture([], getTrack("usa").corners[0].at);
  r.weather = WEATHERS[3];
  r.roads = [{ at: getTrack("usa").corners[0].at, kind: "weather" }];
  assert.equal(coolAvailable(r, p), 1);
  react(r, p, "cool");
  assert.equal(coolAvailable(r, p), 0);
  p.pos += getTrack("usa").length;
  assert.equal(coolAvailable(r, p), 0);
});
test("sector free boost costs zero at action position but remains once per turn and performs real flip", () => {
  const { r, p } = fixture([], getTrack("usa").corners[0].at);
  r.roads = [{ at: getTrack("usa").corners[0].at, kind: "freeBoost" }];
  p.engine = 0;
  assert.equal(boostCost(r, p), 0);
  react(r, p, "boost");
  assert.equal(p.engine, 0);
  assert.equal(r.turn.speed, 4);
  assert.equal(r.reveals.at(-1).value, 4);
  assert.throws(() => react(r, p, "boost"));
  p.pos = 0;
  assert.equal(boostCost(r, p), 1);
});
test("upgrade slip symbols and road/weather bonuses are optional whole increments and combine, never increase speed", () => {
  const { r, p, q } = fixture([15, 29], getTrack("usa").corners[0].at);
  q.pos = p.pos + 1;
  r.roads = [{ at: getTrack("usa").corners[0].at, kind: "weather" }];
  r.weather = WEATHERS[2];
  assert.deepEqual(slipDistances(r, p), [2, 4, 5, 6, 7, 9]);
  const pos = p.pos,
    speed = r.turn.speed;
  react(r, p, "slip", [], { distance: 9 });
  assert.equal(p.pos, pos + 9);
  assert.equal(p.played.length, 2);
  assert.equal(
    r.actions
      .find((x) => x.playerId === p.id && x.kind === "slip")
      .text.includes("9"),
    true,
  );
  assert.equal(speed, 2);
});
test("fog prohibits slip from sector, but allows entering it; finish restriction covers all boosted distances", () => {
  const { r, p, q } = fixture([15], getTrack("usa").corners[0].at);
  q.pos = p.pos + 1;
  r.roads = [{ at: p.pos, kind: "weather" }];
  r.weather = WEATHERS[1];
  assert.equal(canSlip(r, p), false);
  assert.deepEqual(slipDistances(r, p), []);
  assert.throws(() => react(r, p, "slip"));
  r.weather = WEATHERS[2];
  p.pos = getTrack("usa").length - 3;
  q.pos = p.pos;
  assert.deepEqual(slipDistances(r, p), [2]);
});
test("upgrade plus flips all skipped cards and resolves each symbol before variable speed decision/movement", () => {
  const r = setup(),
    p = r.players[0],
    q = r.players[1];
  p.pos = 0;
  q.pos = -1;
  r.queue = [p.id, q.id];
  p.gear = 2;
  p.hand = [makeUpgrade(2), makeUpgrade(8), card(0, "heat")];
  p.deck = [
    card(2),
    card(3),
    card(4),
    makeUpgrade(34),
    card(0, "heat"),
    card(0, "stress"),
  ];
  q.hand = [card(1)];
  plan(
    r,
    p,
    2,
    p.hand.slice(0, 2).map((c) => c.id),
  );
  plan(r, q, 1, [q.hand[0].id]);
  assert.equal(r.turn.step, "reveal");
  assert.equal(r.turn.plus, 3);
  assert.equal(r.turn.speed, 9);
  assert.equal(p.pos, 0);
  assert.equal(r.reveals.length, 3);
  assert.equal(r.reveals[0].cards.length, 4);
  assert.throws(() => react(r, p, "boost"));
  assert.throws(() =>
    react(r, p, "values", [], { values: { [p.played[1].id]: 5 } }),
  );
  react(r, p, "values", [], { values: { [p.played[1].id]: 1 } });
  assert.equal(r.turn.step, "react");
  assert.equal(r.turn.speed, 10);
  assert.equal(p.pos, 10);
  assert.ok(roundFlowState({ ...view(r, p.token) }).labels[5]);
});
test("variable choice stage is highlighted as official step 3, not reaction step 5", () => {
  const { r, p } = fixture([8]);
  r.turn.step = "reveal";
  const flow = roundFlowState(view(r, p.token));
  assert.ok(flow.labels[3]);
  assert.equal(flow.labels[5], undefined);
});
test("cooldown may precede mandatory Heat payment; symbols can be ordered and cannot replay", () => {
  const { r, p } = fixture([42]);
  p.engine = 0;
  react(r, p, "cool");
  react(r, p, "cool");
  const u = p.played[0];
  assert.equal(p.engine, 2);
  assert.throws(() => react(r, p, "check"));
  effect(r, p, u, "heat");
  assert.equal(p.engine, 0);
  assert.equal(mandatoryPending(p, r.turn).length, 0);
  assert.throws(() => effect(r, p, u, "heat"));
  assert.equal(coolAvailable(r, p), 1);
});
test("Scrap reshuffles during repeated top-deck discards; can precede Salvage", () => {
  const { r, p } = fixture([43, 22]);
  p.deck = [card(1)];
  p.discard = [card(2)];
  const original = new Set([...p.deck, ...p.discard].map((c) => c.id));
  effect(r, p, p.played[0], "scrap");
  assert.equal(p.deck.length + p.discard.length, 2);
  assert.deepEqual(
    new Set([...p.deck, ...p.discard].map((c) => c.id)),
    original,
  );
  const selected = p.discard.slice(0, 2).map((c) => c.id);
  effect(r, p, p.played[1], "salvage", selected);
  assert.equal(p.discard.length, 0);
  assert.equal(p.deck.length, 2);
});
test("Salvage chooses from own entire discard, shuffles into deck and rejects hand/opponent/arbitrary/too many ids", () => {
  const { r, p } = fixture([22]);
  p.discard = [card(0, "heat"), makeUpgrade(34), card(1)];
  const u = p.played[0],
    before = p.deck.length;
  assert.throws(() => effect(r, p, u, "salvage", [p.hand[0].id]));
  assert.throws(() =>
    effect(
      r,
      p,
      u,
      "salvage",
      p.discard.map((c) => c.id),
    ),
  );
  const chosen = p.discard.slice(0, 2).map((c) => c.id);
  effect(r, p, u, "salvage", chosen);
  assert.equal(p.deck.length, before + 2);
  assert.equal(p.discard.length, 1);
  assert.ok(chosen.every((id) => p.deck.some((c) => c.id === id)));
  assert.throws(() => effect(r, p, u, "salvage", []));
});
test("Reduce Stress is optional up to the printed amount, only removes selected Stress hand cards", () => {
  const { r, p } = fixture([4]);
  const u = p.played[0];
  assert.throws(() => effect(r, p, u, "reduce", [p.hand[0].id]));
  const id = p.hand.find((c) => c.type === "stress").id;
  effect(r, p, u, "reduce", [id]);
  assert.ok(p.discard.some((c) => c.id === id));
  assert.equal(p.hand.filter((c) => c.type === "stress").length, 1);
});
test("Direct Play adds real speed, plays all mandatory/optional symbols, and is outside gear count", () => {
  const { r, p } = fixture([], 0);
  p.gear = 4;
  const u = makeUpgrade(27);
  p.hand.push(u);
  const before = p.hand.length;
  react(r, p, "direct", [], { cardId: u.id });
  assert.equal(p.pos, 4);
  assert.equal(r.turn.speed, 4);
  assert.equal(p.hand.length, before - 1);
  assert.equal(p.played[0].id, u.id);
  assert.equal(coolAvailable(r, p), 1);
  assert.throws(() => react(r, p, "check"));
  react(r, p, "cool");
  effect(r, p, u, "heat");
  assert.equal(p.engine, 6);
  assert.throws(() => react(r, p, "direct", [], { cardId: u.id }));
  assert.throws(() =>
    react(r, p, "direct", [], {
      cardId: p.hand.find((c) => c.type === "speed").id,
    }),
  );
});
test("Accelerate counts symbols already used and future Boost, allows stacking across distinct played upgrades", () => {
  const { r, p } = fixture([47]);
  r.turn.plus = 2;
  r.turn.speed = 5;
  p.pos = 5;
  effect(r, p, p.played[0], "accelerate");
  assert.equal(p.pos, 7);
  assert.equal(r.turn.speed, 7);
  react(r, p, "boost");
  assert.equal(r.turn.plus, 3);
  assert.equal(p.pos, 12);
  assert.equal(r.turn.speed, 12);
  const u = makeUpgrade(28);
  p.hand.push(u);
  react(r, p, "direct", [], { cardId: u.id });
  effect(r, p, u, "accelerate");
  assert.equal(r.turn.speed, 16);
  assert.equal(p.pos, 16);
  assert.throws(() => effect(r, p, u, "accelerate"));
});
test("unpayable upgrade is replaced by random Basic, cancels its limit and mandatory Scrap and cannot replace affordable cards", () => {
  const { r, p } = fixture([44], 4),
    u = p.played[0];
  p.engine = 0;
  p.deck = [card(3), makeUpgrade(34)];
  const oldlimit = cornerLimit(r, p, 18, 4);
  react(r, p, "replace", [], { cardId: u.id });
  assert.equal(p.pos, 3);
  assert.equal(r.turn.speed, 3);
  assert.equal(cornerLimit(r, p, 18, 4), oldlimit - 2);
  assert.equal(mandatoryPending(p, r.turn).length, 0);
  assert.ok(p.discard.some((c) => c.id === u.id));
  assert.ok(r.reveals.at(-1).cards.some((c) => c.upgrade === 34));
  const x = fixture([42]);
  assert.throws(() =>
    react(x.r, x.p, "replace", [], { cardId: x.p.played[0].id }),
  );
});
test("Refresh decisions survive handoff, draw in chosen order before discard reshuffle and do not change next driver", () => {
  const { r, p, q } = fixture([32, 34]);
  p.hand = p.hand.slice(0, 5);
  const ids = p.played.map((c) => c.id);
  effect(r, p, p.played[1], "refresh");
  effect(r, p, p.played[0], "refresh");
  react(r, p, "check");
  assert.equal(r.turn.id, q.id);
  const next = structuredClone(r.turn),
    pos = q.pos;
  react(r, p, "finish");
  assert.deepEqual(r.turn, next);
  assert.equal(q.pos, pos);
  assert.deepEqual(
    p.hand.slice(-2).map((c) => c.id),
    [ids[1], ids[0]],
  );
  assert.equal(p.refreshIds.length, 0);
  assert.equal(p.discard.filter((c) => ids.includes(c.id)).length, 0);
});
test("ordinary upgrades remain discardable but extra Heat and Stress do not; variable values reset for later cycles", () => {
  const { r, p } = fixture([8]);
  p.played[0].value = 3;
  p.hand.push(makeUpgrade(17));
  react(r, p, "check");
  assert.throws(() =>
    react(r, p, "finish", [p.hand.find((c) => c.upgrade === 17).id]),
  );
  react(r, p, "finish");
  assert.ok(
    [...p.hand, ...p.deck, ...p.discard].some(
      (c) => c.upgrade === 8 && c.value === 1,
    ),
  );
});
for (const number of [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 18, 19, 20, 21, 22, 23,
  24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42,
  43, 44, 45, 46, 47,
])
  test(`upgrade #${number}: reveal, legal reactions, mandatory costs and cleanup complete`, () => {
    const r = setup(),
      p = r.players[0],
      q = r.players[1];
    r.queue = [p.id, q.id];
    p.hand = [makeUpgrade(number), card(0, "heat"), card(0, "stress"), card(4)];
    p.deck = Array.from({ length: 12 }, (_, i) => card((i % 4) + 1));
    q.hand = [card(1)];
    p.pos = 0;
    q.pos = -1;
    plan(r, p, 1, [p.hand[0].id]);
    plan(r, q, 1, [q.hand[0].id]);
    if (r.turn.step === "reveal")
      react(r, p, "values", [], {
        values: Object.fromEntries(
          p.played
            .filter((c) => upgrade(c)?.speed.length > 1)
            .map((c) => [c.id, upgrade(c).speed.at(-1)]),
        ),
      });
    const u = p.played.find((c) => c.upgrade === number),
      e = upgrade(u).effects;
    for (const kind of ["reduce", "salvage", "refresh", "accelerate"])
      if (e[kind])
        effect(
          r,
          p,
          u,
          kind,
          kind === "reduce"
            ? p.hand
                .filter((c) => c.type === "stress")
                .slice(0, e.reduce)
                .map((c) => c.id)
            : [],
        );
    while (coolAvailable(r, p) && p.hand.some((c) => c.type === "heat"))
      react(r, p, "cool");
    for (const m of mandatoryPending(p, r.turn)) effect(r, p, u, m.effect);
    react(r, p, "check");
    react(r, p, "finish");
    assert.equal(p.hand.length, 7);
    assert.equal(p.played.length, 0);
  });
for (let mask = 0; mask < 8; mask++)
  test(`full six-player races on four maps with module mask ${mask} preserve every card and finish`, () => {
    for (const track of ["usa", "france", "britain", "italy"]) {
      const settings = {
          weather: !!(mask & 1),
          regular: !!(mask & 2),
          advanced: !!(mask & 4),
        },
        r = finishDraft(setup(settings, 6, track));
      for (const p of r.players) p.bot = true;
      const heat = new Map(r.players.map((p) => [p.id, physicalHeat(p)]));
      const basics = new Map(
        r.players.map((p) => [
          p.id,
          new Set(
            [...p.hand, ...p.deck].filter((c) => c.basic).map((c) => c.id),
          ),
        ]),
      );
      autoBots(r);
      assert.equal(
        r.phase,
        "finished",
        `mask ${mask} track ${track} round ${r.round}`,
      );
      for (const p of r.players) {
        assert.equal(physicalHeat(p), heat.get(p.id));
        const cards = [...p.hand, ...p.deck, ...p.discard, ...p.played];
        assert.equal(new Set(cards.map((c) => c.id)).size, cards.length);
        assert.deepEqual(
          new Set(cards.filter((c) => c.basic).map((c) => c.id)),
          basics.get(p.id),
        );
      }
      assert.deepEqual(
        r.players.map((p) => p.rank).sort((a, b) => a - b),
        [1, 2, 3, 4, 5, 6],
      );
    }
  });

test("bot escapes a Stress-clogged hand before a zero-limit road corner by making room to draw", () => {
  const { r, p } = fixture([], 27);
  r.trackId = "france";
  r.roads = [{ at: 28, kind: "limitDown" }];
  p.gear = 1;
  p.engine = 0;
  p.hand = Array.from({ length: 7 }, () => card(0, "stress"));
  const choice = botChoice(r, p);
  assert.equal(choice.gear, 2);
  assert.equal(choice.ids.length, 2);
});

test("two extra Heat upgrades cool into engine and conserve their additional Heat", () => {
  const { r, p } = fixture([]);
  p.hand = [makeUpgrade(17), makeUpgrade(48)];
  r.turn.cool = 2;
  assert.equal(physicalHeat(p), 8);
  react(r, p, "cool");
  react(r, p, "cool");
  assert.equal(p.engine, 8);
  assert.equal(p.hand.length, 0);
  assert.equal(physicalHeat(p), 8);
});
test("Boost unavailable without any drawable Basic card is disabled and rejected before spending Heat", () => {
  const { r, p } = fixture([]);
  p.deck = [makeUpgrade(34)];
  p.discard = [card(0, "stress")];
  const before = structuredClone(p);
  assert.equal(view(r, p.token).canBoost, false);
  assert.throws(() => react(r, p, "boost"), /基础速度牌/);
  assert.deepEqual(p, before);
  assert.equal(r.turn.boost, false);
});
