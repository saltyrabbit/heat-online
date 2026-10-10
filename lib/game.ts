import { getTrack, isTrackId, type Track, type TrackId } from "./tracks.ts";
import { compareCars, innerLane } from "./track-geometry.ts";
export const TRACK = getTrack("coastline");
export const COLORS = [
  "#ef573f",
  "#50a9e8",
  "#f0c34b",
  "#53b99b",
  "#b28ae2",
  "#ef92b5",
];
export type Card = {
  id: string;
  type: "speed" | "stress" | "heat";
  value: number;
  basic?: boolean;
};
export type FlipReveal = {
  id: string;
  round: number;
  playerId: string;
  kind: "stress" | "boost";
  cards: Card[];
  value: number;
  at: number;
};
export type RaceAction = {
  id: string;
  round: number;
  playerId: string;
  text: string;
};
export type Player = {
  id: string;
  token: string;
  name: string;
  color: string;
  bot: boolean;
  pos: number;
  lane: number;
  gear: number;
  engine: number;
  deck: Card[];
  hand: Card[];
  discard: Card[];
  played: Card[];
  plan: boolean;
  rank: number | null;
};
export type Turn = {
  id: string;
  start: number;
  speed: number;
  cool: number;
  boost: boolean;
  adrenaline: boolean;
  slip: boolean;
  step: "react" | "discard";
  stress: number[];
};
export type Room = {
  code: string;
  host: string;
  phase: "lobby" | "plan" | "turn" | "finished";
  laps: number;
  trackId?: TrackId;
  round: number;
  players: Player[];
  queue: string[];
  turn: Turn | null;
  log: string[];
  requests: string[];
  version: number;
  reveals?: FlipReveal[];
  actions?: RaceAction[];
};
const assert = (ok: unknown, msg: string) => {
  if (!ok) throw new Error(msg);
};
const shuffle = <T>(a: T[]) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const card = (type: Card["type"], value = 0, basic = false): Card => ({
  id: crypto.randomUUID(),
  type,
  value,
  basic,
});
export function player(
  name: string,
  token: string,
  i: number,
  bot = false,
): Player {
  return {
    id: crypto.randomUUID(),
    token,
    name: name.trim().slice(0, 18) || "车手",
    color: COLORS[i],
    bot,
    pos: 0,
    lane: 0,
    gear: 1,
    engine: 6,
    deck: [],
    hand: [],
    discard: [],
    played: [],
    plan: false,
    rank: null,
  };
}
export function room(
  code: string,
  name: string,
  token: string,
  laps = 2,
  trackId: TrackId = "coastline",
): Room {
  const p = player(name, token, 0);
  return {
    code,
    host: p.id,
    phase: "lobby",
    laps: laps === 1 ? 1 : getTrack(trackId).laps,
    trackId,
    round: 0,
    players: [p],
    queue: [],
    turn: null,
    log: ["房间已创建，等待车手。"],
    requests: [],
    version: 0,
  };
}
function recordAction(r: Room, p: Player, text: string) {
  r.actions = [...(r.actions || []), {
    id: crypto.randomUUID(),
    round: r.round,
    playerId: p.id,
    text,
  }].slice(-120);
}
function log(r: Room, s: string, p?: Player) {
  r.log = [...r.log, s].slice(-80);
  if (p) recordAction(r, p, s);
}
function draw(p: Player): Card | undefined {
  if (!p.deck.length) p.deck = shuffle(p.discard.splice(0));
  return p.deck.pop();
}
function refill(p: Player) {
  while (p.hand.length < 7) {
    const c = draw(p);
    if (!c) break;
    p.hand.push(c);
  }
}
function heat(p: Player, n: number) {
  assert(p.engine >= n, "引擎中的热量不足");
  p.engine -= n;
  for (let i = 0; i < n; i++) p.discard.push(card("heat"));
}
function randomSpeed(r: Room, p: Player, kind: FlipReveal["kind"]): number {
  let c: Card | undefined;
  const cards: Card[] = [];
  assert(
    [...p.deck, ...p.discard].some((c) => c.type === "speed" && c.basic),
    "牌库中没有可翻出的基础速度牌",
  );
  while ((c = draw(p))) {
    cards.push(c);
    if (c.type === "speed" && c.basic) {
      p.played.push(c);
      r.reveals = [...(r.reveals || []), {
        id: crypto.randomUUID(),
        round: r.round,
        playerId: p.id,
        kind,
        cards,
        value: c.value,
        at: Date.now(),
      }].slice(-64);
      return c.value;
    }
    p.discard.push(c);
  }
  return 0;
}
export function order(r: Room) {
  return r.players
    .filter((p) => !p.rank)
    .sort((a, b) => compareCars(getTrack(r.trackId), a, b));
}
function land(r: Room, p: Player, pos: number) {
  const length = getTrack(r.trackId).length;
  while (
    r.players.filter(
      (x) =>
        x.id !== p.id &&
        !x.rank &&
        ((x.pos % length) + length) % length ===
          ((pos % length) + length) % length,
    ).length >= 2
  )
    pos--;
  const preferred = innerLane(getTrack(r.trackId), pos);
  const taken = r.players.some(
    (x) =>
      x.id !== p.id &&
      !x.rank &&
      ((x.pos % length) + length) % length ===
        ((pos % length) + length) % length &&
      x.lane === preferred,
  );
  p.pos = pos;
  p.lane = taken ? 1 - preferred : preferred;
}
export function crossed(
  start: number,
  end: number,
  finish: number,
  track: Track = TRACK,
) {
  const length = track.length;
  const list: { at: number; limit: number }[] = [];
  for (
    let lap = Math.max(0, Math.floor(start / length));
    lap <= Math.floor(end / length);
    lap++
  )
    for (const c of track.corners) {
      const at = lap * length + c.at;
      if (start < at && end >= at && at < finish)
        list.push({ at, limit: c.limit });
    }
  return list;
}
export function canSlip(r: Room, p: Player) {
  const length = getTrack(r.trackId).length;
  const cell = (pos: number) => ((pos % length) + length) % length;
  return (
    p.pos + 2 < length * r.laps &&
    r.players.some(
      (x) =>
        x.id !== p.id &&
        !x.rank &&
        (cell(x.pos) === cell(p.pos) || cell(x.pos) === cell(p.pos + 1)),
    )
  );
}
export function cornerCost(
  r: Room,
  p: Player,
  speed: number,
  start = p.pos,
  end = p.pos,
) {
  return crossed(
    start,
    end,
    getTrack(r.trackId).length * r.laps,
    getTrack(r.trackId),
  ).reduce((n, c) => n + Math.max(0, speed - c.limit), 0);
}
function newRound(r: Room) {
  const finishers = order(r).filter(
    (p) => p.pos >= r.laps * getTrack(r.trackId).length,
  );
  let rank = r.players.filter((p) => p.rank).length;
  for (const p of finishers) {
    p.rank = ++rank;
    log(r, `${p.name} 完赛，获得第 ${rank} 名！`, p);
  }
  if (r.players.every((p) => p.rank)) {
    r.phase = "finished";
    r.turn = null;
    return;
  }
  r.round++;
  r.phase = "plan";
  r.turn = null;
  r.queue = order(r).map((p) => p.id);
  for (const p of r.players) p.plan = false;
  log(r, `第 ${r.round} 回合：同时换挡并选牌。`);
}
function next(r: Room) {
  r.turn = null;
  while (r.queue.length) {
    const id = r.queue[0];
    const p = r.players.find((p) => p.id === id)!;
    if (p.played.some((c) => c.type === "heat")) {
      p.gear = 1;
      p.discard.push(...p.played.splice(0));
      refill(p);
      log(r, `${p.name} 手牌过热，原地停留并降至 1 挡。`, p);
      r.queue.shift();
      continue;
    }
    const start = p.pos;
    recordAction(r, p, `${p.name} 打出：${p.played.map((c) => c.type === "stress" ? "压力" : `速度 ${c.value}`).join("、")}。`);
    let speed = 0;
    const stress: number[] = [];
    for (const c of [...p.played]) {
      if (c.type === "speed") speed += c.value;
      else if (c.type === "stress") {
        const n = randomSpeed(r, p, "stress");
        stress.push(n);
        speed += n;
      }
    }
    land(r, p, start + speed);
    const count = r.players.length;
    const tail = count >= 5 ? 2 : 1;
    const adrenaline = r.queue.length <= tail;
    r.turn = {
      id,
      start,
      speed,
      cool: (p.gear === 1 ? 3 : p.gear === 2 ? 1 : 0) + (adrenaline ? 1 : 0),
      boost: false,
      adrenaline: !adrenaline,
      slip: false,
      step: "react",
      stress,
    };
    r.phase = "turn";
    log(
      r,
      `${p.name} 以速度 ${speed} 前进${stress.length ? "（压力：" + stress.join("+") + "）" : ""}。`,
      p,
    );
    return;
  }
  newRound(r);
}
function checkCorners(r: Room, p: Player) {
  const t = r.turn!;
  for (const c of crossed(
    t.start,
    p.pos,
    getTrack(r.trackId).length * r.laps,
    getTrack(r.trackId),
  )) {
    const cost = Math.max(0, t.speed - c.limit);
    if (cost > p.engine) {
      heat(p, p.engine);
      land(r, p, c.at - 1);
      const stress = p.gear <= 2 ? 1 : 2;
      for (let i = 0; i < stress; i++) p.hand.push(card("stress"));
      p.gear = 1;
      log(
        r,
        `${p.name} 在限速 ${c.limit} 的弯道打滑！退回弯前，增加 ${stress} 张压力牌。`,
        p,
      );
      break;
    }
    if (cost) {
      heat(p, cost);
      log(r, `${p.name} 过弯支付 ${cost} 热量。`, p);
    }
  }
  t.step = "discard";
}
export function configure(r: Room, trackId: unknown, laps: unknown) {
  assert(r.phase === "lobby", "只能在比赛开始前选择赛道");
  assert(isTrackId(trackId), "赛道不存在");
  r.trackId = trackId as TrackId;
  r.laps = laps === 1 ? 1 : getTrack(r.trackId).laps;
  log(r, `赛道改为${getTrack(r.trackId).name}，${r.laps} 圈。`);
}
export function start(r: Room) {
  assert(r.phase === "lobby", "比赛已经开始");
  assert(r.players.length >= 2, "至少需要两名车手，可以添加电脑");
  shuffle(r.players);
  r.reveals = [];
  r.actions = [];
  r.players.forEach((p, i) => {
    p.pos = -Math.floor(i / 2);
    p.lane = (innerLane(getTrack(r.trackId), p.pos) + (i % 2)) % 2;
    p.gear = 1;
    p.engine = 6;
    p.rank = null;
    p.discard = [];
    p.played = [];
    p.hand = [];
    p.deck = shuffle([
      ...[1, 2, 3, 4].flatMap((v) =>
        Array.from({ length: 3 }, () => card("speed", v, true)),
      ),
      card("speed", 0),
      card("speed", 5),
      card("heat"),
      ...Array.from({ length: 3 }, () => card("stress")),
    ]);
    refill(p);
  });
  r.round = 0;
  log(r, "绿灯亮起，比赛开始！");
  newRound(r);
}
export function plan(r: Room, p: Player, gear: number, ids: string[]) {
  assert(r.phase === "plan" && !p.rank && !p.plan, "当前不能提交选牌");
  assert(
    Number.isInteger(gear) &&
      gear >= 1 &&
      gear <= 4 &&
      Math.abs(gear - p.gear) <= 2,
    "只能换一挡，支付热量可换两挡",
  );
  assert(Array.isArray(ids) && new Set(ids).size === ids.length, "选牌无效");
  const playable = p.hand.filter((c) => c.type !== "heat");
  if (playable.length < gear) {
    ids = [
      ...playable.map((c) => c.id),
      ...p.hand
        .filter((c) => c.type === "heat")
        .slice(0, gear - playable.length)
        .map((c) => c.id),
    ];
  }
  assert(
    ids.length === gear && ids.every((id) => p.hand.some((c) => c.id === id)),
    "所选牌数必须等于挡位",
  );
  assert(
    playable.length < gear ||
      ids.every((id) => p.hand.find((c) => c.id === id)!.type !== "heat"),
    "热量牌不能主动打出",
  );
  if (Math.abs(gear - p.gear) === 2) heat(p, 1);
  p.gear = gear;
  p.played = ids.map((id) => p.hand.find((c) => c.id === id)!);
  p.hand = p.hand.filter((c) => !ids.includes(c.id));
  p.plan = true;
  recordAction(r, p, `${p.name} 已锁定选牌（${gear} 挡）。`);
  if (r.players.filter((p) => !p.rank).every((p) => p.plan)) next(r);
}
export function react(r: Room, p: Player, action: string, ids: string[] = []) {
  assert(r.phase === "turn" && r.turn?.id === p.id, "请等待你的行动回合");
  const t = r.turn!;
  if (t.step === "discard") {
    assert(action === "finish", "当前需要弃牌并结束回合");
    assert(
      Array.isArray(ids) &&
        new Set(ids).size === ids.length &&
        ids.every((id) =>
          p.hand.some((c) => c.id === id && c.type === "speed"),
        ),
      "只能弃掉手中的速度牌",
    );
    p.discard.push(...p.hand.filter((c) => ids.includes(c.id)));
    p.hand = p.hand.filter((c) => !ids.includes(c.id));
    p.discard.push(...p.played.splice(0));
    refill(p);
    recordAction(r, p, `${p.name} 弃掉 ${ids.length} 张速度牌，补牌至 ${p.hand.length} 张，结束回合。`);
    r.queue.shift();
    next(r);
    return;
  }
  if (action === "cool") {
    assert(t.cool > 0, "本回合没有剩余冷却");
    const i = p.hand.findIndex((c) => c.type === "heat");
    assert(i >= 0, "手中没有热量牌");
    p.hand.splice(i, 1);
    p.engine++;
    t.cool--;
    log(r, `${p.name} 冷却 1 张热量牌。`, p);
  } else if (action === "boost") {
    assert(!t.boost, "每回合只能加速一次");
    heat(p, 1);
    t.boost = true;
    const n = randomSpeed(r, p, "boost");
    t.speed += n;
    land(r, p, p.pos + n);
    log(r, `${p.name} 加速 +${n}。`, p);
  } else if (action === "adrenaline") {
    assert(!t.adrenaline, "没有可用的肾上腺素加速");
    t.adrenaline = true;
    t.speed++;
    land(r, p, p.pos + 1);
    log(r, `${p.name} 使用肾上腺素前进 1 格。`, p);
  } else if (action === "check" || action === "slip") {
    if (action === "slip") {
      assert(canSlip(r, p), "当前不能尾流，或尾流会跨越终点");
      land(r, p, p.pos + 2);
      t.slip = true;
      log(r, `${p.name} 使用尾流前进 2 格。`, p);
    }
    checkCorners(r, p);
    recordAction(r, p, `${p.name} 完成弯道检查。`);
  } else throw new Error("未知行动");
}
function combinations<T>(a: T[], n: number): T[][] {
  if (n === 0) return [[]];
  if (a.length < n) return [];
  return a.flatMap((x, i) =>
    combinations(a.slice(i + 1), n - 1).map((v) => [x, ...v]),
  );
}
export function botChoice(r: Room, p: Player) {
  let best: { gear: number; ids: string[]; score: number } | null = null;
  for (let gear = 1; gear <= 4; gear++) {
    if (
      Math.abs(p.gear - gear) > 2 ||
      (Math.abs(p.gear - gear) === 2 && p.engine === 0)
    )
      continue;
    const playable = p.hand.filter((c) => c.type !== "heat");
    for (const cards of combinations(
      playable,
      Math.min(gear, playable.length),
    )) {
      const speed = cards.reduce(
        (n, c) => n + (c.type === "stress" ? 2.5 : c.value),
        0,
      );
      const engine =
        p.engine -
        (Math.abs(p.gear - gear) === 2 ? 1 : 0) +
        Math.min(
          p.hand.filter((c) => c.type === "heat").length,
          gear === 1 ? 3 : gear === 2 ? 1 : 0,
        );
      const cost = cornerCost(r, p, speed, p.pos, p.pos + speed);
      const score =
        (playable.length < gear ? -50 : speed) -
        Math.max(0, cost - engine) * 14 -
        cost * 0.7 +
        (gear === 1
          ? Math.min(3, p.hand.filter((c) => c.type === "heat").length)
          : 0) *
          1.2;
      if (!best || score > best.score)
        best = { gear, ids: cards.map((c) => c.id), score };
    }
  }
  return { gear: best?.gear ?? 1, ids: best?.ids ?? [] };
}
export function botPlan(r: Room, p: Player) {
  const choice = botChoice(r, p);
  plan(r, p, choice.gear, choice.ids);
}
export function autoBots(r: Room) {
  for (let guard = 0; guard < 1200; guard++) {
    if (r.phase === "plan") {
      for (const p of r.players.filter((p) => p.bot && !p.rank && !p.plan))
        botPlan(r, p);
      if (r.phase === "plan") return;
    }
    if (r.phase === "turn") {
      const p = r.players.find((p) => p.id === r.turn!.id)!;
      if (!p.bot) return;
      const t = r.turn!;
      if (t.step === "discard") {
        react(
          r,
          p,
          "finish",
          p.hand
            .filter((c) => c.type === "speed" && c.value === 0)
            .map((c) => c.id),
        );
        continue;
      }
      while (t.cool && p.hand.some((c) => c.type === "heat"))
        react(r, p, "cool");
      const slip =
        canSlip(r, p) &&
        cornerCost(r, p, t.speed, t.start, p.pos + 2) <= p.engine;
      react(r, p, slip ? "slip" : "check");
      continue;
    }
    return;
  }
}
export function view(r: Room, token: string) {
  const me = r.players.find((p) => p.token === token);
  assert(me, "你不在这个房间，请先加入");
  return {
    ...r,
    requests: undefined,
    host: r.host,
    me: me!.id,
    players: r.players.map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      bot: p.bot,
      pos: p.pos,
      lane: p.lane,
      gear: p.gear,
      engine: p.engine,
      plan: p.plan,
      rank: p.rank,
      handCount: p.hand.length,
      deckCount: p.deck.length,
      discardCount: p.discard.length,
      discardTop: p.discard.at(-1),
      hand: p.id === me!.id ? p.hand : [],
      played: r.phase === "plan" ? [] : p.played,
    })),
    canSlip: r.turn
      ? canSlip(r, r.players.find((p) => p.id === r.turn!.id)!)
      : false,
  };
}
