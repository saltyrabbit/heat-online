import {
  getTrack,
  isTrackId,
  type Track,
  type TrackId,
  terrainAt,
  roadCorners,
} from "./tracks.ts";
import { compareCars, innerLane } from "./track-geometry.ts";
import {
  modules,
  maxCars,
  DEFAULT_MODULES,
  UPGRADES,
  WEATHERS,
  ROAD_KINDS,
  WEATHER_LABELS,
  upgrade,
  sectorEffect,
  roadAt,
  speedRange,
  type Modules,
  type Weather,
  type Road,
  type Effects,
} from "./modules.ts";
export const TRACK = getTrack("coastline");
export const COLORS = [
  "#ef573f",
  "#50a9e8",
  "#f0c34b",
  "#53b99b",
  "#b28ae2",
  "#ef92b5",
  "#f49f42",
  "#dfdfdb",
  "#313b48",
];
export type Card = {
  id: string;
  type: "speed" | "stress" | "heat";
  value: number;
  basic?: boolean;
  upgrade?: number;
};
export type FlipReveal = {
  id: string;
  round: number;
  playerId: string;
  kind: "stress" | "boost" | "upgrade";
  cards: Card[];
  value: number;
  at: number;
};
export type ActionKind =
  | "plan"
  | "played"
  | "stress"
  | "boost"
  | "move"
  | "cool"
  | "adrenaline"
  | "slip"
  | "corner"
  | "spin"
  | "finish"
  | "end"
  | "stall"
  | "upgrade"
  | "draft";
