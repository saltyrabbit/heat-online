/** Base-box modules. Numbers/icons transcribed from the official licensed BGA
 * card sheets, checked against Days of Wonder Advanced Rules v1.1.
 * https://cdn.svc.asmodee.net/production-daysofwonder/uploads/2025/03/9101-HT-RulesAdvanced-EN_compressed.pdf
 * https://x.boardgamearena.net/data/themereleases/261007-0930/games/heat/261007-1450/img/upgrade-cards.jpg
 * https://x.boardgamearena.net/data/themereleases/261007-0930/games/heat/261007-1450/img/weather-cards.jpg
 */
export type Modules = { weather: boolean; regular: boolean; advanced: boolean };
export const DEFAULT_MODULES: Modules = {
  weather: false,
  regular: false,
  advanced: false,
};
export function modules(value?: unknown): Modules {
  if (value === undefined) return { ...DEFAULT_MODULES };
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("扩展设置无效");
  const v = value as Record<string, unknown>;
  if (
    Object.keys(v).some(
      (k) => !["weather", "regular", "advanced"].includes(k),
    ) ||
    Object.values(v).some((x) => typeof x !== "boolean")
  )
    throw new Error("扩展开关必须是布尔值");
  return { ...DEFAULT_MODULES, ...v } as Modules;
}
export type Effects = {
  cool?: number;
  slip?: number;
  reduce?: number;
  salvage?: number;
  heat?: number;
  scrap?: number;
  limit?: number;
  refresh?: boolean;
  direct?: boolean;
  accelerate?: boolean;
};
export type Upgrade = {
  number: number;
  name: string;
  advanced: boolean;
  speed: number[];
  plus: number;
  heatCard?: boolean;
  effects: Effects;
};
const rows: [string, number[], number, Effects, boolean?][] = [
  ["四轮驱动", [4], 1, {}],
  ["四轮驱动", [0], 3, {}],
  ["四轮驱动", [0], 1, { cool: 3 }],
  ["车身", [3], 0, { reduce: 2 }],
  ["车身", [5], 0, { reduce: 1 }],
  ["车身", [1], 0, { reduce: 3 }],
  ["刹车", [1, 2, 3, 4], 0, { heat: 1 }],
  ["刹车", [1, 3], 0, {}],
  ["刹车", [2, 4], 0, {}],
  ["刹车", [1, 5], 0, {}],
  ["冷却系统", [6], 0, { heat: 1, cool: 1 }],
  ["冷却系统", [1], 0, { cool: 2 }],
  ["冷却系统", [3], 0, { cool: 1 }],
  ["转速表", [1], 0, { slip: 2 }],
  ["转速表", [2], 0, { slip: 2 }],
  ["转速表", [3], 0, { slip: 2 }],
  ["额外热量", [0], 0, {}, true],
  ["车身", [6], 0, { reduce: 3, heat: 1 }],
  ["车身", [2], 0, { reduce: 1, cool: 1, scrap: 2 }],
  ["车身", [2], 0, { reduce: 1, slip: 1 }],
  ["冷却系统", [4], 0, { scrap: 2, cool: 1 }],
  ["燃料", [2], 0, { salvage: 2 }],
  ["燃料", [0], 1, { salvage: 2, cool: 1 }],
  ["油门踏板", [1], 0, { direct: true, scrap: 1 }],
  ["油门踏板", [2], 0, { direct: true, scrap: 2 }],
  ["油门踏板", [3], 0, { direct: true, scrap: 3 }],
  ["油门踏板", [4], 0, { direct: true, heat: 1, cool: 1 }],
  ["油门踏板", [1], 0, { direct: true, scrap: 5, accelerate: true }],
  ["转速表", [0], 1, { slip: 3 }],
  ["转速表", [1], 0, { heat: 1, slip: 3 }],
  ["转速表", [1, 2], 0, { slip: 1 }],
  ["悬挂", [2], 0, { reduce: 1, refresh: true }],
  ["悬挂", [2], 0, { cool: 1, refresh: true }],
  ["悬挂", [4], 0, { refresh: true }],
  ["悬挂", [1], 0, { slip: 1, refresh: true }],
  ["轮胎", [2], 0, { cool: 3, limit: -1 }],
  ["轮胎", [1], 0, { scrap: 2, limit: 1 }],
  ["轮胎", [2], 0, { scrap: 2, limit: 1 }],
  ["轮胎", [3], 0, { cool: 2, limit: -1 }],
  ["轮胎", [0], 1, { cool: 1, slip: 1, limit: 1 }],
  ["轮胎", [0], 2, { limit: 2 }],
  ["涡轮增压", [7], 0, { heat: 2, cool: 3 }],
  ["涡轮增压", [8], 0, { heat: 1, scrap: 6 }],
  ["尾翼", [4], 0, { heat: 1, scrap: 2, limit: 2 }],
  ["尾翼", [3], 0, { heat: 1, scrap: 2, limit: 2 }],
  ["尾翼", [6], 0, { heat: 2, limit: 3 }],
  ["四轮驱动", [0], 1, { accelerate: true }],
  ["额外热量", [0], 0, {}, true],
];
export const UPGRADES: Upgrade[] = rows.map(
  ([name, speed, plus, effects, heatCard], i) => ({
    number: i + 1,
    name,
    speed,
    plus,
    effects,
    heatCard,
    advanced: i >= 17,
  }),
);
export function upgrade(c: { upgrade?: number }): Upgrade | undefined {
  return c.upgrade ? UPGRADES[c.upgrade - 1] : undefined;
}
export function speedRange(c: {
  type: string;
  value: number;
  upgrade?: number;
}) {
  const u = upgrade(c);
  return c.type === "stress"
    ? [1, 4]
    : u
      ? [Math.min(...u.speed) + u.plus, Math.max(...u.speed) + u.plus * 4]
      : [c.value, c.value];
}
export const EFFECT_LABELS: Record<keyof Effects, string> = {
  cool: "❄ 冷却",
  slip: "⇢ 尾流+",
  reduce: "↧ 减压",
  salvage: "♻ 回收",
  heat: "♨ 必付热量",
  scrap: "▤ 必弃牌库",
  limit: "◉ 个人限速",
  refresh: "⟳ 保留到牌顶",
  direct: "↗ 反应时追加",
  accelerate: "＋ 每次翻牌再+1",
};
export function effectLines(u: Upgrade) {
  return Object.entries(u.effects).map(([k, v]) => {
    const n = v as number;
    const text = {
      cool: `冷却：至多 ${n} 张手牌热量回到引擎区`,
      slip: `尾流额外 ${n} 格`,
      reduce: `减压：弃掉至多 ${n} 张手牌压力`,
      salvage: `回收：至多 ${n} 张弃牌洗入抽牌堆`,
      heat: `必须付 ${n} 张热量：引擎区 → 弃牌堆`,
      scrap: `必须弃抽牌堆顶 ${n} 张`,
      limit: `你的弯道限速 ${n > 0 ? "+" : ""}${n}`,
      refresh: "补牌前放回牌顶",
      direct: "反应阶段可额外出此牌，不占挡位张数",
      accelerate: "每个＋额外 +1 速度",
    }[k as keyof Effects];
    const timing =
      k === "limit"
        ? "第 7 步 · 自动"
        : k === "slip"
          ? "第 6 步 · 可选"
          : ["heat", "scrap"].includes(k)
            ? "第 5 步 · 必须"
            : "第 5 步 · 可选";
    return { key: k, text, timing };
  });
}
export function effectText(u: Upgrade) {
  return effectLines(u)
    .map((e) => e.text)
    .join(" · ");
}
export type WeatherEffect = "slip2" | "noSlip" | "cool1" | "noCool";
export type Weather = {
  id: string;
  name: string;
  icon: string;
  stress: number;
  engine: number;
  deckHeat: number;
  discardHeat: number;
  effect: WeatherEffect;
  setup: string;
};
export const WEATHERS: Weather[] = [
  {
    id: "cloudy",
    name: "多云",
    icon: "☁",
    stress: -1,
    engine: 0,
    deckHeat: 0,
    discardHeat: 0,
    effect: "noCool",
    setup: "牌库减少 1 张压力牌",
  },
  {
    id: "fog",
    name: "雾",
    icon: "≋",
    stress: 0,
    engine: 1,
    deckHeat: 0,
    discardHeat: 0,
    effect: "noSlip",
    setup: "引擎区增加 1 张热量牌",
  },
  {
    id: "heavy-rain",
    name: "大雨",
    icon: "⛈",
    stress: 1,
    engine: 0,
    deckHeat: 0,
    discardHeat: 0,
    effect: "slip2",
    setup: "牌库增加 1 张压力牌",
  },
  {
    id: "freezing",
    name: "严寒",
    icon: "❄",
    stress: 0,
    engine: -1,
    deckHeat: 0,
    discardHeat: 0,
    effect: "cool1",
    setup: "引擎区减少 1 张热量牌",
  },
  {
    id: "rain",
    name: "小雨",
    icon: "☂",
    stress: 0,
    engine: 0,
    deckHeat: 3,
    discardHeat: 0,
    effect: "cool1",
    setup: "引擎区的 3 张热量洗入抽牌堆",
  },
  {
    id: "sun",
    name: "晴天",
    icon: "☀",
    stress: 0,
    engine: 0,
    deckHeat: 0,
    discardHeat: 3,
    effect: "slip2",
    setup: "引擎区的 3 张热量移入弃牌堆",
  },
];
export const WEATHER_LABELS: Record<WeatherEffect, string> = {
  slip2: "尾流可额外 +2 格",
  noSlip: "不能从此路段发起尾流",
  cool1: "反应时可额外将 1 张手牌热量移回引擎区",
  noCool: "此路段禁止所有冷却",
};
export type RoadKind =
  | "limitUp"
  | "limitDown"
  | "overheat"
  | "slip"
  | "freeBoost"
  | "weather";
