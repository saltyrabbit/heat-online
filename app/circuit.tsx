import type { Track } from "../lib/tracks";
import { geometry } from "../lib/track-geometry";
type Car = {
  id: string;
  name: string;
  color: string;
  pos: number;
  lane: number;
  rank?: number | null;
};
export function Circuit({
  track,
  r,
  large = false,
}: {
  track: Track;
  r?: { players: Car[]; laps: number } | null;
  large?: boolean;
}) {
  const { point, path, labels, title } = geometry(track);
  const cars = r?.players.filter((p) => !p.rank) || [
    { id: "a", name: "01", color: "#ef573f", pos: 4, lane: 0 },
    { id: "b", name: "02", color: "#50a9e8", pos: 3, lane: 1 },
    { id: "c", name: "03", color: "#f0c34b", pos: track.length - 3, lane: 0 },
  ];
  const start = point(-0.5);
  return (
    <svg
      className={"circuit " + (large ? "large" : "")}
      viewBox="0 0 840 475"
      role="img"
      aria-label={`${track.name}赛道，${track.length}格双车道，弯道限速${track.corners.map((c) => c.limit).join("、")}`}
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
        <pattern id="finish" width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="4" height="4" fill="white" />
          <rect x="4" y="4" width="4" height="4" fill="white" />
        </pattern>
      </defs>
      <rect width="840" height="475" fill="#e7ecdf" />
      <rect width="840" height="475" fill="url(#grass)" />
      <path d={path} fill="none" stroke="#fffaf0" strokeWidth="56" />
      <path
        d={path}
        fill="none"
        stroke="#d76550"
        strokeWidth="50"
        strokeDasharray="8 8"
      />
      <path d={path} fill="none" stroke="#424d4b" strokeWidth="40" />
      <path
        d={path}
        fill="none"
        stroke="#abb5ac"
        strokeWidth="1"
        strokeDasharray="5 6"
      />
      {Array.from({ length: track.length }, (_, i) => {
        const a = point(i - 0.5, -20),
          b = point(i - 0.5, 20);
        return (
          <line
            key={i}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke="#89988f"
            strokeWidth="1"
          />
        );
      })}
      <g transform={`translate(${start.x} ${start.y}) rotate(${start.angle})`}>
        <rect x="-3" y="-20" width="7" height="40" fill="url(#finish)" />
        <path d="M9 -5L17 0L9 5" stroke="#fff" strokeWidth="2" fill="none" />
      </g>
      {track.corners.map((c, i) => {
        const a = point(c.at - 0.5, -21),
          b = point(c.at - 0.5, 21),
          label = labels[i];
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
              r="18"
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
              y={label.y + 32}
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
        x={title.x}
        y={title.y}
        textAnchor="middle"
        fill="#365a51"
        fontSize={track.id === "britain" ? 19 : 26}
        fontWeight="800"
        letterSpacing="3"
      >
        {track.english}
      </text>
      <text
        x={title.x}
        y={title.y + 24}
        textAnchor="middle"
        fill="#578074"
        fontSize="12"
      >
        {track.name} · {track.length} 格 · {r?.laps || track.laps} 圈
      </text>
      {cars.map((p) => {
        const a = point(
          p.pos,
          (p.lane === 0 ? 1 : -1) * (track.id === "coastline" ? -10 : 10),
        );
        return (
          <g
            key={p.id}
            transform={`translate(${a.x} ${a.y}) rotate(${a.angle})`}
          >
            <title>{`${p.name}：第 ${Math.max(0, p.pos)} 格`}</title>
            <rect x="-7" y="-8" width="5" height="16" rx="1" fill="#202b29" />
            <rect x="5" y="-8" width="5" height="16" rx="1" fill="#202b29" />
            <rect
              x="-10"
              y="-5"
              width="23"
              height="10"
              rx="4"
              fill={p.color}
              stroke="#fff"
              strokeWidth="1.2"
            />
            <rect x="-2" y="-3" width="6" height="6" rx="2" fill="#263e3a" />
            <path d="M8 -3V3" stroke="white" strokeWidth="1.5" />
          </g>
        );
      })}
      <text x="25" y="465" fontSize="10" fill="#68786b" letterSpacing="1">
        {track.official ? "基础版赛道参数 · 原创示意重绘" : "原创练习赛道"} ·
        箭头为行驶方向 · 黄线为弯线
      </text>
    </svg>
  );
}
