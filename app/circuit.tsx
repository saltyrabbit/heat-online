import type { Track } from "../lib/tracks";
import {
  geometry,
  innerGuide,
  innerLane,
  laneOffset,
} from "../lib/track-geometry";
import {
  ROAD_ICONS,
  ROAD_LABELS,
  sector,
  roadAt,
  type Road,
} from "../lib/modules";
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
  r?: { players: Car[]; laps: number; roads?: Road[] } | null;
  large?: boolean;
}) {
  const g = geometry(track);
  const { point, path, labels, title } = g;
  const inner = innerGuide(track, g);
  const cars = r?.players.filter((p) => !p.rank) || [
    { id: "a", name: "01", color: "#ef573f", pos: 4, lane: 0 },
    { id: "b", name: "02", color: "#50a9e8", pos: 3, lane: 1 },
    { id: "c", name: "03", color: "#f0c34b", pos: track.length - 3, lane: 0 },
  ];
  const start = point(-0.5);
  const weatherRoads =
    r?.roads?.filter((road) => road.kind === "weather") || [];
  return (
    <svg
      className={"circuit " + (large ? "large" : "")}
      viewBox="0 0 840 475"
      role="img"
      aria-label={`${track.name}赛道，${track.length}格双车道，绿线逐格标明几何内侧，反向弯会换侧，同格时优先，弯道限速${track.corners
        .map((c) => {
          const road = r && roadAt(r, c.at);
          return (
            c.limit +
            (road?.kind === "limitUp" ? 1 : road?.kind === "limitDown" ? -1 : 0)
          );
        })
        .join("、")}${
        r?.roads?.length
          ? `。蓝色底纹标出天气路段：${
              weatherRoads.length
                ? weatherRoads
                    .map((road) => {
                      const i = track.corners.findIndex(
                        (c) => c.at === road.at,
                      );
                      const end =
                        track.corners[(i + 1) % track.corners.length].at;
                      return `${i + 1} 号，从 ${road.at} 格起到 ${end} 格弯道线前`;
                    })
                    .join("；")
                : "本场无天气标记"
            }`
          : ""
      }`}
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
        <pattern
          id="weatherHatch"
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <rect width="8" height="8" fill="#517ea7" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="#a5cdec" strokeWidth="2" />
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
      {r?.roads &&
        Array.from({ length: track.length }, (_, i) => {
          if (sector(r, i, track)?.kind !== "weather") return null;
          const points = Array.from({ length: 5 }, (_, j) =>
            point(i - 0.5 + j / 4),
          );
          return (
            <path
              key={`weather-fill-${i}`}
              data-weather-cell={i}
              aria-hidden="true"
              d={points
                .map((p, j) => `${j ? "L" : "M"}${p.x} ${p.y}`)
                .join(" ")}
              fill="none"
              stroke="url(#weatherHatch)"
              strokeWidth="38"
              opacity=".72"
            />
          );
        })}
      <path
        d={path}
        fill="none"
        stroke="#abb5ac"
        strokeWidth="1"
        strokeDasharray="5 6"
      />
      <path
        d={inner.lanePath}
        fill="none"
        stroke="#75daba"
        strokeWidth="17"
        opacity=".12"
      />
      <path
        d={inner.edgePath}
        fill="none"
        stroke="#75daba"
        strokeWidth="3"
        strokeLinejoin="round"
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
      {r?.roads &&
        Array.from({ length: track.length }, (_, i) => {
          const road = sector(r, i, track);
          if (!road || !["slip", "freeBoost", "weather"].includes(road.kind))
            return null;
          const a = point(i - 0.5, -23),
            b = point(i + 0.5, -23);
          return (
            <path
              aria-hidden="true"
              key={`road-${i}`}
              d={`M${a.x} ${a.y} L${b.x} ${b.y}`}
              stroke={
                road.kind === "weather"
                  ? "#6e97c4"
                  : road.kind === "slip"
                    ? "#9180b6"
                    : "#7aaa67"
              }
              strokeWidth="5"
              opacity=".85"
            >
              <title>{ROAD_LABELS[road.kind]}</title>
            </path>
          );
        })}
      {track.corners.map((c, i) => {
        const a = point(c.at - 0.5, -21),
          b = point(c.at - 0.5, 21),
          label = labels[i];
        const road = r && roadAt(r, c.at);
        const limit =
          c.limit +
          (road?.kind === "limitUp" ? 1 : road?.kind === "limitDown" ? -1 : 0);
        const captionX =
          road?.kind === "weather"
            ? Math.min(745, Math.max(95, label.x))
            : label.x;
        const captionY =
          road?.kind === "weather" && label.y > 410
            ? label.y - 32
            : label.y + 32;
        return (
          <g key={c.at}>
            {road && <title>{`${i + 1} 号：${ROAD_LABELS[road.kind]}`}</title>}
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
              {limit}
            </text>
            {road?.kind === "weather" && (
              <rect
                x={captionX - 60}
                y={captionY - 15}
                width="120"
                height="23"
                rx="7"
                fill="#edf6ff"
                stroke="#6097c6"
              />
            )}
            <text
              x={captionX}
              y={captionY}
              textAnchor="middle"
              fill={road?.kind === "weather" ? "#265c85" : "#6d756b"}
              fontSize={road?.kind === "weather" ? "13" : "10"}
              fontWeight={road?.kind === "weather" ? "700" : "400"}
            >
              {road?.kind === "weather"
                ? `☁ ${i + 1} 号天气路段`
                : road
                  ? `${i + 1} · ${ROAD_ICONS[road.kind]}`
                  : `弯道 ${i + 1}`}
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
        const a = point(p.pos, laneOffset(track, p.lane));
        return (
          <g
            key={p.id}
            transform={`translate(${a.x} ${a.y}) rotate(${a.angle})`}
          >
            <title>{`${p.name}：第 ${Math.max(0, p.pos)} 格，${p.lane === innerLane(track, p.pos) ? "几何内侧（同格优先）" : "外侧"}`}</title>
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
      <g aria-label="几何内侧标记，指向本格同格优先侧">
        <line
          x1={inner.label.x}
          y1={inner.label.y}
          x2={inner.target.x}
          y2={inner.target.y}
          stroke="#387e68"
          strokeWidth="2"
        />
        <circle
          cx={inner.target.x}
          cy={inner.target.y}
          r="4"
          fill="#75daba"
          stroke="#f9fff9"
          strokeWidth="1.5"
        />
        <rect
          x={inner.label.x - 35}
          y={inner.label.y - 14}
          width="70"
          height="28"
          rx="14"
          fill="#fffdf5"
          stroke="#79ac97"
        />
        <text
          x={inner.label.x}
          y={inner.label.y + 5}
          textAnchor="middle"
          fill="#28624f"
          fontSize="15"
          fontWeight="800"
        >
          内侧
        </text>
      </g>
      {r?.roads?.length ? (
        <g
          aria-label={
            weatherRoads.length ? "蓝色斜纹是天气路段" : "本场无天气路段"
          }
        >
          {weatherRoads.length > 0 && (
            <rect
              x="25"
              y="438"
              width="15"
              height="12"
              rx="2"
              fill="url(#weatherHatch)"
            />
          )}
          <text
            x={weatherRoads.length ? 47 : 25}
            y="448"
            fontSize="12"
            fill="#2c628b"
            fontWeight="700"
          >
            {weatherRoads.length
              ? "蓝色斜纹＝天气路段 · 天气的路段效果仅此处生效"
              : "本场无天气路段（未抽到 ☁ 天气标记）"}
          </text>
        </g>
      ) : null}
      <text x="25" y="465" fontSize="11" fill="#416f5a">
        绿线＝几何内侧（同格优先，反向弯换侧） · 黄线＝弯线
      </text>
    </svg>
  );
}
