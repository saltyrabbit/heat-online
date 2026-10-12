import {
  ArrowRight,
  CornerUpRight,
  Gauge,
  Layers,
  Plus,
  RotateCcw,
  Settings2,
  Shuffle,
  Trash2,
  Wind,
  Zap,
} from "lucide-react";
import { roundFlowState, type StatusRoom } from "../lib/round-status";
const groups = [
  {
    key: "plan",
    title: "一起决策",
    note: "所有车手同时完成 1–2",
    steps: [
      {
        n: 1,
        title: "换挡",
        tag: "必做",
        Icon: Settings2,
        text: "决定挡位；换两挡付 1 热量，积水降挡另付 1。",
      },
      {
        n: 2,
        title: "出牌",
        tag: "必做",
        Icon: Layers,
        text: "按挡位选相同张数的牌，锁定等待。",
      },
    ],
  },
  {
    key: "react",
    title: "当前车手行动",
    note: "按回合开始时的排名，从前往后",
    steps: [
      {
        n: 3,
        title: "翻牌与移动",
        tag: "必做",
        Icon: Shuffle,
        text: "揭开出牌，结算所有翻牌，选可变速度后前进。",
      },
      {
        n: 4,
        title: "肾上腺素",
        tag: "按条件",
        Icon: Plus,
        text: "末位额外冷却 1；可选速度 +1。",
      },
      {
        n: 5,
        title: "反应",
        tag: "按效果",
        Icon: Zap,
        text: "冷却、加速、牵引与升级顺序自选；必付效果需完成。",
      },
      {
        n: 6,
        title: "尾流",
        tag: "可选",
        Icon: Wind,
        text: "符合条件可前进 2 格；连续尾流符号可追加次数，不增加速度。",
      },
      {
        n: 7,
        title: "弯道检查",
        tag: "按条件",
        Icon: CornerUpRight,
        text: "若越过弯线，按超速量支付热量。",
      },
    ],
  },
  {
    key: "discard",
    title: "各自异步收尾",
    note: "第 7 步完成，下位车手即可开始行动",
    steps: [
      {
        n: 8,
        title: "弃牌",
        tag: "可选",
        Icon: Trash2,
        text: "可弃速度牌；压力和热量保留；隧道内不能弃手牌。",
      },
      {
        n: 9,
        title: "补牌",
        tag: "必做",
        Icon: Gauge,
        text: "弃置已出牌／保留牌顶，付碎石热量，再补至 7 张。",
      },
    ],
  },
] as const;

export function RoundFlow({
  room,
  compact = false,
}: {
  room?: StatusRoom | null;
  compact?: boolean;
}) {
  const { labels, status } = roundFlowState(room);
  return (
    <section
      className={`roundFlow ${compact ? "compact" : ""}`}
      aria-label="回合顺序参考"
    >
      <div className="flowHeading">
        <div>
          <div className="eyebrow">ROUND SEQUENCE</div>
          <h2>一回合，按这个顺序走</h2>
        </div>
        <span
          className={`flowStatus ${Object.keys(labels).length ? "live" : ""}`}
          role="status"
        >
          {status}
        </span>
      </div>
      <div className="flowGroups">
        {groups.map((group) => (
          <div className={`flowGroup ${group.key}`} key={group.key}>
            <div className="flowGroupHeading">
              <strong>{group.title}</strong>
              <small>{group.note}</small>
            </div>
            <ol
              className="flowSteps"
              start={group.steps[0].n}
              aria-label={group.title}
            >
              {group.steps.map(({ n, title, tag, Icon, text }) => (
                <li
                  className={`flowStep ${labels[n] ? "activeStep" : ""}`}
                  aria-current={labels[n] ? "step" : undefined}
                  key={n}
                >
                  <div className="flowStepTop">
                    <b className="flowNumber">{n}</b>
                    <Icon size={18} aria-hidden="true" />
                    <small className={tag === "必做" ? "required" : ""}>
                      {tag}
                    </small>
                  </div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  {labels[n] && (
                    <span className="flowStepState">
                      <i />
                      {labels[n]}
                    </span>
                  )}
                  {n !== 9 && (
                    <ArrowRight
                      className="flowArrow"
                      size={13}
                      aria-hidden="true"
                    />
                  )}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
      <div className="flowRepeat">
        <RotateCcw size={15} aria-hidden="true" />
        <span>
          车手依次完成 3–7；8–9 可与下一位的行动并行 → 全员收尾后进入下一回合。
        </span>
      </div>
      <div className="flowTips">
        <p>
          <b>加速 → 尾流</b>{" "}
          可以同回合使用。先完成反应，再选尾流；进入尾流后不能再冷却、加速或牵引；完成所有尾流后自动检查弯道，连续尾流时可选择提前停止。
        </p>
        <p>
          <b>按需执行</b> 肾上腺素是第 5 步可用的额外效果，2–4 人时末位、5–9
          人时末两位获得。本版翻牌、移动、弯道结算和补牌由程序自动完成。
        </p>
        <p>
          <b>本版异步收尾</b> 官方为每位车手完成 3–9 后再轮到下一位。本版在第 7
          步后就交接行动，弃牌与补牌各自完成；不必等前一位收尾。
        </p>
      </div>
      <a
        className="flowSource"
        href="https://cdn.svc.asmodee.net/staging-daysofwonder/uploads/2024/07/9101-HT-Rules-EN.pdf"
        target="_blank"
        rel="noreferrer"
      >
        官方基础规则 · 回合顺序（第 4–6 页） ↗
      </a>
    </section>
  );
}
