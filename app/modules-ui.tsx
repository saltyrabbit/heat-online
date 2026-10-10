"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Card, ReactOptions, Turn } from "../lib/game";
import { upgradeNotes } from "../lib/upgrade-help";
import {
  DEFAULT_MODULES,
  WEATHER_LABELS,
  ROAD_LABELS,
  ROAD_ICONS,
  upgrade,
  effectText,
  effectLines,
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
      <span className="upgradeEffects">
        {u.heatCard ? (
          <small>不能主动打出；冷却时从手牌回到引擎</small>
        ) : (
          <>
            {u.speed.length > 1 && (
              <small>
                <span>第 3 步 · 选择</span>翻牌后，从上方数字选一个速度
              </small>
            )}
            {u.plus > 0 && (
              <small>
                <span>第 3 步 · 自动</span>每个＋翻至基础速度牌，加上该数字
              </small>
            )}
            {effectLines(u).map((line) => (
              <small key={line.key}>
                <span>{line.timing}</span>
                {line.text}
              </small>
            ))}
            {!u.plus && u.speed.length === 1 && !effectText(u) && (
              <small>第 3 步自动加上牌面速度</small>
            )}
          </>
        )}
      </span>
    </>
  );
}
function UpgradeDialog({ card, close }: { card: Card; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const u = upgrade(card)!;
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className="upgradeDialog"
      aria-label={`#${u.number} ${u.name} · 效果说明`}
      onClose={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="upgradeDialogContent">
        <header>
          <div>
            <div className="eyebrow">
              改装卡效果说明 · {u.advanced ? "高级" : "普通"}
            </div>
            <h2>
              #{u.number} {u.name}
            </h2>
          </div>
          <button
            type="button"
            className="upgradeDialogClose"
            aria-label="关闭效果说明"
            onClick={close}
          >
            ×
          </button>
        </header>
        <p className="upgradeScope">
          {u.heatCard
            ? "这是一张额外的热量牌。"
            : "只有本轮打出这张牌，才会获得它的速度和效果；选入车库或拿在手里不会自动生效。"}
        </p>
        {!u.heatCard && (
          <p className="upgradeTrigger">
            反应效果：轮到自己，完成翻牌与移动后，在第 5
            步使用；进入尾流或弯道检查后就不能再用。本轮每张牌的同一效果只使用一次，冷却可分次用完。带“追加”的牌可在此时直接从手牌打出。
          </p>
        )}
        <ol className="upgradeNoteList">
          {upgradeNotes(u).map((note) => (
            <li key={note.label}>
              <div className="upgradeNoteHeading">
                <span className={`effectKind ${note.kind}`}>
                  {note.kind === "mandatory"
                    ? "必须执行"
                    : note.kind === "optional"
                      ? "可选使用"
                      : "自动结算"}
                </span>
                <h3>{note.label}</h3>
              </div>
              <small>{note.timing}</small>
              <p>{note.text}</p>
              {note.example && (
                <p className="upgradeExample">例：{note.example}</p>
              )}
            </li>
          ))}
        </ol>
        {(u.effects.heat || u.effects.scrap) && (
          <p className="upgradeMandatoryHelp">
            必付热量和必弃抽牌堆顶的效果全部处理完，才能进入尾流和弯道检查。反应效果的执行顺序由你决定。
          </p>
        )}
        <button type="button" className="primary" onClick={close}>
          明白了，返回比赛
        </button>
      </div>
    </dialog>,
    document.body,
  );
}
export function UpgradeHelp({ card }: { card: Card }) {
  const [open, setOpen] = useState(false);
  const u = upgrade(card)!;
  return (
    <>
      <button
        type="button"
        className="upgradeHelp"
        aria-label={`查看 #${u.number} ${u.name} 的效果说明`}
        onClick={() => setOpen(true)}
      >
        ⓘ 效果说明
      </button>
      {open && <UpgradeDialog card={card} close={() => setOpen(false)} />}
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
            <small>仅 ☁ 天气标记路段生效：{WEATHER_LABELS[w.effect]}</small>
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
                    {road.kind === "weather"
                      ? "天气路段"
                      : isSector
                        ? "路段"
                        : "弯道"}
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
          <p className="weatherScope">
            ☁
            天气路段＝放有“天气”路况标记的路段，从该弯道线开始，直到下一条弯道线前。天气卡的路段效果只在这里生效；冷却或尾流按点击动作时所在位置判断。
            {!room.roads?.some((road) => road.kind === "weather") &&
              "本场没有天气标记路段，因此该路段效果本场不会触发；开局的热量或压力调整仍然有效。"}
          </p>
          {room.phase !== "lobby" && room.phase !== "draft" && (
            <p className="conditionCurrent">
              {current?.kind === "weather"
                ? `你当前位于 ${(room.roads || []).findIndex((road) => road.at === current.at) + 1} 号天气路段：`
                : "你当前不在天气标记路段；当前路段效果："}
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
      <p className="garageHelp">
        卡面写明牌的去向；点“效果说明”查看时机、费用和例子，查看不会选牌。
      </p>
      <div className="upgradeMarket">
        {g.market.map((c) => (
          <div className="upgradeMarketItem" key={c.id}>
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
            <UpgradeHelp card={c} />
          </div>
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
export function UpgradeLoadouts({ room }: { room: ModuleRoom }) {
  if (
    ["lobby", "draft"].includes(room.phase) ||
    !room.players.some((p) => p.upgrades?.length)
  )
    return null;
  const players = [...room.players].sort(
    (a, b) => Number(b.id === room.me) - Number(a.id === room.me),
  );
  return (
    <section className="upgradeLoadouts" aria-label="所选赛车改装">
      <h3>赛车改装 · 所选升级</h3>
      <p>
        这些牌已洗入各自牌组。速度升级抽到并打出后才生效；额外热量需先冷却回引擎区。升级效果不是整场常驻加成。
      </p>
      {players.map((p) => (
        <details key={p.id} open={p.id === room.me} className="driverUpgrades">
          <summary>
            {p.name}
            {p.id === room.me ? "（你）" : ""} · {p.upgrades?.length || 0}{" "}
            张升级
            <span>{p.upgrades?.map((c) => upgrade(c)!.name).join(" / ")}</span>
          </summary>
          <div className="selectedUpgrades">
            {p.upgrades?.map((c) => (
              <article className="selectedUpgrade" key={c.id}>
                <UpgradeFace card={c} />
                <UpgradeHelp card={c} />
              </article>
            ))}
          </div>
        </details>
      ))}
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
  const labels: Partial<Record<keyof Effects, (n: number) => string>> = {
    heat: (n) => `必须支付 ${n} 张引擎热量`,
    scrap: (n) => `必须弃抽牌堆顶 ${n} 张`,
    reduce: (n) => `弃掉至多 ${n} 张手牌压力`,
    salvage: (n) => `选至多 ${n} 张弃牌洗入抽牌堆`,
    refresh: () => "补牌前将此牌放回牌顶",
    accelerate: () => `启用＋奖励 · 现在速度 +${t.plus || 0}`,
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
      <p className="upgradeTrigger">
        现在是你的第 5
        步：翻牌、移动已完成，以下已打出升级的效果可以使用。进入尾流或弯道检查后，反应阶段结束。
      </p>
      {relevant.map((c) => {
        const u = upgrade(c)!,
          state = t.effects?.[c.id];
        return (
          <div className="upgradeAction" key={c.id}>
            <b>
              #{u.number} {u.name}
            </b>
            <UpgradeHelp card={c} />
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
                    {labels[k as keyof Effects]!(v as number)}
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
          <h4>反应阶段，可从手牌额外打出以下牌</h4>
          <p>
            不占挡位要求的出牌张数。打出后立即增加速度，并结算该牌的费用和效果。
          </p>
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
