// Basic mechanics reference official rules v1.1; R05/R19 use the geometric inside house rule.
// These positions/decks are controlled fixtures, not bot-generated expectations.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  room,
  player,
  start,
  plan,
  react,
  canSlip,
  autoBots,
  view,
  botPlan,
} from "../lib/game.ts";
import { getTrack } from "../lib/tracks.ts";
const c = (value = 0, type = "speed", basic = true) => ({
  id: crypto.randomUUID(),
  type,
  value,
  basic,
});
function setup(n = 2, id = "usa", laps = 2) {
  const r = room("AUDITX", "A", "a", laps, id);
  for (let i = 1; i < n; i++) r.players.push(player(String(i), "p" + i, i));
  start(r);
  r.players.forEach((p, i) => {
    p.pos = i === 0 ? 5 : 1 - i;
    p.lane = 0;
    p.gear = 1;
    p.engine = 6;
    p.hand = [c(2), c(1), c(4), c(0, "heat")];
    p.deck = [c(3), c(2), c(1)];
    p.discard = [];
    p.played = [];
    p.plan = false;
  });
  r.queue = r.players.map((p) => p.id);
  return r;
}
function lock(r) {
  for (const p of r.players)
    plan(
      r,
      p,
      p.gear,
      p.hand
        .filter((c) => c.type !== "heat")
        .slice(0, p.gear)
        .map((c) => c.id),
    );
}
function end(r) {
  const p = r.players.find((p) => p.id === r.turn.id);
  react(r, p, "check");
  react(r, p, "finish");
}
test("R01 p4: all choices locked before reveal; early submitter does not move", () => {
  const r = setup(),
    p = r.players[0];
  plan(r, p, 1, [p.hand[0].id]);
  assert.equal(r.phase, "plan");
  assert.equal(p.pos, 5);
  assert.deepEqual(
    view(r, r.players[1].token).players.find((x) => x.id === p.id).played,
    [],
  );
  assert.throws(() => plan(r, p, 1, [p.hand[0].id]));
});
test("R02 p4,p7: shifting zero/one gears free; two gears costs Heat; three forbidden", () => {
  for (const [from, to, cost] of [
    [1, 1, 0],
    [1, 2, 0],
    [1, 3, 1],
    [4, 2, 1],
    [4, 3, 0],
  ]) {
    const r = setup(),
      p = r.players[0];
    p.gear = from;
    plan(
      r,
      p,
      to,
      p.hand
        .filter((c) => c.type !== "heat")
        .slice(0, to)
        .map((c) => c.id),
    );
    assert.equal(p.engine, 6 - cost);
  }
  const r = setup();
  assert.throws(() => plan(r, r.players[0], 4, []));
  r.players[0].engine = 0;
  assert.throws(() =>
    plan(
      r,
      r.players[0],
      3,
      r.players[0].hand.slice(0, 3).map((c) => c.id),
    ),
  );
});
test("R03 p4: exact card count and no voluntary Heat; 0 and 5 are playable", () => {
  const r = setup(),
    p = r.players[0];
  p.hand = [c(0, "speed", false), c(5, "speed", false), c(0, "heat")];
  assert.throws(() => plan(r, p, 2, [p.hand[0].id]));
  assert.throws(() => plan(r, p, 1, [p.hand[2].id]));
  plan(
    r,
    p,
    2,
    p.hand.slice(0, 2).map((c) => c.id),
  );
  plan(r, r.players[1], 1, [r.players[1].hand[0].id]);
  assert.equal(r.turn.speed, 5);
});
test("R04 p5: blocked destinations retreat, but occupied intermediate cells never block", () => {
  const r = setup(3),
    [p, q, z] = r.players;
  p.hand = [c(5)];
  q.pos = z.pos = 10;
  q.lane = 0;
  z.lane = 1;
  lock(r);
  assert.equal(p.pos, 9);
  assert.equal(r.turn.speed, 5);
  const s = setup(3),
    [a, b, d] = s.players;
  a.hand = [c(5)];
  b.pos = d.pos = 7;
  b.lane = 0;
  d.lane = 1;
  lock(s);
  assert.equal(a.pos, 10);
});
test("R05 custom: geometric inside is preferred; other side used only when occupied", () => {
  const r = setup(3),
    [p, q, z] = r.players;
  p.hand = [c(5)];
  q.pos = 10;
  q.lane = 0;
  z.pos = 2;
  lock(r);
  assert.equal(p.pos, 10);
  assert.equal(p.lane, 1);
  const s = setup();
  s.players[0].hand = [c(5)];
  lock(s);
  assert.equal(s.players[0].lane, 0);
});
test("R06 p5: Stress ignores nonbasic 0,5,Heat,Stress; multiple reveals stack", () => {
  const r = setup(),
    p = r.players[0];
  p.gear = 2;
  p.hand = [c(0, "stress"), c(0, "stress")];
  p.deck = [
    c(3),
    c(0, "stress"),
    c(4),
    c(5, "speed", false),
    c(0, "speed", false),
    c(0, "heat"),
  ];
  lock(r);
  assert.equal(r.turn.speed, 7);
  assert.deepEqual(r.turn.stress, [4, 3]);
  assert.equal(p.discard.length, 4);
});
test("R07 p6: deck recycle during reveal excludes already played cards", () => {
  const r = setup(),
    p = r.players[0];
  p.hand = [c(0, "stress")];
  p.deck = [];
  p.discard = [c(4)];
  lock(r);
  assert.equal(r.turn.speed, 4);
  assert.equal(p.played.length, 2);
  assert.equal(p.deck.length, 0);
});
test("R08 p5-p6: cooldown capacities 3/1/0/0, moves only hand Heat to engine", () => {
  for (const [gear, cool] of [
    [1, 3],
    [2, 1],
    [3, 0],
    [4, 0],
  ]) {
    const r = setup(),
      p = r.players[0];
    p.gear = gear;
    p.hand = [
      ...Array.from({ length: gear }, () => c(1)),
      ...Array.from({ length: 3 }, () => c(0, "heat")),
    ];
    lock(r);
    assert.equal(r.turn.cool, cool);
    for (let i = 0; i < cool; i++) react(r, p, "cool");
    assert.equal(p.engine, 6 + cool);
    assert.throws(() => react(r, p, "cool"));
  }
});
test("R09 p5-p6: cooldown can precede boost; boost once and costs engine Heat", () => {
  const r = setup(),
    p = r.players[0];
  p.engine = 0;
  p.deck = [c(2), c(0, "heat")];
  lock(r);
  assert.throws(() => react(r, p, "boost"));
  react(r, p, "cool");
  react(r, p, "boost");
  assert.equal(r.turn.speed, 4);
  assert.equal(p.engine, 0);
  assert.throws(() => react(r, p, "boost"));
});
test("R10 p5,p7: last one/two cars get independent +1 speed/cooldown, even after others finish", () => {
  for (const n of [2, 4, 5, 6]) {
    const r = setup(n);
    lock(r);
    let i = 0;
    while (r.phase === "turn") {
      const p = r.players.find((p) => p.id === r.turn.id),
        eligible = i >= n - (n >= 5 ? 2 : 1);
      assert.equal(r.turn.cool, 3 + (eligible ? 1 : 0));
      assert.equal(!r.turn.adrenaline, eligible);
      if (eligible) {
        const speed = r.turn.speed;
        react(r, p, "adrenaline");
        assert.equal(r.turn.speed, speed + 1);
        assert.throws(() => react(r, p, "adrenaline"));
      }
      end(r);
      i++;
    }
    assert.equal(i, n);
  }
  const r = setup(6);
  r.players.slice(0, 4).forEach((p, i) => {
    p.rank = i + 1;
    p.pos = 138;
  });
  r.queue = r.players.slice(4).map((p) => p.id);
  r.players[4].hand = [c(2)];
  r.players[5].hand = [c(2)];
  for (const p of r.players.slice(4)) plan(r, p, 1, [p.hand[0].id]);
  assert.equal(r.turn.cool, 4);
  assert.equal(r.turn.adrenaline, false);
});
test("R11 p6: same-cell/one-behind tailwind +2 changes position, never speed, once", () => {
  for (const offset of [0, 1]) {
    const r = setup(),
      [p, q] = r.players;
    p.hand = [c(2)];
    q.pos = 7 + offset;
    q.lane = 1;
    lock(r);
    const speed = r.turn.speed;
    assert.equal(canSlip(r, p), true);
    react(r, p, "slip");
    assert.equal(p.pos, 9);
    assert.equal(r.turn.speed, speed);
    assert.throws(() => react(r, p, "slip"));
  }
});
test("R12 p6: physical adjacent lapped cars grant tailwind", () => {
  const r = setup(),
    [p, q] = r.players;
  p.pos = 75;
  q.pos = 7;
  assert.equal(canSlip(r, p), true);
  q.pos = 6;
  assert.equal(canSlip(r, p), true);
  p.pos = 68;
  q.pos = 0;
  assert.equal(canSlip(r, p), true);
});
test("R13 p6-p7: tailwind cannot cross final finish; finish reached through speed allowed", () => {
  const r = setup(),
    [p, q] = r.players;
  p.pos = 136;
  q.pos = 137;
  assert.equal(canSlip(r, p), false);
  p.pos = 138;
  assert.equal(canSlip(r, p), false);
  p.pos = 135;
  q.pos = 136;
  assert.equal(canSlip(r, p), true);
});
test("R14 p6: tailwind crossing corner charges total speed, not tailwind distance", () => {
  const r = setup(),
    [p, q] = r.players;
  p.pos = 11;
  p.hand = [c(1)];
  q.pos = 12;
  q.lane = 1;
  lock(r);
  assert.equal(p.pos, 12);
  react(r, p, "slip");
  assert.equal(p.pos, 14);
  assert.equal(p.engine, 6);
  assert.equal(r.turn.speed, 1);
});
test("R15 p6: exact speed limit costs zero; multiple corners pay separately in order", () => {
  const r = setup(),
    p = r.players[0];
  p.pos = 33;
  p.hand = [c(3)];
  lock(r);
  react(r, p, "check");
  assert.equal(p.engine, 6);
  const s = setup(),
    a = s.players[0];
  a.pos = 49;
  a.gear = 3;
  a.hand = [c(3), c(3), c(3)];
  a.engine = 13;
  lock(s);
  react(s, a, "check");
  assert.equal(a.engine, 0);
  assert.equal(a.pos, 58);
  assert.equal(a.gear, 3);
});
test("R16 p6: second-corner spinout pays remaining Heat, adds 2 Stress, retreats to free cell", () => {
  const r = setup(3),
    [p, q, z] = r.players;
  p.pos = 49;
  p.gear = 3;
  p.hand = [c(3), c(3), c(3)];
  p.engine = 12;
  q.pos = z.pos = 57;
  q.lane = 0;
  z.lane = 1;
  lock(r);
  react(r, p, "check");
  assert.equal(p.engine, 0);
  assert.equal(p.pos, 56);
  assert.equal(p.gear, 1);
  assert.equal(p.hand.filter((c) => c.type === "stress").length, 2);
});
test("R17 p6: only speed cards may be voluntarily discarded; refill to 7", () => {
  const r = setup(),
    p = r.players[0];
  p.hand = [c(1), c(5, "speed", false), c(0, "stress"), c(0, "heat")];
  p.deck = Array.from({ length: 8 }, () => c(3));
  lock(r);
  react(r, p, "check");
  assert.throws(() =>
    react(r, p, "finish", [p.hand.find((c) => c.type === "stress").id]),
  );
  assert.throws(() =>
    react(r, p, "finish", [p.hand.find((c) => c.type === "heat").id]),
  );
  react(r, p, "finish", [p.hand.find((c) => c.value === 5).id]);
  assert.equal(p.hand.length, 7);
});
test("R18 p7: cluttered hand skips movement/react/discard, drops gear and refills", () => {
  const r = setup(),
    p = r.players[0];
  p.gear = 3;
  p.hand = [c(4), ...Array.from({ length: 6 }, () => c(0, "heat"))];
  p.deck = Array.from({ length: 8 }, () => c(2));
  lock(r);
  assert.equal(p.pos, 5);
  assert.equal(p.gear, 1);
  assert.equal(p.engine, 6);
  assert.equal(p.hand.length, 7);
  assert.equal(p.discard.filter((c) => c.type === "heat").length, 2);
  assert.notEqual(r.turn.id, p.id);
});
test("R19 custom: same-round finish tie prefers geometric inside and removes finishers after round", () => {
  const r = setup(),
    [p, q] = r.players;
  p.pos = 137;
  p.hand = [c(3)];
  q.pos = 136;
  q.hand = [c(4)];
  lock(r);
  react(r, p, "check");
  react(r, p, "finish");
  assert.equal(p.rank, null);
  assert.equal(q.lane, 1);
  react(r, q, "check");
  react(r, q, "finish");
  assert.equal(p.rank, 1);
  assert.equal(q.rank, 2);
});
test("R20 p7: corners beyond finish are ignored but earlier corners still charge", () => {
  const r = setup(),
    p = r.players[0];
  p.pos = 137;
  p.gear = 4;
  p.hand = [c(5), c(5), c(5), c(5)];
  p.engine = 0;
  lock(r);
  react(r, p, "check");
  assert.equal(p.pos, 157);
  assert.equal(p.engine, 0);
});
test("R21 p5: long Stress deck must not lose cards or return speed 0 due to reveal cap", () => {
  const r = setup(),
    p = r.players[0];
  p.hand = [c(0, "stress")];
  p.deck = [c(4), ...Array.from({ length: 220 }, () => c(0, "stress"))];
  lock(r);
  assert.equal(r.turn.speed, 4);
  assert.equal(p.discard.length, 220);
  assert.equal(p.played.length, 2);
});
test("R22: deterministic randomized races across 4 maps preserve physical occupancy, speed cards and Heat", () => {
  const original = Math.random;
  let seed = 20261008;
  Math.random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  try {
    for (const id of ["usa", "france", "britain", "italy"])
      for (let n = 2; n <= 6; n++)
        for (let race = 0; race < 10; race++) {
          const r = room("RANDOM", "A", "a", getTrack(id).laps, id);
          for (let i = 1; i < n; i++)
            r.players.push(player(String(i), String(i), i, true));
          r.players[0].bot = true;
          start(r);
          for (let guard = 0; guard < 8000 && r.phase !== "finished"; guard++) {
            if (r.phase === "plan") {
              const p = r.players.find((p) => !p.rank && !p.plan);
              botPlan(r, p);
            } else if (r.phase === "turn") {
              const p = r.players.find((p) => p.id === r.turn.id),
                t = r.turn;
              if (t.step === "discard") react(r, p, "finish");
              else if (t.cool > 0 && p.hand.some((c) => c.type === "heat"))
                react(r, p, "cool");
              else if (!t.adrenaline && Math.random() < 0.5)
                react(r, p, "adrenaline");
              else if (!t.boost && p.engine > 0 && Math.random() < 0.15)
                react(r, p, "boost");
              else
                react(
                  r,
                  p,
                  canSlip(r, p) && Math.random() < 0.5 ? "slip" : "check",
                );
            }
            const occupied = new Set();
            for (const p of r.players) {
              const cards = [...p.hand, ...p.deck, ...p.discard, ...p.played];
              assert.equal(
                p.engine + cards.filter((c) => c.type === "heat").length,
                7,
              );
              assert.equal(
                cards.filter((c) => c.type === "speed" && c.basic).length,
                12,
              );
              assert.equal(
                cards.filter((c) => c.type === "speed" && !c.basic).length,
                2,
              );
              assert.equal(new Set(cards.map((c) => c.id)).size, cards.length);
              if (!p.rank) {
                const spot =
                  (((p.pos % getTrack(id).length) + getTrack(id).length) %
                    getTrack(id).length) +
                  ":" +
                  p.lane;
                assert.ok(!occupied.has(spot));
                occupied.add(spot);
              }
            }
          }
          assert.equal(r.phase, "finished");
          assert.deepEqual(
            r.players.map((p) => p.rank).sort((a, b) => a - b),
            Array.from({ length: n }, (_, i) => i + 1),
          );
        }
  } finally {
    Math.random = original;
  }
});
