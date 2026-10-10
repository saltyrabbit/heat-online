import { ArrowRight, CornerUpRight, Gauge, Layers, Plus, RotateCcw, Settings2, Shuffle, Trash2, Wind, Zap } from "lucide-react";

type FlowRoom = {
  phase: string;
  turn: { id: string; step: string } | null;
  players: { id: string; name: string }[];
};
const groups = [
  { key: "plan", title: "一起决策", note: "所有车手同时完成 1–2", steps: [
    { n: 1, title: "换挡", tag: "必做", Icon: Settings2, text: "决定挡位；换两挡付 1 热量。" },
    { n: 2, title: "出牌", tag: "必做", Icon: Layers, text: "按挡位选相同张数的牌，锁定等待。" },
  ] },
  { key: "react", title: "当前车手行动", note: "按回合开始时的排名，从前往后", steps: [
    { n: 3, title: "翻牌与移动", tag: "必做", Icon: Shuffle, text: "揭开出牌，结算压力，按速度前进。" },
    { n: 4, title: "肾上腺素", tag: "按条件", Icon: Plus, text: "末位额外冷却 1；可选速度 +1。" },
    { n: 5, title: "反应", tag: "可选", Icon: Zap, text: "冷却、加速与肾上腺素，顺序自选。" },
    { n: 6, title: "尾流", tag: "可选", Icon: Wind, text: "符合位置条件可前进 2 格，不增加速度。" },
    { n: 7, title: "弯道检查", tag: "按条件", Icon: CornerUpRight, text: "若越过弯线，按超速量支付热量。" },
  ] },
  { key: "discard", title: "这位车手收尾", note: "完成后，下位车手从第 3 步开始", steps: [
    { n: 8, title: "弃牌", tag: "可选", Icon: Trash2, text: "可弃速度牌；压力和热量必须保留。" },
    { n: 9, title: "补牌", tag: "必做", Icon: Gauge, text: "已出牌进入弃牌堆，手牌补至 7 张。" },
  ] },
] as const;

export function RoundFlow({ room, compact = false }: { room?: FlowRoom | null; compact?: boolean }) {
  const stage = room?.phase === "plan" ? "plan" : room?.phase === "turn" ? room.turn?.step : null;
  const driver = room?.players.find(p => p.id === room.turn?.id)?.name;
  const status = stage === "plan" ? "当前：同时换挡与选牌" : stage === "react" ? `当前：${driver} · 反应阶段（第 4–5 步）` : stage === "discard" ? `当前：${driver} · 弃牌与补牌（第 8–9 步）` : room?.phase === "finished" ? "比赛已结束" : "按官方基础规则的 9 步顺序";
  return (
    <section className={`roundFlow ${compact ? "compact" : ""}`} aria-label="回合顺序参考">
      <div className="flowHeading">
        <div><div className="eyebrow">ROUND SEQUENCE</div><h2>一回合，按这个顺序走</h2></div>
        <span className={`flowStatus ${stage ? "live" : ""}`} role="status">{status}</span>
      </div>
      <div className="flowGroups">
        {groups.map(group => (
          <div className={`flowGroup ${group.key} ${stage === group.key ? "current" : ""}`} key={group.key}>
            <div className="flowGroupHeading"><strong>{group.title}</strong><small>{group.note}</small></div>
            <ol className="flowSteps" start={group.steps[0].n} aria-label={group.title}>
              {group.steps.map(({ n, title, tag, Icon, text }) => (
                <li className="flowStep" key={n}>
                  <div className="flowStepTop"><b className="flowNumber">{n}</b><Icon size={18} aria-hidden="true"/><small className={tag === "必做" ? "required" : ""}>{tag}</small></div>
                  <h3>{title}</h3><p>{text}</p>
                  {n !== 9 && <ArrowRight className="flowArrow" size={13} aria-hidden="true"/>}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      <div className="flowRepeat"><RotateCcw size={15} aria-hidden="true"/><span>每位车手依次完成 3–9 → 全员完成后，进入下一回合，再一起换挡选牌。</span></div>
      <div className="flowTips">
        <p><b>加速 → 尾流</b> 可以同回合使用。先完成反应，再选尾流；本版点击尾流或“不使用尾流”后，自动检查弯道，不能再冷却或加速。</p>
        <p><b>按需执行</b> 肾上腺素是第 5 步可用的额外效果，2–4 人时末位、5–6 人时末两位获得。本版翻牌、移动、弯道结算和补牌由程序自动完成。</p>
      </div>
      <a className="flowSource" href="https://cdn.svc.asmodee.net/staging-daysofwonder/uploads/2024/07/9101-HT-Rules-EN.pdf" target="_blank" rel="noreferrer">官方基础规则 · 回合顺序（第 4–6 页） ↗</a>
    </section>
  );
}
