import { test } from "node:test";
import assert from "node:assert/strict";
import {
  room,
  player,
  start,
  plan,
  react,
  view,
  autoBots,
  botPlan,
  crossed,
  canSlip,
} from "../lib/game.ts";
const c = (value, type = "speed", basic = true) => ({
  id: crypto.randomUUID(),
  type,
  value,
  basic,
});
function setup(n = 2) {
  const r = room("TESTAA", "A", "a", 2);
  for (let i = 1; i < n; i++) r.players.push(player(String(i), "p" + i, i));
  start(r);
  return r;
}
function controlled() {
  const r = setup();
  r.players.forEach((p, i) => {
    p.pos = i === 0 ? 8 : 0;
    p.lane = 0;
    p.gear = 1;
    p.hand = [c(5), c(2), c(0, "heat")];
    p.deck = [c(3), c(4), c(1)];
    p.discard = [];
    p.engine = 6;
  });
  r.queue = r.players.map((p) => p.id);
  return r;
}
test("setup has 6 engine heat, 7-card hand, 18-card deck total", () => {
  const r = setup(6);
  for (const p of r.players) {
    assert.equal(p.engine, 6);
    assert.equal(p.hand.length, 7);
    assert.equal(p.hand.length + p.deck.length, 18);
  }
  assert.equal(r.phase, "plan");
});
test("private view hides other hands, decks, tokens and pending cards", () => {
  const r = setup();
  const p = r.players[0];
  plan(r, p, 1, [p.hand.find((c) => c.type !== "heat").id]);
  const v = view(r, p.token);
  assert.equal(v.players[1].hand.length, 0);
  assert.equal(v.players[0].played.length, 0);
  assert.ok(!JSON.stringify(v).includes('"token"'));
  assert.ok(!JSON.stringify(v).includes('"deck":'));
  assert.throws(() => view(r, "intruder"));
});
test("crossing each corner is charged in order; finish removes later corners", () => {
  assert.deepEqual(
    crossed(9, 42, 128).map((c) => c.at),
    [10, 26, 41],
  );
  assert.deepEqual(crossed(120, 150, 128), []);
});
test("illegal gears, duplicates, heat play, wrong turn rejected", () => {
  const r = controlled(),
    p = r.players[0];
  assert.throws(() => plan(r, p, 4, [p.hand[0].id]));
  assert.throws(() => plan(r, p, 2, [p.hand[0].id, p.hand[0].id]));
  assert.throws(() => plan(r, p, 1, [p.hand[2].id]));
  assert.throws(() => react(r, p, "boost"));
});
test("two-gear shift pays exactly one engine heat", () => {
  const r = setup(),
    p = r.players[0];
  plan(
    r,
    p,
    3,
    p.hand
      .filter((c) => c.type !== "heat")
      .slice(0, 3)
      .map((c) => c.id),
  );
  assert.equal(p.engine, 5);
  assert.equal(p.discard.length, 1);
});
test("stress reveals every drawn card in order, separately for each stress card", () => {
  const r = controlled(), p = r.players[0], q = r.players[1];
  const first = c(0, "stress"), second = c(0, "stress");
  const upgrade = c(5, "speed", false), skippedStress = c(0, "stress");
  const three = c(3), skippedHeat = c(0, "heat"), two = c(2);
  p.hand = [first, second];
  p.deck = [two, skippedHeat, three, skippedStress, upgrade];
  plan(r, p, 2, [first.id, second.id]);
  plan(r, q, 1, [q.hand[1].id]);
  assert.deepEqual(r.reveals.map((event) => event.cards.map((card) => card.id)), [
    [upgrade.id, skippedStress.id, three.id], [skippedHeat.id, two.id],
  ]);
  assert.deepEqual(r.reveals.map((event) => [event.kind, event.value, event.playerId]), [
    ["stress", 3, p.id], ["stress", 2, p.id],
  ]);
  assert.equal(new Set(r.reveals.map((event) => event.id)).size, 2);
  assert.equal(r.turn.speed, 5);
  assert.deepEqual(p.discard.map((card) => card.id), [upgrade.id, skippedStress.id, skippedHeat.id]);
  assert.deepEqual(view(r, q.token).reveals, r.reveals);
});
test("boost records actual flips and survives advancement to another driver's turn", () => {
  const r = controlled(), p = r.players[0], q = r.players[1];
  delete r.reveals; // Rooms saved before reveal support remain compatible.
  const four = c(4), skippedHeat = c(0, "heat"), upgrade = c(5, "speed", false);
  p.deck = [four, skippedHeat, upgrade];
  plan(r, p, 1, [p.hand[0].id]);
  plan(r, q, 1, [q.hand[1].id]);
  react(r, p, "boost");
  assert.equal(p.engine, 5);
  assert.equal(r.turn.speed, 9);
  assert.deepEqual(r.reveals[0].cards.map((card) => card.id), [upgrade.id, skippedHeat.id, four.id]);
  assert.equal(r.reveals[0].kind, "boost");
  assert.equal(r.reveals[0].value, 4);
  assert.equal(r.reveals[0].round, r.round);
  assert.ok(Number.isFinite(r.reveals[0].at));
  react(r, p, "check");
  react(r, p, "finish");
  assert.equal(r.turn.id, q.id);
  assert.equal(view(r, q.token).reveals[0].cards.at(-1).id, four.id);
  const previousRound = r.round;
  react(r, q, "check");
  react(r, q, "finish");
  assert.equal(r.round, previousRound + 1);
  assert.equal(view(r, p.token).reveals.filter((event) => event.round === r.round).length, 0);
});
test("public round actions show locked status before revealing chosen cards", () => {
  const r = controlled(), p = r.players[0], q = r.players[1];
  delete r.actions;
  plan(r, p, 1, [p.hand[0].id]);
  const actions = view(r, q.token).actions;
  assert.equal(actions.length, 1);
  assert.equal(actions[0].playerId, p.id);
  assert.equal(actions[0].round, r.round);
  assert.equal(actions[0].text, `${p.name} 已锁定选牌（1 挡）。`);
  assert.ok(!JSON.stringify(actions).includes(p.hand[0].id));
  assert.equal(view(r, q.token).players.find((x) => x.id === p.id).played.length, 0);
});
test("all chosen cards reveal together after the last plan, including waiting drivers", () => {
  const r = controlled(), p = r.players[0], q = r.players[1];
  const chosenP = p.hand[0], chosenQ = q.hand[1];
  plan(r, p, 1, [chosenP.id]);
  assert.ok(!view(r, q.token).actions.some((action) => action.cards?.length));
  plan(r, q, 1, [chosenQ.id]);
  assert.equal(r.turn.id, p.id);
  const snapshots = view(r, p.token).actions.filter((action) => action.kind === "played");
  assert.deepEqual(snapshots.map((action) => [action.playerId, action.cards.map((card) => card.id)]), [
    [p.id, [chosenP.id]], [q.id, [chosenQ.id]],
  ]);
  react(r, p, "check");
  react(r, p, "finish");
  assert.deepEqual(view(r, q.token).actions.find((action) => action.kind === "played" && action.playerId === p.id).cards, [chosenP]);
});
test("six drivers reveal their chosen cards together, before five of them have acted", () => {
  const r = setup(6);
  const choices = r.players.map((p) => p.hand.find((card) => card.type === "speed" && card.basic));
  r.players.forEach((p, i) => {
    plan(r, p, 1, [choices[i].id]);
    if (i < 5) assert.ok(!view(r, p.token).actions.some((action) => action.kind === "played"));
  });
  assert.equal(r.phase, "turn");
  const snapshots = view(r, r.players[5].token).actions.filter((action) => action.kind === "played");
  assert.equal(snapshots.length, 6);
  for (let i = 0; i < 6; i++) assert.deepEqual(snapshots.find((action) => action.playerId === r.players[i].id).cards, [choices[i]]);
});
test("round actions retain movement, cooldown, boost, corner checks and turn completion", () => {
  const r = controlled(), p = r.players[0], q = r.players[1];
  plan(r, p, 1, [p.hand[0].id]);
  plan(r, q, 1, [q.hand[1].id]);
  react(r, p, "cool");
  react(r, p, "boost");
  react(r, p, "check");
  react(r, p, "finish");
  const actions = view(r, q.token).actions.filter((action) => action.playerId === p.id);
  for (const phrase of ["已锁定选牌", "打出", "以速度", "冷却", "加速", "过弯支付", "完成弯道检查", "结束回合"])
    assert.ok(actions.some((action) => action.text.includes(phrase)), phrase);
  assert.equal(new Set(actions.map((action) => action.id)).size, actions.length);
  assert.ok(actions.every((action) => action.round === r.round));
  react(r, q, "adrenaline");
  assert.ok(r.actions.some((action) => action.playerId === q.id && action.text.includes("肾上腺素")));
  react(r, q, "check");
  react(r, q, "finish");
  assert.equal(r.actions.filter((action) => action.round === r.round).length, 0);
});
test("automatic bot turns retain round action history after their turn ends", () => {
  const r = controlled(), p = r.players[0], q = r.players[1];
  p.bot = true;
  plan(r, q, 1, [q.hand[1].id]);
  autoBots(r);
  assert.equal(r.turn.id, q.id);
  const actions = view(r, q.token).actions.filter((action) => action.playerId === p.id && action.round === r.round);
  assert.ok(actions.some((action) => action.text.includes("以速度")));
  assert.ok(actions.some((action) => action.text.includes("结束回合")));
});
test("cooldown recycles hand heat, corner charges full speed including boost", () => {
  const r = controlled(),
    p = r.players[0],
    q = r.players[1];
  plan(r, p, 1, [p.hand[0].id]);
  plan(r, q, 1, [q.hand[1].id]);
  assert.equal(p.pos, 13);
  react(r, p, "cool");
  assert.equal(p.engine, 7);
  react(r, p, "boost");
  assert.equal(r.turn.speed, 6);
  assert.equal(p.engine, 6);
  assert.throws(() => react(r, p, "boost"));
  react(r, p, "check");
  assert.equal(p.engine, 3);
  assert.ok(r.pendingDiscards.includes(p.id));
  assert.equal(r.turn.id, q.id);
});
test("insufficient heat spins out and adds stress, shifts to gear 1", () => {
  const r = controlled(),
    p = r.players[0],
    q = r.players[1];
  p.engine = 0;
  plan(r, p, 1, [p.hand[0].id]);
  plan(r, q, 1, [q.hand[1].id]);
  react(r, p, "check");
  assert.equal(p.pos, 9);
  assert.equal(p.gear, 1);
  assert.equal(p.hand.filter((c) => c.type === "stress").length, 1);
  assert.throws(() =>
    react(r, p, "finish", [p.hand.find((c) => c.type === "heat").id]),
  );
});
test("cluttered hand stalls and cannot sneak in a partial-speed move", () => {
  const r = controlled(),
    p = r.players[0],
    q = r.players[1];
  p.gear = 2;
  p.hand = [c(2), ...Array.from({ length: 6 }, () => c(0, "heat"))];
  plan(r, p, 2, []);
  plan(r, q, 1, [q.hand[1].id]);
  assert.equal(p.pos, 8);
  assert.equal(p.gear, 1);
  assert.notEqual(r.turn.id, p.id);
});
test("stress skips upgrades and heat, reveals only basic 1-4", () => {
  const r = controlled(),
    p = r.players[0],
    q = r.players[1];
  p.hand = [c(0, "stress")];
  p.deck = [c(4), c(5, "speed", false), c(0, "heat")];
  plan(r, p, 1, [p.hand[0].id]);
  plan(r, q, 1, [q.hand[1].id]);
  assert.equal(r.turn.speed, 4);
  assert.deepEqual(r.turn.stress, [4]);
  assert.equal(p.discard.length, 2);
});
test("tailwind cannot cross the final finish line", () => {
  const r = controlled(),
    p = r.players[0],
    q = r.players[1];
  p.pos = 126;
  q.pos = 127;
  assert.equal(canSlip(r, p), false);
  p.pos = 125;
  q.pos = 126;
  assert.equal(canSlip(r, p), true);
});
test("same-round finishes rank by distance rather than action order", () => {
  const r = controlled(),
    p = r.players[0],
    q = r.players[1];
  p.pos = 127;
  q.pos = 126;
  p.hand = [c(1)];
  q.hand = [c(5)];
  plan(r, p, 1, [p.hand[0].id]);
  plan(r, q, 1, [q.hand[0].id]);
  react(r, p, "check");
  react(r, p, "finish");
  react(r, q, "check");
  react(r, q, "finish");
  assert.equal(r.phase, "finished");
  assert.equal(q.rank, 1);
  assert.equal(p.rank, 2);
});
test("20 full bot races preserve heat and finish all six cars", () => {
  for (let race = 0; race < 20; race++) {
    const r = setup(6);
    r.players.forEach((p) => (p.bot = true));
    for (let guard = 0; guard < 200 && r.phase !== "finished"; guard++) {
      autoBots(r);
      for (const p of r.players) {
        assert.equal(
          p.engine +
            [...p.hand, ...p.deck, ...p.discard, ...p.played].filter(
              (c) => c.type === "heat",
            ).length,
          7,
        );
        assert.ok(p.engine >= 0);
        assert.ok(p.hand.length <= 9);
      }
    }
    assert.equal(r.phase, "finished");
    assert.deepEqual(r.players.map((p) => p.rank).sort(), [1, 2, 3, 4, 5, 6]);
  }
});
