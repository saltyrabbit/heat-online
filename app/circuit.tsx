import { type Track } from "../lib/tracks";
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
const SECTOR_STYLES = {
  weather: {
    label: "天气路段",
    legend: "蓝色斜纹：天气",
    fill: "#517ea7",
    ink: "#a5cdec",
    edge: "#6e97c4",
    text: "#265c85",
    background: "#edf6ff",
  },
  slip: {
    label: "尾流额外 +1",
    legend: "紫色斜纹：尾流额外 +1",
    fill: "#75638f",
    ink: "#c6b3e6",
    edge: "#a38ac9",
    text: "#61428b",
    background: "#f3edff",
  },
  freeBoost: {
    label: "加速免热量",
    legend: "橙色点纹：加速免热量",
    fill: "#876637",
    ink: "#f2cf88",
    edge: "#d3a44b",
    text: "#81581e",
    background: "#fff5df",
  },
} as const;
function sectorStyle(kind?: Road["kind"]) {
  return kind && kind in SECTOR_STYLES
    ? SECTOR_STYLES[kind as keyof typeof SECTOR_STYLES]
    : undefined;
}
export function Circuit({
  track,
  r,
  large = false,
}: {
  track: Track;
  r?: { players: Car[]; laps: number; roads?: Road[] } | null;
  large?: boolean;
}) {
  const conditions = { ...r, trackId: track.id };
  const g = geometry(track);
  const { point, path, labels, title } = g;
  const inner = innerGuide(track, g);
  const cars = r?.players.filter((p) => !p.rank) || [
    { id: "a", name: "01", color: "#ef573f", pos: 4, lane: 0 },
    { id: "b", name: "02", color: "#50a9e8", pos: 3, lane: 1 },
    { id: "c", name: "03", color: "#f0c34b", pos: track.length - 3, lane: 0 },
  ];
  const start = point(-0.5);
  const effectRoads = r?.roads?.filter((road) => sectorStyle(road.kind)) || [];
  const legendKinds = (
    Object.keys(SECTOR_STYLES) as (keyof typeof SECTOR_STYLES)[]
  ).filter((kind) => effectRoads.some((road) => road.kind === kind));
  const hasTerrain = !!track.terrain?.length;
  const height = hasTerrain
    ? r?.roads?.length
      ? 540
      : 515
    : r?.roads?.length
      ? 510
      : 475;
  return (
    <svg
      className={"circuit " + (large ? "large" : "")}
      viewBox={`0 0 840 ${height}`}
      role="img"
      aria-label={`${track.name}赛道，${track.length}格双车道，绿线逐格标明几何内侧，反向弯会换侧，同格时优先，弯道限速${track.corners
        .map((c) => {
          const road = r && roadAt(conditions, c.at);
          return (
            c.limit +
            (road?.kind === "limitUp" ? 1 : road?.kind === "limitDown" ? -1 : 0)
          );
        })
        .join("、")}${
        r?.roads?.length
          ? `。有效果的路段用底纹标出：${
              effectRoads.length
                ? effectRoads
                    .map((road) => {
                      const i = track.corners.findIndex(
                        (c) => c.at === road.at,
                      );
                      const end =
                        track.corners[(i + 1) % track.corners.length].at;
                      return `${i + 1} 号${sectorStyle(road.kind)!.label}，从 ${road.at} 格起到 ${end} 格弯道线前`;
                    })
                    .join("；")
                : "本场无路段效果标记"
            }`
          : ""
      }${track.terrain?.length ? "。特殊地形按车位标出：" + [...new Set(track.terrain.map((t) => t.kind))].map((k) => ({ flooded: "青蓝积水，起始降挡额外付热量", tunnel: "深蓝隧道，禁止从手牌弃牌", gravel: "棕色碎石，补牌前付热量" })[k]).join("；") : ""}`}
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
        {Object.entries(SECTOR_STYLES).map(([kind, style]) => (
          <pattern
            key={kind}
            id={`sector-${kind}`}
            width="8"
            height="8"
            patternUnits="userSpaceOnUse"
            patternTransform={
              kind === "weather"
                ? "rotate(45)"
                : kind === "slip"
                  ? "rotate(-45)"
                  : undefined
            }
          >
            <rect width="8" height="8" fill={style.fill} />
            {kind === "freeBoost" ? (
              <circle cx="4" cy="4" r="1.7" fill={style.ink} />
            ) : (
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="8"
                stroke={style.ink}
                strokeWidth="2"
              />
            )}
          </pattern>
        ))}
      </defs>
      <rect width="840" height={height} fill="#e7ecdf" />
      <rect width="840" height={height} fill="url(#grass)" />
      <path d={path} fill="none" stroke="#fffaf0" strokeWidth="56" />
      <path
        d={path}
        fill="none"
        stroke="#d76550"
        strokeWidth="50"
        strokeDasharray="8 8"
      />
      <path d={path} fill="none" stroke="#424d4b" strokeWidth="40" />
      {track.chicanes?.map(([entry, exit]) => {
        const points = Array.from({ length: (exit - entry) * 8 + 1 }, (_, i) =>
          point(entry - 0.5 + i / 8),
        );
        return (
          <path
            key={entry}
            d={points.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ")}
            fill="none"
            stroke="#68bddd"
            strokeWidth="47"
            strokeDasharray="5 5"
          >
            <title>减速弯：两条弯道线分别检查；一个路况标记共用</title>
          </path>
        );
      })}
      {track.chicanes?.map(([entry, exit]) => (
        <path
          key={entry}
          d={Array.from({ length: (exit - entry) * 8 + 1 }, (_, i) =>
            point(entry - 0.5 + i / 8),
          )
            .map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`)
            .join(" ")}
          fill="none"
          stroke="#424d4b"
          strokeWidth="40"
        />
      ))}
      {r?.roads &&
        Array.from({ length: track.length }, (_, i) => {
          const road = sector(conditions, i, track);
          if (!sectorStyle(road?.kind)) return null;
          const points = Array.from({ length: 5 }, (_, j) =>
            point(i - 0.5 + j / 4),
          );
          return (
            <path
              key={`sector-fill-${i}`}
              data-weather-cell={road!.kind === "weather" ? i : undefined}
              data-sector-cell={i}
              data-sector-kind={road!.kind}
              aria-hidden="true"
              d={points
                .map((p, j) => `${j ? "L" : "M"}${p.x} ${p.y}`)
                .join(" ")}
              fill="none"
              stroke={`url(#sector-${road!.kind})`}
              strokeWidth="38"
              opacity=".72"
            />
          );
        })}
      {track.terrain?.map((t) => {
        const points = Array.from({ length: 5 }, (_, j) =>
          point(t.at - 0.5 + j / 4, laneOffset(track, t.lane)),
        );
        const color = {
          flooded: "#238faf",
          tunnel: "#172a3c",
          gravel: "#ba834e",
        }[t.kind];
        return (
          <g
            key={`${t.at}-${t.lane}`}
            data-terrain-cell={t.at}
            data-terrain-lane={t.lane}
            data-terrain-kind={t.kind}
          >
            <title>{`${t.at} 格 ${t.lane === 0 ? "A" : "B"} 车道：${{ flooded: "积水 · 回合开始降挡额外付 1 热量", tunnel: "隧道 · 禁止从手牌弃牌", gravel: "碎石 · 补牌前付 1 热量（引擎为空时忽略）" }[t.kind]}`}</title>
            <path
              d={points
                .map((p, j) => `${j ? "L" : "M"}${p.x} ${p.y}`)
                .join(" ")}
              stroke={color}
              strokeWidth="18"
              fill="none"
            />
            {t.kind === "gravel" ? (
              <g fill="#efd2a0">
                {[-4, 3].map((dx, i) => (
                  <circle
                    key={i}
                    cx={points[2].x + dx}
                    cy={points[2].y + i * 3 - 2}
                    r="1.5"
                  />
                ))}
              </g>
            ) : (
              <text
                x={points[2].x}
                y={points[2].y + 3}
                textAnchor="middle"
                fontSize="10"
                fill={t.kind === "flooded" ? "#b4edfa" : "#aabdcf"}
              >
                {t.kind === "flooded" ? "≈" : "▥"}
              </text>
            )}
          </g>
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
          const road = sector(conditions, i, track);
          const style = sectorStyle(road?.kind);
          if (!road || !style) return null;
          const a = point(i - 0.5, -23),
            b = point(i + 0.5, -23);
          return (
            <path
              aria-hidden="true"
              key={`road-${i}`}
              d={`M${a.x} ${a.y} L${b.x} ${b.y}`}
              stroke={style.edge}
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
        const road = r && roadAt(conditions, c.at);
        const limit =
          c.limit +
          (road?.kind === "limitUp" ? 1 : road?.kind === "limitDown" ? -1 : 0);
        const style = sectorStyle(road?.kind);
        const captionX = style ? Math.min(745, Math.max(95, label.x)) : label.x;
        const captionY = style && label.y > 410 ? label.y - 32 : label.y + 32;
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
            {style && (
              <rect
                x={captionX - 72}
                y={captionY - 15}
                width="144"
                height="23"
                rx="7"
                fill={style.background}
                stroke={style.edge}
              />
            )}
            <text
              x={captionX}
              y={captionY}
              textAnchor="middle"
              fill={style ? style.text : "#6d756b"}
              fontSize={style ? "13" : "10"}
              fontWeight={style ? "700" : "400"}
            >
              {style
                ? `${road!.kind === "slip" ? "⇢" : ROAD_ICONS[road!.kind]} ${i + 1} 号${style.label}`
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
        fontSize={
          track.pack
            ? track.english.length > 8
              ? 18
              : 22
            : track.id === "britain"
              ? 19
              : 26
        }
        fontWeight="800"
        letterSpacing="3"
      >
        {track.english}
      </text>
      {track.id !== "spain" && (
        <text
          x={title.x}
          y={title.y + 24}
          textAnchor="middle"
          fill="#578074"
          fontSize="12"
        >
          {track.name} · {track.length} 格 · {r?.laps || track.laps} 圈
        </text>
      )}
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
        <g aria-label="路段效果图例">
          {legendKinds.map((kind, i) => (
            <g key={kind} transform={`translate(${25 + i * 260} 478)`}>
              <rect
                width="15"
                height="12"
                rx="2"
                fill={`url(#sector-${kind})`}
              />
              <text
                x="22"
                y="10"
                fontSize="12"
                fill={SECTOR_STYLES[kind].text}
                fontWeight="700"
              >
                {SECTOR_STYLES[kind].legend}
              </text>
            </g>
          ))}
          {!legendKinds.length && (
            <text x="25" y="488" fontSize="12" fill="#2c628b" fontWeight="700">
              本场路况仅在弯道生效，无路段效果
            </text>
          )}
        </g>
      ) : null}
      {hasTerrain && (
        <text
          x="25"
          y={height - 30}
          fontSize="12"
          fill="#345669"
          fontWeight="700"
        >
          {track.id === "japan"
            ? "≈ 青蓝积水：起始时降挡额外付 1 热量"
            : track.id === "spain"
              ? "▥ 深蓝隧道：不能从手牌弃牌；冷却／弃牌库可用"
              : "· 棕色碎石车位：补牌前付 1 热量；引擎空时忽略"}
        </text>
      )}
      <text x="25" y={height - 10} fontSize="11" fill="#416f5a">
        绿线＝几何内侧（同格优先，反向弯换侧） · 黄线＝弯线 · 蓝边＝减速弯
      </text>
    </svg>
  );
}
