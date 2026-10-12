import {
  Check,
  Layers,
  Shuffle,
  Zap,
  Gauge,
  Snowflake,
  Plus,
  Wind,
  CornerUpRight,
  TriangleAlert,
  Flag,
  CircleCheck,
} from "lucide-react";
import type { ActionKind, Card, FlipReveal, RaceAction } from "../lib/game";
import { upgrade, effectText } from "../lib/modules";
import { UpgradeHelp } from "./modules-ui";
import { playerRoundEvents } from "../lib/round-events";
import { driverStage } from "../lib/round-status";

type Driver = {
  id: string;
  name: string;
  color: string;
  bot: boolean;
  rank: number | null;
  plan: boolean;
};
type EventRoom = {
  round: number;
  phase: string;
  me: string;
  players: Driver[];
  turn: { id: string; step?: string } | null;
  queue?: string[];
  pendingDiscards?: string[];
  actions?: RaceAction[];
  reveals?: FlipReveal[];
};
const categories = {
  upgrade: ["升级效果", Zap],
  draft: ["车库选牌", Layers],
  plan: ["选牌锁定", Check],
  played: ["打出牌", Layers],
  stress: ["压力翻牌", Shuffle],
  boost: ["加速翻牌", Zap],
  move: ["前进", Gauge],
  cool: ["冷却", Snowflake],
  adrenaline: ["肾上腺素", Plus],
  slip: ["尾流", Wind],
  corner: ["弯道检查", CornerUpRight],
  spin: ["打滑", TriangleAlert],
  finish: ["完赛", Flag],
  end: ["回合结束", CircleCheck],
  stall: ["手牌过热", TriangleAlert],
} as const;

function EventCards({
  cards,
  reveal = false,
  effect = false,
}: {
  cards: Card[];
  reveal?: boolean;
  effect?: boolean;
}) {
  return (
    <ol
      className="eventCards"
      aria-label={
        reveal ? "按翻牌顺序" : effect ? "效果涉及的牌" : "本回合打出的牌"
      }
    >
      {cards.map((card, index) => {
        const resolved = reveal && index === cards.length - 1;
        const u = upgrade(card);
        const label = u
          ? `#${u.number} ${u.name}`
          : card.type === "heat"
            ? "热量"
            : card.type === "stress"
              ? "压力"
              : card.basic
                ? "基础速度"
                : "升级速度";
        const value =
          card.type === "heat"
            ? "♨"
            : card.type === "stress"
              ? "?"
              : u && u.speed.length > 1
                ? u.speed.join("/")
                : card.value + (u?.plus ? "＋".repeat(u.plus) : "");
        const note = effect
          ? card.type === "heat"
            ? "热量牌"
            : card.type === "stress"
              ? "压力牌"
              : card.basic
                ? "基础牌"
                : "升级牌"
          : reveal
            ? resolved
              ? "计入速度"
              : "跳过 · 弃牌"
            : card.type === "speed"
              ? card.basic
                ? "基础牌"
                : "起始升级"
              : card.type === "heat"
                ? "被迫打出"
                : "翻牌定速度";
        return (
          <li
            className={`eventCard ${card.type} ${resolved ? "resolved" : ""}`}
            key={`${card.id}:${index}`}
          >
            <span>{label}</span>
            <strong>{value}</strong>
            <small title={u ? effectText(u) : undefined}>
              {u && !reveal ? effectText(u) || "升级牌" : note}
            </small>
            {u && <UpgradeHelp card={card} />}
          </li>
        );
      })}
    </ol>
  );
}

function driverStatus(room: EventRoom, player: Driver) {
  const stage = driverStage(room, player.id);
  return {
    draft: "车库选牌",
    reveal: "选择速度",
    finished: "已完赛",
    plan: "选牌中",
    locked: "已锁定选牌",
    discard: "收尾中",
    react: "行动中",
    slip: "连续尾流",
    waiting: "等待行动",
    done: "本回合已结束",
    lobby: "已就位",
  }[stage];
}

export function RoundEvents({
  room,
  connected,
}: {
  room: EventRoom;
  connected: boolean;
}) {
  return (
    <section className="roundEvents" aria-label="本回合事件">
      <div className="roundEventsHeading">
        <div>
          <div className="eyebrow">ROUND EVENTS</div>
          <h2>本回合事件</h2>
        </div>
        <span>
          第 {room.round} 回合 · {connected ? "实时同步" : "等待重连"}
          <small>按玩家归类 · 保留至下一回合</small>
        </span>
      </div>
      <div className="playerEventGrid" aria-live="polite">
        {room.players.map((player) => {
          const events = playerRoundEvents(room, player.id);
          const status = driverStatus(room, player);
          return (
            <section
              className={`playerEvents ${room.turn?.id === player.id ? "acting" : ""}`}
              style={{ borderTopColor: player.color }}
              key={player.id}
              aria-label={`${player.name}的本回合事件`}
            >
              <div className="playerEventsHeading">
                <div>
                  <i style={{ background: player.color }} />
                  <h3>{player.name}</h3>
                  {player.id === room.me && <small>你</small>}
                  {player.bot && <small>电脑</small>}
                </div>
                <span className={status === "行动中" ? "eventActive" : ""}>
                  {status}
                </span>
              </div>
              {events.length ? (
                <ol className="eventTimeline">
                  {events.map(({ action, kind, reveals }) => {
                    const [label, Icon] = categories[kind as ActionKind];
                    const text = action.text.startsWith(player.name + " ")
                      ? action.text.slice(player.name.length + 1)
                      : action.text;
                    return (
                      <li className={`timelineEvent ${kind}`} key={action.id}>
                        <span className="eventIcon" aria-hidden="true">
                          <Icon size={15} />
                        </span>
                        <div className="eventContent">
                          <strong className="eventLabel">{label}</strong>
                          <p>{text}</p>
                          {action.cards?.length ? (
                            <EventCards
                              cards={action.cards}
                              effect={kind === "upgrade"}
                            />
                          ) : null}
                          {reveals.map((reveal) => (
                            <div className="eventReveal" key={reveal.id}>
                              {kind !== reveal.kind && (
                                <span>
                                  {reveal.kind === "stress" ? "压力" : "加速"} ·
                                  速度 +{reveal.value}
                                </span>
                              )}
                              <EventCards cards={reveal.cards} reveal />
                            </div>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <p className="eventEmpty">
                  {room.phase === "plan"
                    ? "正在选牌，全部锁定后公开出牌。"
                    : "等待本回合行动。"}
                </p>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
