import { test } from "node:test";
import assert from "node:assert/strict";
import { room, player, plan, react, order, start, view } from "../lib/game.ts";
import { TRACK_OPTIONS, getTrack } from "../lib/tracks.ts";
import {
  geometry,
  innerLane,
  innerGuide,
  laneOffset,
  compareCars,
} from "../lib/track-geometry.ts";
const card = (value) => ({
  id: crypto.randomUUID(),
  type: "speed",
  value,
  basic: true,
});
function fixture(n = 2, id = "usa") {
  const r = room("GEOMET", "A", "a", getTrack(id).laps, id);
  for (let i = 1; i < n; i++) r.players.push(player(String(i), String(i), i));
  r.phase = "plan";
  r.round = 1;
  for (const [i, p] of r.players.entries()) {
    p.pos = i === 0 ? 54 : 2 - i;
    p.lane = 0;
    p.gear = 1;
    p.hand = [card(3)];
    p.deck = [card(4), card(3), card(2)];
    p.discard = [];
    p.played = [];
    p.engine = 6;
  }
  r.queue = r.players.map((p) => p.id);
  return r;
}
function lock(r) {
  for (const p of r.players)
    plan(
      r,
      p,
      p.gear,
      p.hand.slice(0, p.gear).map((c) => c.id),
    );
}
function end(r) {
  const p = r.players.find((p) => p.id === r.turn.id);
  react(r, p, "check");
  react(r, p, "finish");
}
test("G01: fixed bend fixtures select opposite physical lanes for left/right turns", () => {
  for (const [id, a, b] of [
    ["usa", 5, 57],
    ["france", 5, 30],
    ["britain", 5, 37],
    ["italy", 5, 18],
  ]) {
    assert.equal(innerLane(getTrack(id), a), 0, id);
    assert.equal(innerLane(getTrack(id), b), 1, id);
  }
  for (let i = 0; i < 64; i++)
    assert.equal(innerLane(getTrack("coastline"), i), 0);
});
test("G02: every green cell marker and its car lane face the local centre of curvature", () => {
  for (const t of TRACK_OPTIONS) {
    const g = geometry(t),
      guide = innerGuide(t);
    assert.equal(guide.edgeSegments.length, t.length);
    for (let i = 0; i < t.length; i++) {
      const a = g.point(i - 0.3),
        b = g.point(i),
        c = g.point(i + 0.3);
      // Independently locate the centre of the circumcircle of three track points.
      const ux = a.x - b.x,
        uy = a.y - b.y,
        vx = c.x - b.x,
        vy = c.y - b.y;
      const det = 2 * (ux * vy - uy * vx);
      if (Math.abs(det) < 0.01) continue;
      const cx = ((ux * ux + uy * uy) * vy - (vx * vx + vy * vy) * uy) / det;
      const cy = (ux * (vx * vx + vy * vy) - vx * (ux * ux + uy * uy)) / det;
      const marker = guide.edgeSegments[i][2];
      assert.ok(
        (marker.x - b.x) * cx + (marker.y - b.y) * cy > 0,
        `${t.id} cell ${i}`,
      );
      const car = g.point(i, laneOffset(t, innerLane(t, i)));
      assert.ok((car.x - b.x) * cx + (car.y - b.y) * cy > 0);
    }
  }
});
test("G03: priority repeats across laps and negative starting positions", () => {
  for (const t of TRACK_OPTIONS)
    for (let i = 0; i < t.length; i++)
      for (const lap of [-2, -1, 1, 2, 3])
        assert.equal(innerLane(t, i + lap * t.length), innerLane(t, i));
});
test("G04: server order and client comparator prefer each bend inside, distance remains primary", () => {
  const t = getTrack("usa"),
    r = fixture(),
    [a, b] = r.players;
  a.pos = b.pos = 57;
  a.lane = 0;
  b.lane = 1;
  assert.equal(order(r)[0].id, b.id);
  assert.equal([a, b].sort((x, y) => compareCars(t, x, y))[0].id, b.id);
  a.pos = b.pos = 5;
  assert.equal(order(r)[0].id, a.id);
  a.pos = 56;
  b.pos = 55;
  b.lane = 1;
  assert.equal(order(r)[0].id, a.id);
});
test("G05: normal movement prefers reverse bend inside, occupied inside uses outside", () => {
  for (const taken of [false, true]) {
    const r = fixture(),
      [p, q] = r.players;
    if (taken) {
      q.pos = 57;
      q.lane = 1;
    }
    lock(r);
    assert.equal(p.pos, 57);
    assert.equal(p.lane, taken ? 0 : 1);
    assert.equal(
      view(r, p.token).players.find((x) => x.id === p.id).lane,
      p.lane,
    );
  }
});
test("G06: full cells retreat across a side switch and recompute actual destination priority", () => {
  const r = fixture(3),
    [p, q, z] = r.players;
  p.hand = [card(1)];
  q.pos = z.pos = 55;
  q.lane = 0;
  z.lane = 1;
  lock(r);
  assert.equal(p.pos, 54);
  assert.equal(p.lane, 0);
});
test("G07: boost, adrenaline and slipstream use the destination geometric side", () => {
  for (const action of ["boost", "adrenaline", "slip"]) {
    const r = fixture(),
      [p, q] = r.players;
    p.hand = [card(0)];
    p.pos = 54;
    q.pos = action === "slip" ? 55 : 1;
    lock(r);
    assert.equal(p.lane, 0);
    if (action === "adrenaline") {
      p.pos = 54;
      r.turn.adrenaline = false;
    }
    if (action === "boost") p.deck = [card(1)];
    react(r, p, action);
    assert.equal(p.pos, action === "slip" ? 56 : 55);
    assert.equal(p.lane, 1);
  }
});
test("G08: spinout retreats to a reverse bend inside; occupancy can force its outside", () => {
  for (const taken of [false, true]) {
    const r = fixture(),
      [p, q] = r.players;
    p.pos = 57;
    p.hand = [card(3)];
    p.engine = 0;
    if (taken) {
      q.pos = 57;
      q.lane = 1;
    } else q.pos = 1;
    lock(r);
    react(r, p, "check");
    assert.equal(p.pos, 57);
    assert.equal(p.lane, taken ? 0 : 1);
  }
});
test("G09: next-round reveal queue and last-place adrenaline reflect inside priority", () => {
  const r = fixture(2),
    [p, q] = r.players;
  p.pos = q.pos = 57;
  p.lane = 0;
  q.lane = 1;
  p.hand = [card(0)];
  q.hand = [card(0)];
  lock(r);
  end(r);
  end(r);
  assert.equal(r.phase, "plan");
  assert.deepEqual(r.queue, [q.id, p.id]);
  for (const x of r.players) x.hand = [card(0)];
  lock(r);
  assert.equal(r.turn.id, q.id);
  assert.equal(r.turn.adrenaline, true);
  end(r);
  assert.equal(r.turn.id, p.id);
  assert.equal(r.turn.adrenaline, false);
});
test("G10: same-round finish ties at reverse bends use geometric inside, starting grid does too", () => {
  const r = fixture(2, "italy"),
    [p, q] = r.players;
  p.pos = q.pos = 180;
  p.lane = 0;
  q.lane = 1;
  r.phase = "turn";
  r.queue = [p.id];
  r.turn = {
    id: p.id,
    start: 161,
    speed: 19,
    cool: 0,
    boost: false,
    adrenaline: true,
    slip: false,
    step: "discard",
    stress: [],
  };
  react(r, p, "finish");
  assert.equal(r.phase, "finished");
  assert.equal(q.rank, 1);
  assert.equal(p.rank, 2);
  const s = fixture(6, "italy");
  s.phase = "lobby";
  start(s);
  const sorted = order(s);
  for (let i = 0; i < sorted.length; i += 2)
    assert.equal(sorted[i].lane, innerLane(getTrack("italy"), sorted[i].pos));
});