export type Road = { at: number; kind: RoadKind };
export const ROAD_KINDS: RoadKind[] = [
  "limitUp",
  "limitDown",
  "overheat",
  "slip",
  "freeBoost",
  "weather",
];
export const ROAD_LABELS: Record<RoadKind, string> = {
  limitUp: "限速 +1",
  limitDown: "限速 −1",
  overheat: "超速额外付 1 热量",
  slip: "路段尾流可额外 +1",
  freeBoost: "路段加速免热量",
  weather: "路段应用天气",
};
export const ROAD_ICONS: Record<RoadKind, string> = {
  limitUp: "◉+1",
  limitDown: "◉−1",
  overheat: "♨+1",
  slip: "⇢+1",
  freeBoost: "✚",
  weather: "☁",
};
export function roadAt(r: { roads?: Road[] }, at: number) {
  return r.roads?.find((x) => x.at === at);
}
export function sector(
  r: { roads?: Road[]; trackId?: string },
  pos: number,
  track: { length: number; corners: { at: number }[] },
) {
  const cell = ((pos % track.length) + track.length) % track.length;
  const corner =
    [...track.corners].reverse().find((c) => c.at <= cell) ||
    track.corners.at(-1)!;
  return roadAt(r, corner.at);
}
export function sectorEffect(
  r: { roads?: Road[]; weather?: Weather; trackId?: string },
  pos: number,
  track: { length: number; corners: { at: number }[] },
) {
  const road = sector(r, pos, track);
  return road?.kind === "weather" ? r.weather?.effect : road?.kind;
}