export type RaceAction = {
  id: string;
  round: number;
  playerId: string;
  text: string;
  kind?: ActionKind;
  cards?: Card[];
  revealId?: string;
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
  upgrades?: Card[];
  refreshIds?: string[];
};
export type Turn = {
  id: string;
  start: number;
  speed: number;
  cool: number;
  boost: boolean;
  adrenaline: boolean;
  slip: boolean;
  step: "reveal" | "react" | "slip" | "discard";
  slips?: number;
  plus?: number;
  effects?: Record<string, { used: string[]; cool: number }>;
  weatherCoolUsed?: boolean;
  stress: number[];
};
export type Room = {
  code: string;
  host: string;
  phase: "lobby" | "draft" | "plan" | "turn" | "finished";
  modules?: Modules;
  weather?: Weather;
  roads?: Road[];
  garage?: { round: number; deck: Card[]; market: Card[]; queue: string[] };
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
  pendingDiscards?: string[];
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
    modules: {
      ...DEFAULT_MODULES,
      ...(getTrack(trackId).pack ? { [getTrack(trackId).pack!]: true } : {}),
    },
    laps: laps === 1 ? 1 : getTrack(trackId).laps,
    trackId,
    round: 0,
    players: [p],
    queue: [],
    turn: null,
    pendingDiscards: [],
    log: ["房间已创建，等待车手。"],
    requests: [],
    version: 0,
  };
}
function recordAction(
  r: Room,
  p: Player,
  text: string,
  details: Pick<RaceAction, "kind" | "cards" | "revealId"> = {},
) {
  r.actions = [
    ...(r.actions || []),
    {
      id: crypto.randomUUID(),
      round: r.round,
      playerId: p.id,
      text,
      ...details,
    },
  ].filter((a) => a.round >= r.round - 1);
}
function log(r: Room, s: string, p?: Player, kind?: ActionKind) {
  r.log = [...r.log, s].slice(-80);
  if (p) recordAction(r, p, s, { kind });
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
      const reveal: FlipReveal = {
        id: crypto.randomUUID(),
        round: r.round,
        playerId: p.id,
        kind,
        cards,
        value: c.value,
        at: Date.now(),
      };
      r.reveals = [...(r.reveals || []), reveal].filter(
        (x) => x.round >= r.round - 1,
      );
      if (r.turn?.id === p.id) r.turn.plus = (r.turn.plus || 0) + 1;
      recordAction(
        r,
        p,
        kind === "stress"
          ? `${p.name} 压力翻牌：速度 +${c.value}。`
          : `${p.name} ${kind === "boost" ? "加速" : "升级"}翻牌：速度 +${c.value}。`,
        { kind, revealId: reveal.id },
      );
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
  if (sectorEffect(r, p.pos, getTrack(r.trackId)) === "noSlip") return false;
  if (r.turn?.id === p.id && (r.turn.slips || 0) >= 1 + extraSlips(p))
    return false;
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
  ).reduce((n, c) => n + costAt(r, p, speed, c.at, c.limit), 0);
}
function newRound(r: Room) {
  assert(!r.pendingDiscards?.length, "还有车手未完成收尾");
  const finishers = order(r).filter(
    (p) => p.pos >= r.laps * getTrack(r.trackId).length,
  );
  let rank = r.players.filter((p) => p.rank).length;
  for (const p of finishers) {
    p.rank = ++rank;
    log(r, `${p.name} 完赛，获得第 ${rank} 名！`, p, "finish");
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
      log(r, `${p.name} 手牌过热，原地停留并降至 1 挡。`, p, "stall");
      r.queue.shift();
      continue;
    }
    const count = r.players.length;
    const adrenaline = r.queue.length <= (count >= 5 ? 2 : 1);
    r.turn = {
      id,
      start: p.pos,
      speed: 0,
      cool: (p.gear === 1 ? 3 : p.gear === 2 ? 1 : 0) + (adrenaline ? 1 : 0),
      boost: false,
      adrenaline: !adrenaline,
      slip: false,
      step: "reveal",
      stress: [],
      plus: 0,
      effects: {},
    };
    r.phase = "turn";
    for (const c of [...p.played]) {
      const u = upgrade(c);
      if (u) c.value = u.speed[0];
      if (c.type === "stress") {
        const n = randomSpeed(r, p, "stress");
        r.turn.stress.push(n);
        r.turn.speed += n;
      } else {
        if (!u || u.speed.length === 1) r.turn.speed += c.value;
        for (let i = 0; i < (u?.plus || 0); i++)
          r.turn.speed += randomSpeed(r, p, "upgrade");
      }
    }
    if (!p.played.some((c) => (upgrade(c)?.speed.length || 0) > 1))
      revealMove(r, p);
    return;
  }
  if (r.pendingDiscards?.length) {
    r.phase = "turn";
    return;
  }
  newRound(r);
}
// Old saved rooms used a single discard turn. Release their next driver on
// the next mutation, while preserving the previous driver's discard decision.
function migrateCleanup(r: Room) {
  if (r.phase === "turn" && r.turn?.step === "discard") {
    const id = r.turn.id;
    r.pendingDiscards = [...new Set([...(r.pendingDiscards || []), id])];
    r.queue = r.queue.filter((x) => x !== id);
    next(r);
  }
}
function checkCorners(r: Room, p: Player) {
  const t = r.turn!;
  for (const c of crossed(
    t.start,
    p.pos,
    getTrack(r.trackId).length * r.laps,
    getTrack(r.trackId),
  )) {
    const cost = costAt(r, p, t.speed, c.at, c.limit);
    const limit = cornerLimit(r, p, c.at, c.limit);
    if (cost > p.engine) {
      heat(p, p.engine);
      land(r, p, c.at - 1);
      const stress = p.gear <= 2 ? 1 : 2;
      for (let i = 0; i < stress; i++) p.hand.push(card("stress"));
      p.gear = 1;
      log(
        r,
        `${p.name} 在限速 ${limit} 的弯道打滑！退回弯前，增加 ${stress} 张压力牌。`,
        p,
        "spin",
      );
      break;
    }
    if (cost) {
      heat(p, cost);
      log(r, `${p.name} 过弯支付 ${cost} 热量。`, p, "corner");
    }
  }
  t.step = "discard";
}
export function configure(
  r: Room,
  trackId: unknown,
  laps: unknown,
  settings?: unknown,
) {
  assert(r.phase === "lobby", "只能在比赛开始前选择赛道");
  assert(isTrackId(trackId), "赛道不存在");
  const nextSettings =
    settings === undefined ? modules(r.modules) : modules(settings);
  const pack = getTrack(trackId as TrackId).pack;
  if (pack) nextSettings[pack] = true;
  assert(
    r.players.length <= maxCars(nextSettings),
    "当前车手数超过关闭扩展后的上限，请先移除多余车手",
  );
  r.modules = nextSettings;
  r.trackId = trackId as TrackId;
  r.laps = laps === 1 ? 1 : getTrack(r.trackId).laps;
  log(r, `赛道改为${getTrack(r.trackId).name}，${r.laps} 圈。`);
}
export function makeUpgrade(number: number): Card {
  const u = UPGRADES[number - 1];
  assert(u, "升级牌不存在");
  return {
    ...card(u.heatCard ? "heat" : "speed", u.speed[0]),
    upgrade: number,
  };
}
export function upgradePool(settings: Modules): Card[] {
  return UPGRADES.filter((u) =>
    u.pack
      ? settings.advanced && settings[u.pack]
      : u.advanced
        ? settings.advanced
        : settings.regular,
  ).flatMap((u) => [makeUpgrade(u.number), makeUpgrade(u.number)]);
}
export function cornerLimit(
  r: Pick<Room, "roads" | "trackId">,
  p: Pick<Player, "played">,
  at: number,
  base: number,
) {
  const road = roadAt(
    r,
    ((at % getTrack(r.trackId).length) + getTrack(r.trackId).length) %
      getTrack(r.trackId).length,
  );
  return (
    base +
    (road?.kind === "limitUp" ? 1 : road?.kind === "limitDown" ? -1 : 0) +
    p.played.reduce((n, c) => n + (upgrade(c)?.effects.limit || 0), 0)
  );
}
function costAt(r: Room, p: Player, speed: number, at: number, base: number) {
  const excess = Math.max(0, speed - cornerLimit(r, p, at, base));
  return (
    excess +
    (excess && roadAt(r, at % getTrack(r.trackId).length)?.kind === "overheat"
      ? 1
      : 0)
  );
}
function effectState(t: Turn, id: string) {
  t.effects ||= {};
  return (t.effects[id] ||= { used: [], cool: 0 });
}
export function coolAvailable(r: Room, p: Player) {
  const t = r.turn;
  if (!t || t.id !== p.id || t.step !== "react") return 0;
  const weather = sectorEffect(r, p.pos, getTrack(r.trackId));
  if (weather === "noCool") return 0;
  return (
    t.cool +
    (weather === "cool1" && !t.weatherCoolUsed ? 1 : 0) +
    p.played.reduce(
      (n, c) =>
        n +
        Math.max(
          0,
          (upgrade(c)?.effects.cool || 0) - (t.effects?.[c.id]?.cool || 0),
        ),
      0,
    )
  );
}
export function boostCost(
  r: Pick<Room, "roads" | "weather" | "trackId">,
  p: Pick<Player, "pos">,
) {
  return sectorEffect(r, p.pos, getTrack(r.trackId)) === "freeBoost" ? 0 : 1;
}
export function slipDistances(r: Room, p: Player) {
  if (!canSlip(r, p)) return [];
  const bonuses = p.played
    .map((c) => upgrade(c)?.effects.slip || 0)
    .filter(Boolean);
  const e = sectorEffect(r, p.pos, getTrack(r.trackId));
  if (e === "slip") bonuses.push(1);
  if (e === "slip2") bonuses.push(2);
  let distances = [2];
  for (const n of bonuses)
    distances = [...new Set([...distances, ...distances.map((x) => x + n)])];
  return distances
    .filter((n) => p.pos + n < getTrack(r.trackId).length * r.laps)
    .sort((a, b) => a - b);
}
function accelerateCount(p: Player, t: Turn) {
  return p.played.filter(
    (c) =>
      upgrade(c)?.effects.accelerate &&
      t.effects?.[c.id]?.used.includes("accelerate"),
  ).length;
}
function moveExtra(r: Room, p: Player, n: number) {
  r.turn!.speed += n;
  land(r, p, p.pos + n);
}
function revealMove(r: Room, p: Player) {
  const t = r.turn!;
  t.step = "react";
  land(r, p, t.start + t.speed);
  log(
    r,
    `${p.name} 以速度 ${t.speed} 前进${t.stress.length ? "（压力：" + t.stress.join("+") + "）" : ""}。`,
    p,
    "move",
  );
}
function beginRace(r: Room) {
  const w = r.weather;
  for (const p of r.players) {
    p.engine =
      (getTrack(r.trackId).engine ?? 6) +
      (w?.engine || 0) -
      (w?.deckHeat || 0) -
      (w?.discardHeat || 0);
    p.discard = Array.from({ length: w?.discardHeat || 0 }, () => card("heat"));
    const upgrades =
      r.modules?.regular || r.modules?.advanced
        ? p.upgrades!
        : [card("speed", 0), card("speed", 5), card("heat")];
    p.deck = shuffle([
      ...Array.from({ length: 12 }, (_, i) =>
        card("speed", Math.floor(i / 3) + 1, true),
      ),
      ...upgrades,
      ...Array.from(
        { length: (getTrack(r.trackId).stress ?? 3) + (w?.stress || 0) },
        () => card("stress"),
      ),
      ...Array.from({ length: w?.deckHeat || 0 }, () => card("heat")),
    ]);
    refill(p);
  }
  r.garage = undefined;
  log(r, "绿灯亮起，比赛开始！");
  newRound(r);
}
function draftMarket(r: Room) {
  const g = r.garage!;
  g.market = g.deck.splice(0, r.players.length + 3);
  g.queue = (g.round === 2 ? [...r.players] : [...r.players].reverse()).map(
    (p) => p.id,
  );
  log(
    r,
    `车库第 ${g.round}/3 轮选牌：${g.round === 2 ? "从前到后" : "从后到前"}。`,
  );
}
export function draft(r: Room, p: Player, id: string) {
  assert(
    r.phase === "draft" && r.garage?.queue[0] === p.id,
    "请等待你的车库选牌顺序",
  );
  const g = r.garage!,
    i = g.market.findIndex((c) => c.id === id);
  assert(i >= 0, "此升级牌不在市场中");
  const c = g.market.splice(i, 1)[0];
  (p.upgrades ||= []).push(c);
  recordAction(r, p, `${p.name} 选择 #${c.upgrade} ${upgrade(c)!.name}。`, {
    kind: "draft",
    cards: [c],
  });
  g.queue.shift();
  if (!g.queue.length) {
    if (g.round === 3) beginRace(r);
    else {
      g.round++;
      draftMarket(r);
    }
  }
}
export function start(r: Room) {
  assert(r.phase === "lobby", "比赛已经开始");
  assert(r.players.length >= 2, "至少需要两名车手，可以添加电脑");
  r.modules = modules(r.modules);
  const track = getTrack(r.trackId);
  if (track.pack) r.modules[track.pack] = true;
  assert(r.players.length <= maxCars(r.modules), "房间车手超过人数上限");
  shuffle(r.players);
  r.reveals = [];
  r.actions = [];
  r.pendingDiscards = [];
  r.round = 0;
  r.turn = null;
  r.queue = [];
  r.weather = r.modules.weather ? shuffle([...WEATHERS])[0] : undefined;
  r.roads = r.modules.weather
    ? shuffle(ROAD_KINDS.flatMap((kind) => [kind, kind]))
        .slice(0, roadCorners(track).length)
        .map((kind, i) => ({ kind, at: roadCorners(track)[i].at }))
    : undefined;
  r.players.forEach((p, i) => {
    p.pos = -Math.floor(i / 2);
    p.lane = (innerLane(getTrack(r.trackId), p.pos) + (i % 2)) % 2;
    p.gear = 1;
    p.engine = 6;
    p.rank = null;
    p.discard = [];
    p.played = [];
    p.hand = [];
    p.deck = [];
    p.upgrades = [];
    p.refreshIds = [];
    p.plan = false;
  });
  if (r.weather)
    log(
      r,
      `天气：${r.weather.name}。${r.weather.setup}；天气路段：${WEATHER_LABELS[r.weather.effect]}。`,
    );
  if (r.modules.regular || r.modules.advanced) {
    r.phase = "draft";
    r.garage = {
      round: 1,
      deck: shuffle(upgradePool(r.modules)),
      market: [],
      queue: [],
    };
    draftMarket(r);
  } else beginRace(r);
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
  const shiftHeat = shiftCost(r, p, gear);
  heat(p, shiftHeat);
  p.gear = gear;
  p.played = ids.map((id) => p.hand.find((c) => c.id === id)!);
  p.hand = p.hand.filter((c) => !ids.includes(c.id));
  p.plan = true;
  recordAction(r, p, `${p.name} 已锁定选牌（${gear} 挡）。`, { kind: "plan" });
  if (r.players.filter((p) => !p.rank).every((p) => p.plan)) {
    for (const driver of r.players.filter((p) => !p.rank)) {
      recordAction(
        r,
        driver,
        `${driver.name} 打出 ${driver.played.length} 张牌（${driver.gear} 挡）。`,
        {
          kind: "played",
          cards: [...driver.played],
        },
      );
    }
    next(r);
  }
}
export type ReactOptions = {
  cardId?: string;
  effect?: keyof Effects;
  values?: Record<string, number>;
  distance?: number;
  cardIds?: string[];
};
export function react(
  r: Room,
  p: Player,
  action: string,
  ids: string[] = [],
  options: ReactOptions = {},
) {
  migrateCleanup(r);
  if (r.phase === "turn" && r.pendingDiscards?.includes(p.id)) {
    assert(
      !ids.length || terrainAt(getTrack(r.trackId), p.pos, p.lane) !== "tunnel",
      "隧道内不能从手牌弃牌",
    );
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
    const played = p.played.splice(0);
    // Step 9: refresh cards enter the deck before drawing; each driver's
    // selection survives asynchronous handoff to the next driver.
    for (const c of played) {
      const u = upgrade(c);
      if (u) c.value = u.speed[0];
    }
    p.discard.push(...played.filter((c) => !p.refreshIds?.includes(c.id)));
    for (const id of [...(p.refreshIds || [])].reverse()) {
      const c = played.find((c) => c.id === id);
      if (c) p.deck.push(c);
    }
    p.refreshIds = [];
    if (
      terrainAt(getTrack(r.trackId), p.pos, p.lane) === "gravel" &&
      p.engine > 0
    ) {
      heat(p, 1);
      log(r, `${p.name} 停在碎石车位，补牌前支付 1 热量。`, p, "corner");
    }
    refill(p);
    recordAction(
      r,
      p,
      `${p.name} 弃掉 ${ids.length} 张速度牌，补牌至 ${p.hand.length} 张，结束回合。`,
      { kind: "end" },
    );
    r.pendingDiscards = r.pendingDiscards.filter((id) => id !== p.id);
    if (!r.turn && !r.queue.length && !r.pendingDiscards.length) newRound(r);
    return;
  }
  assert(r.phase === "turn" && r.turn?.id === p.id, "请等待你的行动回合");
  const t = r.turn!;
  if (t.step === "reveal") {
    assert(action === "values", "请先在翻牌后选择可变速度");
    const variable = p.played.filter(
      (c) => (upgrade(c)?.speed.length || 0) > 1,
    );
    assert(
      options.values &&
        Object.keys(options.values).length === variable.length &&
        variable.every((c) =>
          upgrade(c)!.speed.includes(options.values![c.id]),
        ),
      "请选择每张升级牌允许的速度",
    );
    for (const c of variable) {
      c.value = options.values![c.id];
      t.speed += c.value;
    }
    recordAction(
      r,
      p,
      `${p.name} 选择升级速度：${variable.map((c) => "#" + c.upgrade + " = " + c.value).join("、")}。`,
      { kind: "upgrade", cards: variable.map((c) => ({ ...c })) },
    );
    revealMove(r, p);
    return;
  }
  assert(
    t.step === "react" ||
      (t.step === "slip" && ["slip", "check"].includes(action)),
    "当前不能反应，连续尾流阶段只可继续尾流或检查弯道",
  );
  if (action === "direct") {
    const c = p.hand.find((c) => c.id === options.cardId);
    assert(c && upgrade(c)?.effects.direct, "此牌不能在反应阶段追加");
    p.hand = p.hand.filter((x) => x.id !== c!.id);
    p.played.push(c!);
    c!.value = upgrade(c!)!.speed[0];
    const before = t.plus || 0;
    let n = c!.value;
    for (let i = 0; i < upgrade(c!)!.plus; i++)
      n += randomSpeed(r, p, "upgrade");
    n += ((t.plus || 0) - before) * accelerateCount(p, t);
    moveExtra(r, p, n);
    recordAction(
      r,
      p,
      `${p.name} 追加 #${c!.upgrade} ${upgrade(c!)!.name}，速度 +${n}。`,
      { kind: "upgrade", cards: [{ ...c! }] },
    );
  } else if (action === "draftMove") {
    applyDraft(r, p, options);
  } else if (action === "effect") {
    applyEffect(r, p, options.cardId, options.effect, ids);
  } else if (action === "replace") {
    replaceUpgrade(r, p, options.cardId);
  } else if (action === "cool") {
    assert(coolAvailable(r, p) > 0, "本回合没有剩余冷却，或当前路段禁止冷却");
    const i = p.hand.findIndex((c) => c.type === "heat");
    assert(i >= 0, "手中没有热量牌");
    p.hand.splice(i, 1);
    p.engine++;
    if (t.cool > 0) t.cool--;
    else if (
      sectorEffect(r, p.pos, getTrack(r.trackId)) === "cool1" &&
      !t.weatherCoolUsed
    )
      t.weatherCoolUsed = true;
    else {
      const c = p.played.find(
        (c) => (upgrade(c)?.effects.cool || 0) > (t.effects?.[c.id]?.cool || 0),
      )!;
      effectState(t, c.id).cool++;
    }
    log(r, `${p.name} 冷却 1 张热量牌。`, p, "cool");
  } else if (action === "boost") {
    assert(!t.boost, "每回合只能加速一次");
    assert(
      [...p.deck, ...p.discard].some((c) => c.basic && c.type === "speed"),
      "牌库中没有可加速翻出的基础速度牌",
    );
    const cost = boostCost(r, p);
    heat(p, cost);
    t.boost = true;
    const extra = accelerateCount(p, t);
    const n = randomSpeed(r, p, "boost") + extra;
    t.speed += n;
    land(r, p, p.pos + n);
    log(r, `${p.name} ${cost ? "支付 1 热量" : "免热量"}加速 +${n}。`);
    if (extra)
      log(r, `${p.name} 翻牌加速额外增加 ${extra} 速度。`, p, "upgrade");
  } else if (action === "adrenaline") {
    assert(!t.adrenaline, "没有可用的肾上腺素加速");
    t.adrenaline = true;
    t.speed++;
    land(r, p, p.pos + 1);
    log(r, `${p.name} 使用肾上腺素前进 1 格。`, p, "adrenaline");
  } else if (action === "check" || action === "slip") {
    assert(
      !mandatoryPending(p, t).length,
      "请先结算升级牌的必付热量和必弃牌库效果",
    );
    if (action === "slip") {
      assert(canSlip(r, p), "当前不能尾流，或尾流会跨越终点");
      const distance = options.distance ?? 2;
      assert(
        slipDistances(r, p).includes(distance),
        "尾流距离无效或会跨越终点",
      );
      land(r, p, p.pos + distance);
      t.slip = true;
      t.slips = (t.slips || 0) + 1;
      log(
        r,
        `${p.name} 使用第 ${t.slips} 次尾流前进 ${distance} 格。`,
        p,
        "slip",
      );
      if (t.slips < 1 + extraSlips(p) && canSlip(r, p)) {
        t.step = "slip";
        return;
      }
    }
    checkCorners(r, p);
    recordAction(r, p, `${p.name} 完成弯道检查。`, { kind: "corner" });
    r.pendingDiscards = [...(r.pendingDiscards || []), p.id];
    r.queue.shift();
    next(r);
  } else throw new Error("未知行动");
}
export function mandatoryPending(p: Player, t: Turn) {
  return p.played.flatMap((c) => {
    const e = upgrade(c)?.effects;
    return (["heat", "scrap"] as const)
      .filter((k) => e?.[k] && !t.effects?.[c.id]?.used.includes(k))
      .map((effect) => ({
        cardId: c.id,
        number: c.upgrade!,
        effect,
        amount: e![effect]!,
      }));
  });
}
function applyEffect(
  r: Room,
  p: Player,
  id: string | undefined,
  kind: keyof Effects | undefined,
  ids: string[],
) {
  const t = r.turn!,
    c = p.played.find((c) => c.id === id);
  assert(c, "升级牌尚未打出");
  const u = upgrade(c!)!,
    e = u?.effects;
  assert(
    kind &&
      e?.[kind] !== undefined &&
      [
        "heat",
        "scrap",
        "reduce",
        "salvage",
        "refresh",
        "accelerate",
        "superCool",
      ].includes(kind),
    "此牌没有该反应效果",
  );
  const state = effectState(t, c!.id);
  assert(!state.used.includes(kind!), "该效果本回合已经使用");
  assert(Array.isArray(ids) && new Set(ids).size === ids.length, "选牌无效");
  const selectedCards = (
    kind === "reduce" ? p.hand : kind === "salvage" ? p.discard : []
  ).filter((c) => ids.includes(c.id));
  if (kind === "superCool") {
    assert(
      sectorEffect(r, p.pos, getTrack(r.trackId)) !== "noCool",
      "当前路段禁止冷却，包括超级冷却",
    );
    let count = 0;
    p.discard = p.discard.filter((x) => {
      if (x.type !== "heat" || count >= e.superCool!) return true;
      count++;
      return false;
    });
    p.engine += count;
    log(
      r,
      `${p.name} #${u.number} 超级冷却，将 ${count} 张弃牌热量移回引擎区。`,
      p,
      "cool",
    );
  }
  if (kind === "heat") heat(p, e.heat!);
  if (kind === "scrap") {
    const discarded: Card[] = [];
    for (let i = 0; i < e.scrap!; i++) {
      const x = draw(p);
      if (x) {
        p.discard.push(x);
        discarded.push(x);
      }
    }
    recordAction(
      r,
      p,
      `${p.name} #${u.number} 从牌库弃掉 ${discarded.length} 张。`,
      { kind: "upgrade", cards: discarded },
    );
  }
  if (kind === "reduce") {
    assert(
      terrainAt(getTrack(r.trackId), p.pos, p.lane) !== "tunnel",
      "隧道内不能从手牌弃牌，减压也不可用",
    );
    assert(
      ids.length <= e.reduce! &&
        ids.every((id) =>
          p.hand.some((c) => c.id === id && c.type === "stress"),
        ),
      "只能选择允许数量的手牌压力牌",
    );
    p.discard.push(...p.hand.filter((c) => ids.includes(c.id)));
    p.hand = p.hand.filter((c) => !ids.includes(c.id));
  }
  if (kind === "salvage") {
    assert(
      ids.length <= e.salvage! &&
        ids.every((id) => p.discard.some((c) => c.id === id)),
      "只能回收允许数量的弃牌",
    );
    p.deck = shuffle([
      ...p.deck,
      ...p.discard.filter((c) => ids.includes(c.id)),
    ]);
    p.discard = p.discard.filter((c) => !ids.includes(c.id));
  }
  if (kind === "refresh") (p.refreshIds ||= []).push(c!.id);
  if (kind === "accelerate") moveExtra(r, p, t.plus || 0);
  state.used.push(kind!);
  if (kind !== "scrap" && kind !== "superCool") {
    const detail = {
      heat: `支付 ${e.heat} 热量`,
      reduce: `减压，弃掉 ${ids.length} 张压力牌`,
      salvage: `回收 ${ids.length} 张弃牌并洗入牌库`,
      refresh: "选择保留，收尾补牌前放回牌顶",
      accelerate: `启用翻牌加速，立即增加 ${t.plus || 0} 速度，后续每次翻牌再 +1`,
    }[kind as "heat" | "reduce" | "salvage" | "refresh" | "accelerate"];
    const text = `${p.name} #${u.number} ${detail}。`;
    log(r, text);
    recordAction(r, p, text, { kind: "upgrade", cards: selectedCards });
  }
}
function replaceUpgrade(r: Room, p: Player, id?: string) {
  const t = r.turn!,
    c = p.played.find((c) => c.id === id),
    u = c && upgrade(c);
  assert(
    c &&
      u?.effects.heat &&
      !t.effects?.[c.id]?.used.includes("heat") &&
      p.engine < u.effects.heat,
    "只有无力支付热量的升级牌可以替换",
  );
  p.played = p.played.filter((x) => x.id !== id);
  p.discard.push(c!);
  p.refreshIds = p.refreshIds?.filter((x) => x !== id);
  const before = t.plus || 0,
    n =
      randomSpeed(r, p, "upgrade") -
      c!.value +
      (t.plus! - before) * accelerateCount(p, t);
  moveExtra(r, p, n);
  log(
    r,
    `${p.name} 无法支付 #${u!.number} 的热量，弃掉并以随机基础牌替换。`,
    p,
    "upgrade",
  );
}
function combinations<T>(a: T[], n: number): T[][] {
  if (n === 0) return [[]];
  if (a.length < n) return [];
  return a.flatMap((x, i) =>
    combinations(a.slice(i + 1), n - 1).map((v) => [x, ...v]),
  );
}
export function botChoice(r: Room, p: Player) {
  // A low-gear spinout replaces one played Stress with one new Stress.
  // When the hand is clogged, play more than that replacement count so
  // replenishment can draw cooling Heat or useful upgrades again.
  if (
    p.engine === 0 &&
    p.hand.filter((c) => c.type === "stress").length >= 5 &&
    !p.hand.some((c) => c.type === "heat")
  ) {
    const preferred = p.gear === 4 ? 3 : p.gear + 1;
    const gear = shiftCost(r, p, preferred) <= p.engine ? preferred : p.gear;
    return {
      gear,
      ids: p.hand
        .filter((c) => c.type === "stress")
        .slice(0, gear)
        .map((c) => c.id),
    };
  }

  let best: { gear: number; ids: string[]; score: number } | null = null;
  for (let gear = 1; gear <= 4; gear++) {
    if (Math.abs(p.gear - gear) > 2 || shiftCost(r, p, gear) > p.engine)
      continue;
    const playable = p.hand.filter((c) => c.type !== "heat");
    for (const cards of combinations(
      playable,
      Math.min(gear, playable.length),
    )) {
      const speed = cards.reduce(
        (n, c) =>
          n +
          (c.type === "stress"
            ? 2.5
            : (speedRange(c)[0] + speedRange(c)[1]) / 2),
        0,
      );
      const engine =
        p.engine -
        shiftCost(r, p, gear) +
        Math.min(
          p.hand.filter((c) => c.type === "heat").length,
          gear === 1 ? 3 : gear === 2 ? 1 : 0,
        );
      const cost = cornerCost(
        r,
        { ...p, played: cards },
        speed,
        p.pos,
        p.pos + speed,
      );
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
function botDiscards(r: Room, p: Player) {
  if (terrainAt(getTrack(r.trackId), p.pos, p.lane) === "tunnel") return [];
  const track = getTrack(r.trackId),
    corner = crossed(
      p.pos,
      p.pos + track.length,
      track.length * r.laps,
      track,
    )[0];
  return p.hand
    .filter(
      (c) =>
        c.type === "speed" &&
        ((c.value === 0 && !c.upgrade) ||
          (p.engine === 0 &&
            corner &&
            corner.at - p.pos <= speedRange(c)[0] &&
            speedRange(c)[0] >
              cornerLimit(r, { played: [] }, corner.at, corner.limit) &&
            !upgrade(c)?.effects.cool)),
    )
    .map((c) => c.id);
}
export function autoBots(r: Room) {
  migrateCleanup(r);
  for (let guard = 0; guard < 1200; guard++) {
    for (const id of [...(r.pendingDiscards || [])]) {
      const driver = r.players.find((p) => p.id === id)!;
      if (driver.bot) react(r, driver, "finish", botDiscards(r, driver));
    }
    if (r.phase === "draft") {
      const p = r.players.find((p) => p.id === r.garage!.queue[0])!;
      if (!p.bot) return;
      const best = [...r.garage!.market].sort((a, b) => {
        const score = (c: Card) => {
          const u = upgrade(c)!;
          return u.heatCard
            ? -5
            : Math.max(...u.speed) +
                u.plus * 2 +
                (u.effects.cool || 0) * 2 +
                (u.effects.limit || 0) * 2 -
                (u.effects.heat || 0) * 2;
        };
        return score(b) - score(a);
      })[0];
      draft(r, p, best.id);
      continue;
    }
    if (r.phase === "plan") {
      for (const p of r.players.filter((p) => p.bot && !p.rank && !p.plan))
        botPlan(r, p);
      if (r.phase === "plan") return;
    }
    if (r.phase === "turn") {
      if (!r.turn) return;
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
      if (t.step === "reveal") {
        const cards = p.played.filter(
          (c) => (upgrade(c)?.speed.length || 0) > 1,
        );
        const choices = cards.reduce<Record<string, number>[]>(
          (all, c) =>
            all.flatMap((values) =>
              upgrade(c)!.speed.map((v) => ({ ...values, [c.id]: v })),
            ),
          [{}],
        );
        choices.sort((a, b) => {
          const score = (v: Record<string, number>) => {
            const speed = t.speed + Object.values(v).reduce((a, b) => a + b, 0);
            return (
              speed -
              Math.max(
                0,
                cornerCost(r, p, speed, t.start, t.start + speed) - p.engine,
              ) *
                15
            );
          };
          return score(b) - score(a);
        });
        react(r, p, "values", [], { values: choices[0] });
        continue;
      }
      if (t.step === "slip") {
        const distance = slipDistances(r, p)
          .filter(
            (n) => cornerCost(r, p, t.speed, t.start, p.pos + n) <= p.engine,
          )
          .at(-1);
        react(r, p, distance ? "slip" : "check", [], { distance });
        continue;
      }
      while (coolAvailable(r, p) && p.hand.some((c) => c.type === "heat"))
        react(r, p, "cool");
      // Bots choose legal optional effects, then settle all mandatory symbols.
      for (const c of [...p.played]) {
        const e = upgrade(c)?.effects;
        if (
          e?.superCool &&
          t.step === "react" &&
          sectorEffect(r, p.pos, getTrack(r.trackId)) !== "noCool" &&
          !t.effects?.[c.id]?.used.includes("superCool")
        )
          react(r, p, "effect", [], { cardId: c.id, effect: "superCool" });
        if (
          e?.reduce &&
          terrainAt(getTrack(r.trackId), p.pos, p.lane) !== "tunnel" &&
          !t.effects?.[c.id]?.used.includes("reduce")
        )
          react(
            r,
            p,
            "effect",
            p.hand
              .filter((x) => x.type === "stress")
              .slice(0, e.reduce)
              .map((x) => x.id),
            { cardId: c.id, effect: "reduce" },
          );
        if (
          e?.refresh &&
          !t.effects?.[c.id]?.used.includes("refresh") &&
          cornerCost(r, p, t.speed, t.start, p.pos) <= p.engine
        )
          react(r, p, "effect", [], { cardId: c.id, effect: "refresh" });
      }
      for (const m of mandatoryPending(p, t)) {
        if (!p.played.some((c) => c.id === m.cardId)) continue;
        if (m.effect === "heat" && p.engine < m.amount)
          react(r, p, "replace", [], { cardId: m.cardId });
        else react(r, p, "effect", [], { cardId: m.cardId, effect: m.effect });
      }
      for (let attempt = 0; attempt < 3; attempt++) {
        const moves = draftMoves(r, p).filter(
          (m) =>
            cornerCost(r, p, t.speed, t.start, p.pos + m.distance) <= p.engine,
        );
        const move = moves.sort(
          (a, b) =>
            b.distance - a.distance || a.cardIds.length - b.cardIds.length,
        )[0];
        if (!move) break;
        react(r, p, "draftMove", [], move);
      }
      const distance = slipDistances(r, p)
        .filter(
          (n) => cornerCost(r, p, t.speed, t.start, p.pos + n) <= p.engine,
        )
        .at(-1);
      react(r, p, distance ? "slip" : "check", [], { distance });
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
    modules: r.modules || { ...DEFAULT_MODULES },
    garage: r.garage
      ? {
          round: r.garage.round,
          market: r.garage.market,
          queue: r.garage.queue,
        }
      : undefined,
    turn: r.turn
      ? {
          ...r.turn,
          cool: coolAvailable(r, r.players.find((p) => p.id === r.turn!.id)!),
        }
      : null,
    draftMoves:
      r.turn?.id === me!.id && r.turn.step === "react"
        ? draftMoves(r, me!)
        : [],
    slipDistances: r.turn
      ? slipDistances(r, r.players.find((p) => p.id === r.turn!.id)!)
      : [],
    boostCost: boostCost(r, me!),
    canBoost:
      r.turn?.id === me!.id &&
      r.turn.step === "react" &&
      !r.turn.boost &&
      me!.engine >= boostCost(r, me!) &&
      [...me!.deck, ...me!.discard].some((c) => c.basic && c.type === "speed"),
    cornerCost:
      r.turn?.id === me!.id
        ? cornerCost(r, me!, r.turn.speed, r.turn.start, me!.pos)
        : 0,
    mandatory: r.turn?.id === me!.id ? mandatoryPending(me!, r.turn) : [],
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
      upgrades: p.upgrades || [],
      refreshIds: p.refreshIds || [],
      discard: p.id === me!.id ? p.discard : [],
    })),
    canSlip: r.turn
      ? canSlip(r, r.players.find((p) => p.id === r.turn!.id)!)
      : false,
  };
}

export function shiftCost(
  r: Pick<Room, "trackId">,
  p: Pick<Player, "gear" | "pos" | "lane">,
  gear: number,
) {
  return (
    (Math.abs(gear - p.gear) === 2 ? 1 : 0) +
    (gear < p.gear &&
    terrainAt(getTrack(r.trackId), p.pos, p.lane) === "flooded"
      ? 1
      : 0)
  );
}
export function extraSlips(p: Pick<Player, "played">) {
  return p.played.reduce((n, c) => n + (upgrade(c)?.effects.extraSlip || 0), 0);
}
export type DraftMove = { cardIds: string[]; distance: number };
export function draftMoves(r: Room, p: Player): DraftMove[] {
  const t = r.turn;
  if (!t || t.id !== p.id || t.step !== "react") return [];
  const cards = p.played.filter(
    (c) =>
      upgrade(c)?.effects.draft && !t.effects?.[c.id]?.used.includes("draft"),
  );
  const length = getTrack(r.trackId).length,
    cell = (pos: number) => ((pos % length) + length) % length;
  const occupied = (pos: number) =>
    r.players.some(
      (x) => x.id !== p.id && !x.rank && cell(x.pos) === cell(pos),
    );
  const result: DraftMove[] = [];
  for (let size = 1; size <= cards.length; size++)
    for (const group of combinations(cards, size)) {
      const max = group.reduce((n, c) => n + upgrade(c)!.effects.draft!, 0);
      for (let distance = 1; distance <= max; distance++) {
        if (occupied(p.pos + distance)) break;
        if (occupied(p.pos + distance + 1))
          result.push({ cardIds: group.map((c) => c.id), distance });
      }
    }
  return result;
}
function applyDraft(r: Room, p: Player, options: ReactOptions) {
  const ids = options.cardIds;
  assert(
    Array.isArray(ids) &&
      new Set(ids).size === ids.length &&
      draftMoves(r, p).some(
        (m) =>
          m.distance === options.distance &&
          m.cardIds.length === ids!.length &&
          m.cardIds.every((id) => ids!.includes(id)),
      ),
    "牵引无效：沿途和落点必须全空，落点必须紧跟另一辆车",
  );
  for (const id of ids!) effectState(r.turn!, id).used.push("draft");
  land(r, p, p.pos + options.distance!);
  log(
    r,
    `${p.name} 牵引前进 ${options.distance} 格（不增加速度），使用 ${ids!.map((id) => "#" + p.played.find((c) => c.id === id)!.upgrade).join("、")}。`,
    p,
    "upgrade",
  );
}
