import type { ActionKind, FlipReveal, RaceAction } from "./game.ts";

export type TimelineEvent = {
  action: RaceAction;
  kind: ActionKind;
  reveals: FlipReveal[];
};

function legacyKind(text: string): ActionKind {
  if (text.includes("已锁定")) return "plan";
  if (text.includes("打出")) return "played";
  if (text.includes("冷却")) return "cool";
  if (text.includes("肾上腺素")) return "adrenaline";
  if (text.includes("尾流")) return "slip";
  if (text.includes("打滑")) return "spin";
  if (text.includes("过热")) return "stall";
  if (text.includes("结束回合")) return "end";
  if (text.includes("完赛")) return "finish";
  if (text.includes("加速")) return "boost";
  if (text.includes("压力翻牌")) return "stress";
  if (text.includes("弯")) return "corner";
  return "move";
}

export function playerRoundEvents(
  room: {round: number; actions?: RaceAction[]; reveals?: FlipReveal[]},
  playerId: string,
): TimelineEvent[] {
  const actions = (room.actions || []).filter((a) => a.round === room.round && a.playerId === playerId);
  const reveals = (room.reveals || []).filter((r) => r.round === room.round && r.playerId === playerId);
  const linked = new Set(actions.map((a) => a.revealId).filter(Boolean));
  const used = new Set<string>();
  const events = actions.map((action) => {
    const kind = action.kind || legacyKind(action.text);
    let matches = reveals.filter((r) => r.id === action.revealId);
    // Older rooms have separate action and reveal records without a shared ID.
    if (!action.revealId && !action.kind) {
      if (kind === "boost") matches = reveals.filter((r) => r.kind === "boost" && !linked.has(r.id) && !used.has(r.id)).slice(0, 1);
      if (kind === "move") matches = reveals.filter((r) => r.kind === "stress" && !linked.has(r.id) && !used.has(r.id));
    }
    for (const reveal of matches) used.add(reveal.id);
    return {action, kind, reveals: matches};
  });
  for (const reveal of reveals.filter((r) => !used.has(r.id))) {
    events.push({
      action: {id: reveal.id, round: reveal.round, playerId, text: `${reveal.kind === "stress" ? "压力" : "加速"}翻牌：速度 +${reveal.value}。`},
      kind: reveal.kind,
      reveals: [reveal],
    });
  }
  return events;
}
