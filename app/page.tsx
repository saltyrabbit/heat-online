"use client";
import { useEffect, useRef, useState } from "react";
import { TRACK, crossed, type Card } from "../lib/game";
type P = {
  id: string;
  name: string;
  color: string;
  bot: boolean;
  pos: number;
  lane: number;
  gear: number;
  engine: number;
  plan: boolean;
  rank: number | null;
  hand: Card[];
  played: Card[];
  handCount: number;
  deckCount: number;
  discardCount: number;
};
type R = {
  code: string;
  host: string;
  me: string;
  phase: string;
  laps: number;
  round: number;
  version: number;
  players: P[];
  turn: any;
  log: string[];
  canSlip: boolean;
};
const pt = (pos: number, lane = 0, extra = 0) => {
  const t = (2 * Math.PI * (((pos % 64) + 64) % 64)) / 64;
  return {
    x: +(420 + (315 + (lane ? 13 : -13) + extra) * Math.sin(t)).toFixed(3),
    y: +(238 - (154 + (lane ? 13 : -13) + extra) * Math.cos(t)).toFixed(3),
    angle: +((t * 180) / Math.PI).toFixed(3),
  };
};
function Circuit({ r, large = false }: { r?: R | null; large?: boolean }) {
  const cars = r?.players.filter((p) => !p.rank) || [
    { id: "a", name: "01", color: "#ef573f", pos: 7, lane: 0 },
    { id: "b", name: "02", color: "#50a9e8", pos: 6, lane: 1 },
    { id: "c", name: "03", color: "#f0c34b", pos: 38, lane: 0 },
  ];
  return (
    <svg
      className={"circuit " + (large ? "large" : "")}
      viewBox="0 0 840 475"
      role="img"
      aria-label="海岸环线，64格双车道，弯道限速分别为3、5、3、4"
    >
      <defs>
        <pattern
          id="grass"
          width="16"
          height="16"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2" cy="2" r=".7" fill="#acc0ad" />
        </pattern>
        <pattern
          id="finish"
          width="10"
          height="10"
          patternUnits="userSpaceOnUse"
        >
          <rect width="5" height="5" fill="white" />
          <rect x="5" y="5" width="5" height="5" fill="white" />
        </pattern>
      </defs>
      <rect width="840" height="475" fill="#e7ecdf" />
      <rect width="840" height="475" fill="url(#grass)" />
      <path
        d="M250 210Q280 130 405 167T581 220Q637 307 522 319T305 300Q219 280 250 210"
        fill="#b7d8d1"
      />
      <path
        d="M280 206Q319 158 405 190T553 227"
        fill="none"
        stroke="#d4e8e0"
        strokeWidth="3"
      />
      <ellipse
        cx="420"
        cy="238"
        rx="315"
        ry="154"
        fill="none"
        stroke="#fffaf0"
        strokeWidth="72"
      />
      <ellipse
        cx="420"
        cy="238"
        rx="315"
        ry="154"
        fill="none"
        stroke="#d76550"
        strokeWidth="65"
        strokeDasharray="9 10"
      />
      <ellipse
        cx="420"
        cy="238"
        rx="315"
        ry="154"
        fill="none"
        stroke="#424d4b"
        strokeWidth="54"
      />
      <ellipse
        cx="420"
        cy="238"
        rx="315"
        ry="154"
        fill="none"
        stroke="#abb5ac"
        strokeWidth="1.4"
        strokeDasharray="6 7"
      />
      {Array.from({ length: 64 }, (_, i) => {
        const a = pt(i, 0, -12),
          b = pt(i, 1, 12);
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="#88948e"
            strokeWidth="1"
          />
        );
      })}
      <rect x="414" y="58" width="12" height="54" fill="url(#finish)" />
      <text
        x="443"
        y="39"
        fill="#55615a"
        fontSize="11"
        fontWeight="700"
        letterSpacing="2"
      >
        START / FINISH →
      </text>
      {TRACK.corners.map((c, i) => {
        const a = pt(c.at, 0, -13),
          b = pt(c.at, 1, 13),
          label = pt(c.at, 0, 65);
        return (
          <g key={c.at}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke="#f7cc69"
              strokeWidth="4"
            />
            <circle
              cx={label.x}
              cy={label.y}
              r="19"
              fill="#f9f6ed"
              stroke="#c98f48"
            />
            <text
              x={label.x}
              y={label.y + 6}
              textAnchor="middle"
              fontSize="19"
              fontWeight="800"
              fill="#73451f"
            >
              {c.limit}
            </text>
            <text
              x={label.x}
              y={label.y + 34}
              textAnchor="middle"
              fill="#6d756b"
              fontSize="10"
            >
              弯道 {i + 1}
            </text>
          </g>
        );
      })}
      <text
        x="420"
        y="225"
        textAnchor="middle"
        fill="#365a51"
        fontSize="28"
        fontWeight="800"
        letterSpacing="7"
      >
        COASTLINE
      </text>
      <text
        x="420"
        y="257"
        textAnchor="middle"
        fill="#365a51"
        fontSize="16"
        letterSpacing="5"
      >
        海 岸 环 线
      </text>
      <text
        x="420"
        y="288"
        textAnchor="middle"
        fill="#578074"
        fontSize="11"
        letterSpacing="2"
      >
        64 格 · 4 处弯道 · {r?.laps || 2} 圈
      </text>
      {cars.map((p, i) => {
        const a = pt(p.pos, p.lane);
        return (
          <g
            key={p.id}
            transform={`translate(${a.x} ${a.y}) rotate(${a.angle + 90})`}
          >
            <title>{`${p.name}：第 ${p.pos} 格`}</title>
            <rect x="-11" y="-10" width="8" height="4" rx="1" fill="#202b29" />
            <rect x="-11" y="6" width="8" height="4" rx="1" fill="#202b29" />
            <rect x="5" y="-10" width="8" height="4" rx="1" fill="#202b29" />
            <rect x="5" y="6" width="8" height="4" rx="1" fill="#202b29" />
            <rect
              x="-13"
              y="-7"
              width="29"
              height="14"
              rx="6"
              fill={p.color}
              stroke="#fff"
              strokeWidth="1.5"
            />
            <rect x="-3" y="-4" width="8" height="8" rx="2" fill="#263e3a" />
            <path d="M8 -5V5" stroke="white" strokeWidth="2" />
          </g>
        );
      })}
      <text x="25" y="450" fontSize="10" fill="#68786b" letterSpacing="1.5">
        原创练习赛道 · 顺时针行驶
      </text>
    </svg>
  );
}
function CardButton({
  card,
  chosen,
  disabled,
  onClick,
}: {
  card: Card;
  chosen: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const heat = card.type === "heat",
    stress = card.type === "stress";
  return (
    <button
      type="button"
      className={`card ${heat ? "heat" : stress ? "stress" : "speed"} ${chosen ? "chosen" : ""}`}
      aria-pressed={chosen}
      disabled={disabled}
      onClick={onClick}
    >
      <span className="cardlabel">
        {heat ? "引擎热量" : stress ? "压力" : "速度"}
      </span>
      <strong>{heat ? "♨" : stress ? "?" : card.value}</strong>
      <span className="cardfoot">
        {heat
          ? "冷却后回到引擎"
          : stress
            ? "翻出基础速度牌"
            : card.basic
              ? "基础牌"
              : "起始升级"}
      </span>
      {chosen && <span className="tick">✓</span>}
    </button>
  );
}
export default function Home() {
  const [r, setR] = useState<R | null>(null),
    [name, setName] = useState(""),
    [code, setCode] = useState(""),
    [laps, setLaps] = useState(2),
    [gear, setGear] = useState(1),
    [selected, setSelected] = useState<string[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [help, setHelp] = useState(false),
    [connected, setConnected] = useState(true),
    [notice, setNotice] = useState("");
  const currentCode = useRef("");
  const rRef = useRef<R | null>(null);
  const lastKey = useRef("");
  const me = r?.players.find((p) => p.id === r.me);
  const active = r?.turn?.id === r?.me;
  const sorted = r
    ? [...r.players].sort(
        (a, b) =>
          (a.rank || 99) - (b.rank || 99) || b.pos - a.pos || a.lane - b.lane,
      )
    : [];
  function apply(data: R) {
    if (currentCode.current && data.code !== currentCode.current) return;
    if (rRef.current?.code === data.code && data.version < rRef.current.version)
      return;
    currentCode.current = data.code;
    rRef.current = data;
    setR(data);
    setConnected(true);
    try {
      localStorage.setItem("heat-room", data.code);
    } catch {}
    const mine = data.players.find((p) => p.id === data.me)!;
    const key = `${data.code}:${data.round}:${data.phase}:${data.turn?.step}:${mine.plan}:${mine.hand.map((c) => c.id).join(",")}`;
    if (key !== lastKey.current) {
      setSelected([]);
      if (data.phase === "plan") setGear(mine.gear);
      lastKey.current = key;
    }
  }
  async function refresh(c = currentCode.current) {
    if (!c) return;
    try {
      const res = await fetch(`/api/rooms?code=${encodeURIComponent(c)}`);
      const data = (await res.json()) as R & {
        error: string;
        refresh?: boolean;
      };
      if (res.ok) apply(data);
      else {
        setConnected(false);
        if (!rRef.current) setError(data.error);
      }
    } catch {
      setConnected(false);
    }
  }
  useEffect(() => {
    try {
      setName(localStorage.getItem("heat-name") || "");
      const invite = new URL(location.href).searchParams.get("room");
      if (invite) setCode(invite.toUpperCase());
      else {
        const saved = localStorage.getItem("heat-room");
        if (saved) refresh(saved);
      }
    } catch {}
    const timer = setInterval(() => refresh(), 1700);
    return () => clearInterval(timer);
  }, []);
  async function send(action: string, extra: Record<string, unknown> = {}) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          code: currentCode.current || code.trim().toUpperCase(),
          name: name.trim(),
          laps,
          version: rRef.current?.version,
          requestId: crypto.randomUUID(),
          ...extra,
        }),
      });
      const data = (await res.json()) as R & {
        error: string;
        refresh?: boolean;
      };
      if (!res.ok) {
        if (data.refresh) await refresh();
        throw new Error(data.error || "操作失败");
      }
      try {
        localStorage.setItem("heat-name", name);
      } catch {}
      apply(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function toggle(id: string) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id],
    );
  }
  async function invite() {
    const url = `${location.origin}/?room=${r!.code}`;
    try {
      await navigator.clipboard.writeText(url);
      setNotice("邀请链接已复制");
    } catch {
      setNotice(url);
    }
    setTimeout(() => setNotice(""), 7000);
  }
  const playable = me?.hand.filter((c) => c.type !== "heat").length || 0;
  const forced = playable < gear;
  const chosenCards = me?.hand.filter((c) => selected.includes(c.id)) || [];
  const minSpeed = chosenCards.reduce(
      (n, c) => n + (c.type === "stress" ? 1 : c.value),
      0,
    ),
    maxSpeed = chosenCards.reduce(
      (n, c) => n + (c.type === "stress" ? 4 : c.value),
      0,
    );
  const nextCorner = me
    ? Array.from({ length: 3 }, (_, i) =>
        TRACK.corners.map((c) => ({
          ...c,
          at: c.at + (Math.max(0, Math.floor(me.pos / 64)) + i) * 64,
        })),
      )
        .flat()
        .find((c) => c.at > me.pos && c.at < 64 * (r?.laps || 2))
    : null;
  const cost =
    r?.turn && me && active
      ? crossed(r.turn.start, me.pos, r.laps * 64).reduce(
          (n, c) => n + Math.max(0, r.turn.speed - c.limit),
          0,
        )
      : 0;
  return (
    <>
      <header className="topbar">
        <a
          className="brand"
          href="/"
          onClick={(e) => {
            if (r) e.preventDefault();
          }}
        >
          <span className="brandmark">H</span>
          <span>
            HEAT<span className="brandSub">CLUB RACING</span>
          </span>
        </a>
        <div className="headerRight">
          <span className="edition">中文 · 基础规则</span>
          <button className="quiet" onClick={() => setHelp(true)}>
            玩法指南 ↗
          </button>
        </div>
      </header>
      <main className={r ? "raceMain" : "landing"}>
        {!r ? (
          <>
            <section className="intro">
              <div className="eyebrow">
                <i /> MULTIPLAYER RACING CLUB
              </div>
              <h1>
                油门到底。
                <br />
                <em>朋友上场。</em>
              </h1>
              <p className="lead">
                换挡，选牌，压着极限过弯。
                <br />
                一场关于速度与热量的桌上竞速，现在在线开跑。
              </p>
              <div className="heroMap">
                <Circuit large />
                <span className="mapBadge">01 / 海岸环线</span>
              </div>
              <div className="featureRow">
                <span>↗ 2–6 位车手</span>
                <span>⟳ 同步回合</span>
                <span>◎ 房间码邀请</span>
              </div>
            </section>
            <section className="entry">
              <div className="entryNumber">THE PADDOCK / 车手围场</div>
              <h2>一起上赛道</h2>
              <p>输入昵称，创建比赛或加入朋友的房间。</p>
              <label>
                你的车手昵称
                <input
                  value={name}
                  maxLength={18}
                  placeholder="例如：弯道之王"
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label>
                比赛距离
                <div className="segmented">
                  <button
                    className={laps === 1 ? "on" : ""}
                    onClick={() => setLaps(1)}
                  >
                    1 圈 · 练习赛
                  </button>
                  <button
                    className={laps === 2 ? "on" : ""}
                    onClick={() => setLaps(2)}
                  >
                    2 圈 · 正式赛
                  </button>
                </div>
              </label>
              <button
                className="primary wide"
                disabled={busy || !name.trim()}
                onClick={() => send("create")}
              >
                创建房间 <span>→</span>
              </button>
              <div className="divider">
                <span>或加入已有比赛</span>
              </div>
              <label>
                六位房间码
                <input
                  className="codeInput"
                  value={code}
                  maxLength={6}
                  placeholder="ABC123"
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  autoCapitalize="characters"
                />
              </label>
              <button
                className="outline wide"
                disabled={busy || !name.trim() || code.trim().length !== 6}
                onClick={() =>
                  send("join", { code: code.trim().toUpperCase() })
                }
              >
                加入房间 →
              </button>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <p className="entryNote">
                朋友打开邀请链接即可加入。
                <br />
                刷新页面会自动恢复当前座位。
              </p>
            </section>
          </>
        ) : (
          <>
            <div className="raceHeader">
              <div>
                <div className="eyebrow">
                  {r.phase === "lobby"
                    ? "PADDOCK / 等待发车"
                    : r.phase === "finished"
                      ? "CHEQUERED FLAG / 比赛结束"
                      : "GRAND PRIX / 海岸大奖赛"}
                </div>
                <h1>
                  {r.phase === "lobby"
                    ? "车手就位。"
                    : r.phase === "finished"
                      ? `${sorted[0]?.name}，冠军！`
                      : "每一弯，都有机会。"}
                </h1>
              </div>
              <div className="roomBlock">
                <span
                  className={"statusDot " + (!connected ? "offline" : "")}
                />{" "}
                <span>{connected ? "已连接" : "重连中"}</span>
                <button
                  className="roomCode"
                  onClick={invite}
                  title="复制邀请链接"
                >
                  {r.code} ↗
                </button>
                <button className="quiet" onClick={invite}>
                  邀请朋友
                </button>
              </div>
            </div>
            {notice && (
              <div className="notice" role="status">
                {notice}
              </div>
            )}
            {error && (
              <div className="error" role="alert">
                {error}
                <button className="quiet" onClick={() => setError("")}>
                  关闭
                </button>
              </div>
            )}
            <div className="gameGrid">
              <section className="trackPanel">
                <div className="panelHeading">
                  <span>
                    海岸环线 <small>COASTLINE CIRCUIT</small>
                  </span>
                  <span>
                    {r.phase === "lobby"
                      ? `${r.players.length} / 6 车手`
                      : `第 ${r.round} 回合 · ${r.laps} 圈`}
                  </span>
                </div>
                <Circuit r={r} />
                <div className="trackLegend">
                  <span>
                    <i className="cornerDot" /> 黄线处检查弯道限速
                  </span>
                  <span>双车道 · 内侧优先 · 顺时针 →</span>
                </div>
              </section>
              <aside className="standings">
                <div className="panelHeading">
                  <span>{r.phase === "lobby" ? "发车名单" : "实时排名"}</span>
                  <small>{r.players.length} DRIVERS</small>
                </div>
                {sorted.map((p, i) => (
                  <div
                    className={"driver " + (p.id === r.me ? "mine" : "")}
                    key={p.id}
                  >
                    <span className="place">
                      {String(p.rank || i + 1).padStart(2, "0")}
                    </span>
                    <i style={{ background: p.color }} />
                    <div className="driverText">
                      <strong>
                        {p.name} {p.id === r.me && <small>你</small>}
                      </strong>
                      <span>
                        {p.bot ? "电脑车手" : p.id === r.host ? "房主" : "车手"}{" "}
                        ·{" "}
                        {r.phase === "lobby"
                          ? "已就位"
                          : p.rank
                            ? "已完赛"
                            : `${Math.min(r.laps, Math.max(1, Math.floor(p.pos / 64) + 1))}/${r.laps} 圈 · ${Math.max(0, p.pos % 64)} 格`}
                      </span>
                    </div>
                    {r.phase === "plan" && !p.rank ? (
                      <span className={"ready " + (p.plan ? "yes" : "")}>
                        {p.plan ? "已选牌" : "选牌中"}
                      </span>
                    ) : r.turn?.id === p.id ? (
                      <span className="ready yes">行动中</span>
                    ) : null}
                    {r.phase === "lobby" &&
                      r.me === r.host &&
                      p.id !== r.host && (
                        <button
                          className="iconBtn"
                          aria-label={`移除 ${p.name}`}
                          disabled={busy}
                          onClick={() => send("remove", { playerId: p.id })}
                        >
                          ×
                        </button>
                      )}
                  </div>
                ))}
                {r.phase === "lobby" ? (
                  <div className="lobbyActions">
                    {r.me === r.host ? (
                      <>
                        <button
                          className="outline wide"
                          disabled={busy || r.players.length >= 6}
                          onClick={() => send("bot")}
                        >
                          ＋ 添加电脑车手
                        </button>
                        <button
                          className="primary wide"
                          disabled={busy || r.players.length < 2}
                          onClick={() => send("start")}
                        >
                          开始比赛 →
                        </button>
                        <p>至少 2 位车手即可发车。电脑可补足空位。</p>
                      </>
                    ) : (
                      <p>等待房主开始比赛。</p>
                    )}
                  </div>
                ) : (
                  <div className="phaseSummary">
                    <span>
                      {r.phase === "plan"
                        ? "同时选牌"
                        : r.phase === "finished"
                          ? "所有车手已完赛"
                          : `${r.players.find((p) => p.id === r.turn?.id)?.name || ""} 正在行动`}
                    </span>
                    <p>
                      {r.phase === "plan"
                        ? "所有车手确认后，依发车位置逐个行动。"
                        : "本回合的行动顺序在选牌前确定。"}
                    </p>
                  </div>
                )}
              </aside>
            </div>
            {r.phase === "lobby" ? (
              <section className="lobbyInfo">
                <span className="infoIcon">↗</span>
                <div>
                  <h3>把房间码发给朋友，比赛随时开始。</h3>
                  <p>
                    每位车手使用自己的浏览器加入。也可以添加电脑，先来一场练习赛。
                  </p>
                </div>
              </section>
            ) : r.phase === "finished" ? (
              <section className="results">
                <div>
                  <div className="eyebrow">RACE CLASSIFICATION</div>
                  <h2>终点见，下一场再来。</h2>
                  <p>
                    {sorted
                      .map((p, i) => `${i + 1}. ${p.name}`)
                      .join("　 /　 ")}
                  </p>
                </div>
                {r.me === r.host && (
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={() => send("reset")}
                  >
                    回到大厅 · 再赛一场 →
                  </button>
                )}
              </section>
            ) : (
              me && (
                <section className="cockpit">
                  <div className="cockpitTop">
                    <div>
                      <div className="eyebrow">YOUR COCKPIT / {me.name}</div>
                      <h2>
                        {me.rank
                          ? "你已完赛，等待其他车手"
                          : r.phase === "plan"
                            ? me.plan
                              ? "选牌已锁定，等待其他车手"
                              : "选择挡位，安排这一回合"
                            : active
                              ? r.turn.step === "discard"
                                ? "选择弃牌，然后结束回合"
                                : "冷却、加速，决定你的极限"
                              : "等待前方车手行动"}
                      </h2>
                    </div>
                    <div className="metrics">
                      <div>
                        <b>{me.engine}</b>
                        <span>可用热量</span>
                      </div>
                      <div>
                        <b>{me.gear}</b>
                        <span>当前挡位</span>
                      </div>
                      <div>
                        <b>{active ? r.turn.speed : "—"}</b>
                        <span>本轮速度</span>
                      </div>
                    </div>
                  </div>
                  {r.phase === "plan" && !me.plan && !me.rank && (
                    <div className="planning">
                      <div className="gearBox">
                        <span>挡位 / 出牌张数</span>
                        <div className="gears">
                          {[1, 2, 3, 4].map((g) => (
                            <button
                              key={g}
                              className={gear === g ? "on" : ""}
                              disabled={
                                busy ||
                                Math.abs(g - me.gear) > 2 ||
                                (Math.abs(g - me.gear) === 2 && me.engine < 1)
                              }
                              onClick={() => {
                                setGear(g);
                                setSelected([]);
                              }}
                            >
                              {g}
                              <small>挡</small>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="planText">
                        <strong>
                          {forced
                            ? "可用牌不足，将停留并降至 1 挡"
                            : `已选 ${selected.length} / ${gear} 张 · 预计速度 ${minSpeed === maxSpeed ? minSpeed : `${minSpeed}–${maxSpeed}`}`}
                        </strong>
                        <span>
                          {nextCorner
                            ? `距下一弯 ${nextCorner.at - me.pos} 格，限速 ${nextCorner.limit}`
                            : "前方终点直道"}
                          {Math.abs(gear - me.gear) === 2
                            ? " · 换两挡支付 1 热量"
                            : ""}
                        </span>
                      </div>
                      <button
                        className="primary"
                        disabled={busy || (!forced && selected.length !== gear)}
                        onClick={() => send("plan", { gear, cards: selected })}
                      >
                        {forced ? "确认过热停留" : "锁定选牌"} →
                      </button>
                    </div>
                  )}
                  {active && r.turn.step === "react" && (
                    <div className="reactRow">
                      <div className="actionButtons">
                        <button
                          className="outline"
                          disabled={
                            busy ||
                            !r.turn.cool ||
                            !me.hand.some((c) => c.type === "heat")
                          }
                          onClick={() => send("react", { kind: "cool" })}
                        >
                          ♨ 冷却一次 <small>剩余 {r.turn.cool}</small>
                        </button>
                        <button
                          className="outline"
                          disabled={busy || r.turn.boost || me.engine < 1}
                          onClick={() => send("react", { kind: "boost" })}
                        >
                          ↗ 加速 <small>付 1 热量 · +1–4</small>
                        </button>
                        <button
                          className="outline"
                          disabled={busy || r.turn.adrenaline}
                          onClick={() => send("react", { kind: "adrenaline" })}
                        >
                          ＋ 肾上腺素 <small>速度 +1</small>
                        </button>
                      </div>
                      <div
                        className={"cost " + (cost > me.engine ? "danger" : "")}
                      >
                        当前过弯需 {cost} 热量
                        {cost > me.engine ? " · 将打滑" : ""}
                      </div>
                      <div className="actionButtons">
                        <button
                          className="outline"
                          disabled={busy || !r.canSlip}
                          onClick={() => send("react", { kind: "slip" })}
                        >
                          尾流 +2 · 检查弯道
                        </button>
                        <button
                          className="primary"
                          disabled={busy}
                          onClick={() => send("react", { kind: "check" })}
                        >
                          不使用尾流 · 检查弯道 →
                        </button>
                      </div>
                    </div>
                  )}
                  {active && r.turn.step === "discard" && (
                    <div className="planning">
                      <p>
                        可选弃掉速度牌，为下一回合腾出手牌。压力牌和热量牌必须保留。
                      </p>
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={() =>
                          send("react", { kind: "finish", cards: selected })
                        }
                      >
                        弃掉 {selected.length} 张 · 结束回合 →
                      </button>
                    </div>
                  )}
                  <div className="handHeading">
                    <span>
                      你的手牌 <small>{me.handCount} 张</small>
                    </span>
                    <small>
                      牌库 {me.deckCount} · 弃牌堆 {me.discardCount}
                      {r.phase === "plan" && !me.plan
                        ? " · 点击选牌"
                        : active && r.turn.step === "discard"
                          ? " · 点击选择弃牌"
                          : ""}
                    </small>
                  </div>
                  <div className="hand">
                    {me.hand.map((c) => (
                      <CardButton
                        key={c.id}
                        card={c}
                        chosen={selected.includes(c.id)}
                        disabled={
                          busy ||
                          !!me.rank ||
                          !(
                            (r.phase === "plan" &&
                              !me.plan &&
                              c.type !== "heat") ||
                            (active &&
                              r.turn.step === "discard" &&
                              c.type === "speed")
                          )
                        }
                        onClick={() => toggle(c.id)}
                      />
                    ))}
                  </div>
                  {active && me.played.length > 0 && (
                    <div className="revealed">
                      本回合已打出：
                      {me.played
                        .map((c) =>
                          c.type === "stress"
                            ? "压力"
                            : c.type === "heat"
                              ? "热量"
                              : c.value,
                        )
                        .join(" / ")}
                      {r.turn.stress.length
                        ? `　压力翻牌：${r.turn.stress.join(" + ")}`
                        : ""}
                    </div>
                  )}
                </section>
              )
            )}
            <div className="bottomGrid">
              <section className="raceLog">
                <div className="panelHeading">
                  <span>
                    比赛电台 <small>RACE RADIO</small>
                  </span>
                  <small>最近行动</small>
                </div>
                <div className="logList" aria-live="polite">
                  {r.log
                    .slice(-7)
                    .reverse()
                    .map((s, i) => (
                      <p key={`${r.log.length - i}-${s}`}>
                        <span>{i === 0 ? "●" : "·"}</span>
                        {s}
                      </p>
                    ))}
                </div>
              </section>
              <section className="raceTools">
                <h3>比赛控制</h3>
                {r.me === r.host ? (
                  <>
                    <p>
                      掉线的车手可由电脑接管。接管后该座位将由电脑完成比赛。
                    </p>
                    <div className="takeovers">
                      {r.phase !== "lobby" &&
                        r.phase !== "finished" &&
                        r.players
                          .filter((p) => !p.bot && p.id !== r.host && !p.rank)
                          .map((p) => (
                            <button
                              className="quiet"
                              key={p.id}
                              disabled={busy}
                              onClick={() => {
                                if (confirm(`让电脑接管 ${p.name} 的座位？`))
                                  send("takeover", { playerId: p.id });
                              }}
                            >
                              电脑接管 {p.name} ↗
                            </button>
                          ))}
                    </div>
                    {r.phase !== "lobby" && (
                      <button
                        className="quiet"
                        disabled={busy}
                        onClick={() => {
                          if (
                            r.phase === "finished" ||
                            confirm("结束当前比赛并返回大厅？")
                          )
                            send("reset");
                        }}
                      >
                        返回大厅
                      </button>
                    )}
                  </>
                ) : (
                  <p>刷新可恢复座位；遇到掉线，请让房主启用电脑接管。</p>
                )}
                <button
                  className="quiet"
                  onClick={() => {
                    currentCode.current = "";
                    rRef.current = null;
                    setR(null);
                    try {
                      localStorage.removeItem("heat-room");
                    } catch {}
                  }}
                >
                  返回首页 ↗
                </button>
              </section>
            </div>
          </>
        )}
      </main>
      <footer>
        <span>HEAT · CLUB RACING</span>
        <span>非官方玩法实现 · 原创赛道与美术 · 基础规则</span>
      </footer>
      {help && (
        <div className="modalBackdrop" onClick={() => setHelp(false)}>
          <section
            className="helpModal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="helpTitle"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close"
              aria-label="关闭玩法指南"
              onClick={() => setHelp(false)}
            >
              ×
            </button>
            <div className="eyebrow">QUICK START / 发车指南</div>
            <h2 id="helpTitle">快，也要过得了弯。</h2>
            <ol>
              <li>
                <b>同时换挡并选牌。</b>
                挡位决定出牌数。可换一挡；换两挡需从引擎付 1
                热量。选好后锁定，等待其他车手。
              </li>
              <li>
                <b>依位置行动。</b>所出速度牌相加，压力牌翻到基础 1–4
                速度牌才停。内侧车道在同格时优先。
              </li>
              <li>
                <b>灵活冷却和加速。</b>1 挡可冷却 3 张，2 挡可冷却 1
                张。一次加速花 1 热量并翻出随机 1–4 速度。末位（5–6
                人时末两位）额外获得一次冷却与可选 +1
                速度。可自由安排这些效果的顺序。
              </li>
              <li>
                <b>选择尾流，检查弯道。</b>与车并排或落后一格可选择前进 2
                格，尾流不增加速度。越过黄色弯线后，速度超限多少就付多少热量；多弯依次支付。热量不足则退回该弯前，降至
                1 挡并增加压力牌。
              </li>
              <li>
                <b>弃牌，补足手牌。</b>
                只能主动弃速度牌；冷却才能移走手牌热量。补到 7
                张后轮到下一位车手，牌库空则洗入弃牌堆。
              </li>
              <li>
                <b>冲线决定名次。</b>
                同回合完赛者以最后位置、内侧优先排序。尾流不能跨越最终终点，冲线后的弯不再检查。
              </li>
            </ol>
            <p className="helpNote">
              海岸环线为原创 64 格双车道赛道，默认跑 2
              圈。可用牌不足时会强制原地停留并降挡。本版包含起始
              0、5、热量升级牌，不含车库、天气与扩展规则。
            </p>
            <a
              className="quiet"
              href="https://www.daysofwonder.com/game/heat/"
              target="_blank"
              rel="noreferrer"
            >
              游戏与原版规则出处 ↗
            </a>
            <button className="primary wide" onClick={() => setHelp(false)}>
              准备好，发车 →
            </button>
          </section>
        </div>
      )}
    </>
  );
}
