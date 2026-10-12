export type StatusRoom = {
  phase: string;
  me?: string;
  turn: { id: string; step?: string } | null;
  pendingDiscards?: string[];
  queue?: string[];
  players: { id: string; name: string; plan?: boolean; rank?: number | null }[];
};
export function isDiscarding(room: StatusRoom, id: string) {
  return (
    room.phase === "turn" &&
    (!!room.pendingDiscards?.includes(id) ||
      (room.turn?.id === id && room.turn.step === "discard"))
  );
}
export function driverStage(room: StatusRoom, id: string) {
  const player = room.players.find((p) => p.id === id);
  if (room.phase === "finished" || player?.rank) return "finished";
  if (room.phase === "draft") return "draft";
  if (room.phase === "lobby") return "lobby";
  if (room.phase === "plan") return player?.plan ? "locked" : "plan";
  if (isDiscarding(room, id)) return "discard";
  if (room.turn?.id === id)
    return room.turn.step === "reveal"
      ? "reveal"
      : room.turn.step === "slip"
        ? "slip"
        : "react";
  return room.queue?.includes(id) ? "waiting" : "done";
}
export function roundFlowState(room?: StatusRoom | null) {
  const labels: Record<number, string> = {};
  if (room?.phase === "draft")
    return { labels, status: "开赛前：三轮车库选牌" };
  if (room?.phase === "plan") {
    labels[1] = labels[2] = "同时决策";
    return { labels, status: "当前：同时换挡与选牌" };
  }
  if (room?.phase === "turn") {
    const pending = new Set(room.pendingDiscards || []);
    if (room.turn?.step === "discard") pending.add(room.turn.id);
    const mine = !!room.me && pending.has(room.me);
    const driver = room.players.find((p) => p.id === room.turn?.id);
    const revealing = !!driver && room.turn?.step === "reveal";
    const slipping = !!driver && room.turn?.step === "slip";
    const reacting =
      !!driver && room.turn?.step !== "discard" && !revealing && !slipping;
    if (slipping)
      labels[6] =
        driver.id === room.me ? "你正在连续尾流" : driver.name + "连续尾流中";
    if (revealing)
      labels[3] =
        driver.id === room.me ? "你选择速度" : driver.name + "选择速度";
    if (reacting)
      labels[5] = driver.id === room.me ? "你正在反应" : driver.name + "行动中";
    if (pending.size)
      labels[8] = mine ? "你正在收尾" : pending.size + " 位车手收尾";
    const action = slipping
      ? driver.name + "正在连续尾流"
      : revealing
        ? driver.name + "正在选择翻牌后的速度"
        : reacting
          ? (driver.id === room.me ? "你" : driver.name) + "正在反应"
          : "";
    const cleanup = mine
      ? "你正在收尾"
      : pending.size
        ? pending.size + " 位车手正在收尾"
        : "";
    return {
      labels,
      status: [action, cleanup].filter(Boolean).join(" · ") || "等待车手行动",
    };
  }
  return {
    labels,
    status:
      room?.phase === "finished" ? "比赛已结束" : "按官方基础规则的 9 步顺序",
  };
}
