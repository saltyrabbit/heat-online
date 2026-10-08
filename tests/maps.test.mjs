import { test } from "node:test";
import assert from "node:assert/strict";
import { TRACKS, getTrack } from "../lib/tracks.ts";
import { geometry } from "../lib/track-geometry.ts";
import {
  room,
  player,
  start,
  configure,
  crossed,
  canSlip,
  plan,
  react,
  autoBots,
  cornerCost,
} from "../lib/game.ts";
const facts = {
  usa: [
    69,
    2,
    [
      [13, 7],
      [34, 3],
      [50, 3],
      [58, 2],
    ],
  ],
  france: [
    60,
    2,
    [
      [13, 5],
      [21, 2],
      [28, 1],
      [40, 3],
      [48, 4],
    ],
  ],
  britain: [
    63,
    2,
    [
      [16, 10],
      [31, 6],
      [38, 5],
      [44, 4],
      [49, 3],
    ],
  ],
  italy: [
    54,
    3,
    [
      [11, 5],
      [20, 2],
      [27, 3],
    ],
  ],
};
const card = (value) => ({
  id: crypto.randomUUID(),
  type: "speed",
  value,
  basic: true,
});
for (const [id, [length, laps, corners]] of Object.entries(facts)) {
  test(`${id}: official length, laps and limits; corner boundary and lap wrap`, () => {
    const t = TRACKS[id];
    assert.equal(t.length, length);
    assert.equal(t.laps, laps);
    assert.deepEqual(
      t.corners.map((c) => [c.at, c.limit]),
      corners,
    );
    for (const c of t.corners) {
      assert.deepEqual(crossed(c.at - 2, c.at - 1, length * laps, t), []);
      assert.deepEqual(crossed(c.at - 1, c.at, length * laps, t), [c]);
      assert.deepEqual(crossed(c.at, c.at + 1, length * laps, t), []);
      assert.deepEqual(
        crossed(length + c.at - 1, length + c.at, length * laps, t),
        [{ at: length + c.at, limit: c.limit }],
      );
    }
    assert.deepEqual(
      crossed(length * laps - 1, length * laps + 20, length * laps, t),
      [],
    );
    const g = geometry(t);
    assert.deepEqual(g.point(0), g.point(length));
    assert.deepEqual(g.point(-1), g.point(length - 1));
    for (let i = 0; i < length; i++) {
      for (const offset of [-20, 20]) {
        const p = g.point(i, offset);
        assert.ok(
          p.x > 25 && p.x < 815 && p.y > 25 && p.y < 450,
          `${id} cell ${i} outside map`,
        );
      }
      const a = g.point(i),
        b = g.point(i + 1);
      assert.ok(
        Math.hypot(a.x - b.x, a.y - b.y) > 5,
        `${id} cell ${i} overlaps next cell`,
      );
    }
  });
  test(`${id}: heat, spinout, final finish and occupied cells use selected map`, () => {
    const t = TRACKS[id],
      r = room("MAPTEST", "A", "a", laps, id);
    r.players.push(player("B", "b", 1), player("C", "c", 2));
    start(r);
    const [p, q, z] = r.players,
      corner = t.corners.at(-1);
    p.pos = corner.at - 1;
    p.hand = [card(corner.limit + 2)];
    p.engine = 0;
    q.pos = 1;
    q.hand = [card(0)];
    z.pos = 2;
    z.hand = [card(0)];
    r.queue = [p.id, q.id, z.id];
    assert.equal(cornerCost(r, p, corner.limit + 2, p.pos, p.pos + 3), 2);
    for (const x of r.players) plan(r, x, 1, [x.hand[0].id]);
    react(r, p, "check");
    assert.equal(p.pos, corner.at - 1);
    assert.equal(p.gear, 1);
    // A two-lane cell occupied by cars on different laps blocks landing too.
    const b = room("BLOCKS", "A", "a", laps, id);
    b.players.push(player("B", "b", 1), player("C", "c", 2));
    start(b);
    const [a, u, v] = b.players;
    a.pos = 4;
    a.hand = [card(1)];
    u.pos = 5;
    u.lane = 0;
    u.hand = [card(0)];
    v.pos = length + 5;
    v.lane = 1;
    v.hand = [card(0)];
    b.queue = [a.id, u.id, v.id];
    for (const x of b.players) plan(b, x, 1, [x.hand[0].id]);
    assert.equal(a.pos, 4);
    const finish = length * laps;
    a.pos = finish - 2;
    u.pos = finish - 1;
    assert.equal(canSlip(b, a), false);
    const f = room("FINISH", "A", "a", laps, id);
    f.players.push(player("B", "b", 1));
    start(f);
    const [x, y] = f.players;
    x.pos = finish - 1;
    y.pos = finish - 2;
    x.hand = [card(1)];
    y.hand = [card(5)];
    f.queue = [x.id, y.id];
    plan(f, x, 1, [x.hand[0].id]);
    plan(f, y, 1, [y.hand[0].id]);
    react(f, x, "check");
    react(f, x, "finish");
    react(f, y, "check");
    react(f, y, "finish");
    assert.equal(f.phase, "finished");
    assert.equal(y.rank, 1);
    assert.equal(x.rank, 2);
  });
  test(`${id}: ten six-car full official races conserve heat and finish`, () => {
    for (let race = 0; race < 10; race++) {
      const r = room("BOTMAP", "A", "a", laps, id);
      for (let i = 1; i < 6; i++)
        r.players.push(player(String(i), String(i), i, true));
      r.players[0].bot = true;
      start(r);
      for (let guard = 0; guard < 200 && r.phase !== "finished"; guard++) {
        autoBots(r);
        for (const p of r.players)
          assert.equal(
            p.engine +
              [...p.hand, ...p.deck, ...p.discard, ...p.played].filter(
                (c) => c.type === "heat",
              ).length,
            7,
          );
      }
      assert.equal(r.phase, "finished");
      assert.deepEqual(r.players.map((p) => p.rank).sort(), [1, 2, 3, 4, 5, 6]);
    }
  });
}
test("legacy rooms retain coast; configure normalizes distance and locks after start", () => {
  const r = room("LEGACY", "A", "a");
  delete r.trackId;
  assert.equal(getTrack(r.trackId).id, "coastline");
  configure(r, "italy", 2);
  assert.equal(r.laps, 3);
  configure(r, "usa", 1);
  assert.equal(r.laps, 1);
  assert.throws(() => configure(r, "unknown", 2));
  r.players.push(player("B", "b", 1));
  start(r);
  assert.throws(() => configure(r, "france", 2));
});
