"use client";
import { useEffect, useState } from "react";
import type { Card, ReactOptions, Turn } from "../lib/game";
import {
  DEFAULT_MODULES,
  WEATHER_LABELS,
  ROAD_LABELS,
  ROAD_ICONS,
  upgrade,
  effectText,
  sector,
  sectorEffect,
  type Modules,
  type Weather,
  type Road,
  type Effects,
} from "../lib/modules";
import { getTrack, type TrackId } from "../lib/tracks";
export function ModuleOptions({
  value = DEFAULT_MODULES,
  disabled = false,
  onChange,
}: {
  value?: Modules;
  disabled?: boolean;
  onChange: (v: Modules) => void;
}) {
  return (
    <fieldset className="moduleOptions" disabled={disabled}>
      <legend>可选扩展</legend>
      {(
        [
          ["weather", "天气与路况", "6 种天气 · 随机弯道和路段效果"],
          ["regular", "车库：普通升级", "34 张普通升级牌 · 开赛前选 3 张"],
          ["advanced", "车库：高级升级", "62 张高级升级牌 · 可独立或混合开启"],
        ] as const
      ).map(([key, label, note]) => (
        <label key={key}>
          <input
            type="checkbox"
            checked={value[key]}
            onChange={(e) => onChange({ ...value, [key]: e.target.checked })}
          />
          <span>
            {label}
            <small>{note}</small>
          </span>
        </label>
      ))}
      <p>车库关闭时使用起始升级。普通与高级同时开启时混合选牌。</p>
    </fieldset>
  );
}
export function UpgradeFace({ card }: { card: Card }) {
  const u = upgrade(card)!;
  return (
    <>
      <span className="upgradeMeta">
        {u.advanced ? "高级" : "普通"} · #{u.number}
      </span>
      <strong className="upgradeValue">
        {u.heatCard
          ? "♨"
          : u.speed.length > 1
            ? u.speed.join(" / ")
            : u.speed[0] || !u.plus
              ? u.speed[0]
              : ""}
        {u.plus > 0 && <span>{" ＋".repeat(u.plus)}</span>}
      </strong>
      <span className="upgradeName">{u.name}</span>
      <small className="upgradeEffects">
        {u.heatCard
          ? "不能主动打出 · 冷却后回到引擎"
          : effectText(u) ||
            (u.speed.length > 1
              ? "翻牌后选择速度"
              : u.plus
                ? "每个＋翻至基础速度牌"
                : "无额外反应效果")}
      </small>
    </>
  );
}
type Driver = {
  id: string;
  name: string;
  upgrades?: Card[];
  pos: number;
  hand: Card[];
  played: Card[];
  discard?: Card[];
  engine: number;
  refreshIds?: string[];
};
type ModuleRoom = {
  phase: string;
  me: string;
  modules?: Modules;
  trackId?: TrackId;
  weather?: Weather;
  roads?: Road[];
  garage?: { round: number; market: Card[]; queue: string[] };
  players: Driver[];
  turn: Turn | null;
  mandatory?: {
    cardId: string;
    number: number;
    effect: "heat" | "scrap";
    amount: number;
  }[];
};
export function RaceConditions({ room }: { room: ModuleRoom }) {
  if (
    !room.modules?.weather &&
    !room.modules?.regular &&
    !room.modules?.advanced
  )
    return null;
  const w = room.weather,
    track = getTrack(room.trackId),
    me = room.players.find((p) => p.id === room.me)!;
  const current = sector(room, me.pos, track),
    effect = sectorEffect(room, me.pos, track);
  return (
    <section className="conditions">
      <div className="conditionsHeading">
        <h3>比赛扩展</h3>
        <span>
          {[
            room.modules?.regular ? "普通升级" : "",
            room.modules?.advanced ? "高级升级" : "",
            room.modules?.weather ? "天气与路况" : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>
      {w && (
        <>
          <div className="weatherSummary">
            <b>
              {w.icon} {w.name}
            </b>
            <span>{w.setup}</span>
            <small>仅“天气”路段：{WEATHER_LABELS[w.effect]}</small>
          </div>
          <div className="roadGrid">
            {(room.roads || []).map((road, i) => {
              const end = room.roads![(i + 1) % room.roads!.length].at;
              const isSector = ["slip", "freeBoost", "weather"].includes(
                road.kind,
              );
              return (
                <div
                  key={road.at}
                  className={
                    current?.at === road.at && isSector ? "currentRoad" : ""
                  }
                >
                  <strong>
                    {ROAD_ICONS[road.kind]} {i + 1} 号
                    {isSector ? "路段" : "弯道"}
                  </strong>
                  <span>
                    {ROAD_LABELS[road.kind]}
                    {road.kind === "weather"
                      ? ` · ${WEATHER_LABELS[w.effect]}`
                      : ""}
                  </span>
                  <small>
                    {isSector
                      ? `从 ${road.at} 格起，至 ${end} 格弯道线前（可跨起终点）`
                      : `${road.at} 格弯道线`}
                  </small>
                </div>
              );
            })}
          </div>
          {room.phase !== "lobby" && room.phase !== "draft" && (
            <p className="conditionCurrent">
              你当前路段：
              {effect && ["slip2", "noSlip", "cool1", "noCool"].includes(effect)
                ? WEATHER_LABELS[effect as keyof typeof WEATHER_LABELS]
                : current && ["slip", "freeBoost"].includes(current.kind)
                  ? ROAD_LABELS[current.kind]
                  : "无路段修正"}
              。以执行动作时的位置判断。
            </p>
          )}
        </>
      )}
    </section>
  );
}
export function Garage({
  room,
  busy,
  send,
}: {
  room: ModuleRoom;
  busy: boolean;
  send: (action: string, extra?: Record<string, unknown>) => unknown;
}) {
  const g = room.garage!,
    active = g.queue[0] === room.me,
    p = room.players.find((p) => p.id === g.queue[0]);
  return (
    <section className="garage">
      <div className="eyebrow">GARAGE / 开赛前改装</div>
      <h2>
        第 {g.round} / 3 轮 ·{" "}
        {active ? "轮到你选择升级" : `等待 ${p?.name} 选牌`}
      </h2>
      <p>
        每人每轮选 1 张。顺序：后→前、前→后、后→前；每轮剩余牌移出市场。
        {room.modules?.weather ? "天气与路况已公开。" : ""}
      </p>
      <div className="upgradeMarket">
        {g.market.map((c) => (
          <button
            className="upgradeCard"
            key={c.id}
            disabled={busy || !active}
            onClick={() => send("draft", { cardId: c.id })}
          >
            <UpgradeFace card={c} />
            <span className="draftPick">
              {active ? "选择此升级 →" : "市场公开"}
            </span>
          </button>
        ))}
      </div>
      <div className="draftDrivers">
        {room.players.map((p) => (
          <div key={p.id}>
            <b>
              {p.name}
              {p.id === room.me ? "（你）" : ""}
            </b>
            <span>{p.upgrades?.length || 0}/3 张</span>
            <small>
              {p.upgrades
                ?.map((c) => `#${c.upgrade} ${upgrade(c)!.name}`)
                .join(" · ") || "等待选择"}
            </small>
          </div>
        ))}
      </div>
    </section>
  );
}
export function VariableSpeed({
  room,
  busy,
  act,
}: {
  room: ModuleRoom;
  busy: boolean;
  act: (kind: string, options?: ReactOptions, cards?: string[]) => unknown;
}) {
  const p = room.players.find((p) => p.id === room.me)!,
    cards = p.played.filter((c) => (upgrade(c)?.speed.length || 0) > 1);
  const [values, setValues] = useState<Record<string, number>>({});
  const key = cards.map((c) => c.id).join(",");
  useEffect(() => {
    setValues(
      Object.fromEntries(cards.map((c) => [c.id, upgrade(c)!.speed[0]])),
    );
  }, [key]);
  return (
    <div className="variableSpeed">
      <h3>翻牌已完成，现在选择可变速度</h3>
      <p>已确定速度 {room.turn?.speed}。选择后才移动并进入反应阶段。</p>
      {cards.map((c) => (
        <div key={c.id}>
          <b>
            #{c.upgrade} {upgrade(c)!.name}
          </b>
          <div className="segmented">
            {upgrade(c)!.speed.map((v) => (
              <button
                key={v}
                className={values[c.id] === v ? "on" : ""}
                disabled={busy}
                onClick={() => setValues({ ...values, [c.id]: v })}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button
        className="primary"
        disabled={busy || Object.keys(values).length !== cards.length}
        onClick={() => act("values", { values })}
      >
        确认速度{" "}
        {room.turn!.speed + Object.values(values).reduce((a, b) => a + b, 0)} ·
        前进 →
      </button>
    </div>
  );
}
export function UpgradeActions({
  room,
  busy,
  act,
}: {
  room: ModuleRoom;
  busy: boolean;
  act: (kind: string, options?: ReactOptions, cards?: string[]) => unknown;
}) {
  const p = room.players.find((p) => p.id === room.me)!,
    t = room.turn!;
  const [choice, setChoice] = useState<{
      id: string;
      effect: "salvage" | "reduce";
      max: number;
    } | null>(null),
    [chosen, setChosen] = useState<string[]>([]);
  const target =
    choice?.effect === "salvage"
      ? p.discard || []
      : p.hand.filter((c) => c.type === "stress");
  const labels: Partial<Record<keyof Effects, string>> = {
    heat: "支付热量",
    scrap: "弃牌库顶",
    reduce: "选择压力减压",
    salvage: "选择弃牌回收",
    refresh: "收尾时放牌顶",
    accelerate: `每次翻牌再 +1（当前 +${t.plus || 0}）`,
  };
  const action = (id: string, effect: keyof Effects, n?: number) => {
    if (effect === "reduce" || effect === "salvage") {
      setChoice({ id, effect, max: n! });
      setChosen([]);
    } else act("effect", { cardId: id, effect });
  };
  const relevant = p.played.filter((c) => upgrade(c));
  const direct = p.hand.filter((c) => upgrade(c)?.effects.direct);
  if (!relevant.length && !direct.length) return null;
  return (
    <section className="upgradeActions">
      <h3>
        升级牌反应 <small>可自选顺序 · 必付效果需全部完成</small>
      </h3>
      {relevant.map((c) => {
        const u = upgrade(c)!,
          state = t.effects?.[c.id];
        return (
          <div className="upgradeAction" key={c.id}>
            <b>
              #{u.number} {u.name}
            </b>
            <small>{effectText(u)}</small>
            <div className="actionButtons">
              {Object.entries(u.effects)
                .filter(([k]) => labels[k as keyof Effects])
                .map(([k, v]) => (
                  <button
                    key={k}
                    className="outline"
                    disabled={
                      busy ||
                      state?.used.includes(k) ||
                      (k === "heat" && p.engine < (v as number))
                    }
                    onClick={() =>
                      action(c.id, k as keyof Effects, v as number)
                    }
                  >
                    {state?.used.includes(k) ? "✓ " : ""}
                    {labels[k as keyof Effects]}
                    {typeof v === "number" ? ` ${v}` : ""}
                  </button>
                ))}
              {u.effects.heat &&
                !state?.used.includes("heat") &&
                p.engine < u.effects.heat && (
                  <button
                    className="outline"
                    disabled={busy}
                    onClick={() => act("replace", { cardId: c.id })}
                  >
                    热量不足 · 随机基础牌替换
                  </button>
                )}
            </div>
          </div>
        );
      })}
      {direct.length > 0 && (
        <div className="directPlays">
          <h4>可从手牌追加打出（不受挡位张数限制）</h4>
          <div className="actionButtons">
            {direct.map((c) => (
              <button
                className="outline"
                key={c.id}
                disabled={busy}
                title={effectText(upgrade(c)!)}
                onClick={() => act("direct", { cardId: c.id })}
              >
                ↗ #{c.upgrade} 油门踏板 · +{upgrade(c)!.speed[0]}
                <small>{effectText(upgrade(c)!)}</small>
              </button>
            ))}
          </div>
        </div>
      )}
      {choice && (
        <div className="effectPicker">
          <h4>
            {choice.effect === "salvage"
              ? "回收弃牌，洗入抽牌堆"
              : "弃掉手牌压力"}{" "}
            · 最多 {choice.max} 张
          </h4>
          <div className="effectCards">
            {target.map((c) => (
              <button
                className={
                  "effectCard " + (chosen.includes(c.id) ? "chosen" : "")
                }
                key={c.id}
                disabled={
                  busy ||
                  (!chosen.includes(c.id) && chosen.length >= choice.max)
                }
                onClick={() =>
                  setChosen(
                    chosen.includes(c.id)
                      ? chosen.filter((x) => x !== c.id)
                      : [...chosen, c.id],
                  )
                }
              >
                {upgrade(c)
                  ? `#${c.upgrade} ${upgrade(c)!.name}`
                  : c.type === "heat"
                    ? "♨ 热量"
                    : c.type === "stress"
                      ? "? 压力"
                      : `速度 ${c.value}`}
              </button>
            ))}
          </div>
          <button
            className="primary"
            disabled={busy}
            onClick={() => {
              act(
                "effect",
                { cardId: choice.id, effect: choice.effect },
                chosen,
              );
              setChoice(null);
            }}
          >
            确认 {chosen.length} 张
          </button>
          <button className="quiet" onClick={() => setChoice(null)}>
            取消
          </button>
        </div>
      )}
      <p>
        冷却使用上方“冷却一次”按钮；尾流奖励在尾流时选择；个人限速自动计入弯道检查。保留牌按点击顺序从牌顶开始抽取。
      </p>
    </section>
  );
}
