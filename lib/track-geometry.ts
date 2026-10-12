import type { Track } from "./tracks.ts";
type Point = [number, number];
type Curve = [Point, Point, Point, Point];
const c = (a: Point, b: Point, d: Point, e: Point): Curve => [a, b, d, e];
// Original vector schematics. Each sector has precisely the official number
// of cells; arc-length interpolation keeps the cells evenly spaced per sector.
const shapes: Record<
  string,
  { curves: Curve[][]; labels: Point[]; title: Point }
> = {
  usa: {
    curves: [
      [c([615, 140], [735, 165], [765, 295], [700, 355])],
      [c([700, 355], [625, 420], [205, 415], [160, 365])],
      [c([160, 365], [100, 310], [300, 55], [385, 105])],
      [c([385, 105], [485, 155], [285, 265], [355, 285])],
      [c([355, 285], [410, 310], [515, 80], [615, 140])],
    ],
    labels: [
      [770, 350],
      [95, 385],
      [400, 48],
      [345, 335],
    ],
    title: [570, 285],
  },
  france: {
    curves: [
      [c([465, 390], [290, 390], [100, 300], [130, 210])],
      [c([130, 210], [150, 115], [325, 160], [355, 95])],
      [c([355, 95], [440, 140], [235, 235], [325, 290])],
      [c([325, 290], [430, 355], [575, 230], [580, 135])],
      [
        c([580, 135], [595, 35], [640, 130], [650, 205]),
        c([650, 205], [660, 250], [730, 230], [735, 290]),
      ],
      [c([735, 290], [760, 350], [600, 395], [465, 390])],
    ],
    labels: [
      [65, 205],
      [355, 40],
      [290, 340],
      [575, 68],
      [793, 287],
    ],
    title: [435, 210],
  },
  britain: {
    curves: [
      [c([180, 170], [210, 60], [600, 80], [695, 100])],
      [c([695, 100], [815, 125], [755, 405], [630, 385])],
      [c([630, 385], [520, 395], [610, 185], [515, 200])],
      [c([515, 200], [440, 210], [425, 240], [355, 240])],
      [c([355, 240], [220, 290], [430, 330], [445, 365])],
      [
        c([445, 365], [465, 420], [165, 350], [165, 260]),
        c([165, 260], [165, 225], [160, 205], [180, 170]),
      ],
    ],
    labels: [
      [725, 48],
      [650, 440],
      [525, 145],
      [290, 210],
      [467, 424],
    ],
    title: [350, 153],
  },
  italy: {
    curves: [
      [c([715, 270], [745, 325], [705, 370], [645, 375])],
      [c([645, 375], [535, 375], [495, 145], [420, 210])],
      [c([420, 210], [360, 260], [435, 395], [300, 370])],
      [
        c([300, 370], [120, 375], [90, 275], [140, 175]),
        c([140, 175], [210, 25], [540, 35], [635, 115]),
        c([635, 115], [680, 155], [685, 220], [715, 270]),
      ],
    ],
    labels: [
      [704, 426],
      [420, 153],
      [265, 423],
    ],
    title: [520, 130],
  },
};
// Original curves follow the recognizable layout of the expansion boards.
// Each route entry ends at a corner; intermediate points describe its approach.
const expansionRoutes: Record<
  string,
  { routes: Point[][]; labels: Point[]; title: Point }
> = {
  japan: {
    routes: [
      [[420, 230]],
      [[715, 270]],
      [[610, 220]],
      [[700, 65]],
      [
        [500, 100],
        [450, 180],
        [480, 340],
        [340, 390],
        [100, 390],
        [100, 340],
      ],
      [
        [145, 245],
        [150, 140],
        [240, 85],
      ],
      [
        [280, 155],
        [325, 215],
        [420, 230],
      ],
    ],
    labels: [
      [785, 280],
      [585, 180],
      [750, 40],
      [55, 335],
      [240, 35],
    ],
    title: [330, 310],
  },
  mexico: {
    routes: [
      [[425, 390]],
      [
        [220, 380],
        [100, 315],
        [110, 195],
      ],
      [
        [75, 115],
        [165, 70],
      ],
      [
        [245, 170],
        [465, 200],
        [610, 85],
        [715, 75],
      ],
      [
        [745, 125],
        [700, 175],
        [620, 210],
      ],
      [
        [730, 270],
        [730, 375],
      ],
      [
        [690, 415],
        [670, 400],
      ],
      [
        [560, 395],
        [425, 390],
      ],
    ],
    labels: [
      [160, 205],
      [185, 30],
      [770, 60],
      [595, 245],
      [785, 380],
      [650, 445],
    ],
    title: [425, 290],
  },
  spain: {
    routes: [
      [[600, 405]],
      [
        [380, 405],
        [220, 405],
      ],
      [
        [140, 355],
        [120, 260],
      ],
      [
        [200, 215],
        [355, 190],
        [570, 185],
        [575, 125],
      ],
      [
        [545, 80],
        [470, 120],
      ],
      [
        [300, 145],
        [130, 145],
        [80, 105],
      ],
      [
        [65, 45],
        [370, 45],
        [690, 45],
        [715, 65],
      ],
      [
        [770, 145],
        [700, 215],
        [440, 265],
        [230, 300],
        [210, 280],
      ],
      [
        [225, 340],
        [340, 335],
        [445, 340],
      ],
      [
        [505, 365],
        [550, 340],
      ],
      [
        [580, 370],
        [610, 325],
        [610, 270],
      ],
      [
        [675, 275],
        [730, 305],
        [760, 340],
      ],
      [
        [745, 395],
        [690, 405],
        [600, 405],
      ],
    ],
    labels: [
      [220, 445],
      [65, 260],
      [620, 120],
      [470, 70],
      [125, 105],
      [745, 30],
      [255, 280],
      [445, 295],
      [535, 405],
      [635, 225],
      [805, 340],
    ],
    title: [420, 23],
  },
  netherlands: {
    routes: [
      [[350, 395]],
      [
        [215, 350],
        [90, 325],
        [85, 280],
      ],
      [
        [100, 225],
        [170, 205],
        [220, 185],
      ],
      [
        [180, 140],
        [130, 100],
        [165, 75],
      ],
      [
        [300, 120],
        [430, 175],
        [485, 195],
      ],
      [
        [575, 150],
        [655, 85],
        [715, 60],
      ],
      [
        [765, 160],
        [660, 290],
        [540, 370],
        [350, 395],
      ],
    ],
    labels: [
      [40, 280],
      [245, 230],
      [125, 35],
      [480, 240],
      [760, 40],
    ],
    title: [385, 265],
  },
  germany: {
    routes: [
      [[420, 210]],
      [
        [230, 210],
        [115, 180],
        [75, 135],
        [100, 90],
      ],
      [
        [200, 50],
        [350, 65],
        [470, 80],
      ],
      [
        [500, 70],
        [525, 100],
      ],
      [
        [650, 190],
        [735, 270],
        [745, 375],
      ],
      [
        [650, 415],
        [525, 410],
        [450, 370],
      ],
      [
        [445, 290],
        [520, 280],
        [625, 290],
        [655, 310],
      ],
      [
        [695, 260],
        [560, 225],
        [420, 210],
      ],
    ],
    labels: [
      [145, 100],
      [450, 130],
      [545, 50],
      [790, 390],
      [395, 385],
      [610, 345],
    ],
    title: [345, 140],
  },
  southAfrica: {
    routes: [
      [[450, 395]],
      [
        [300, 400],
        [130, 405],
        [95, 355],
      ],
      [
        [90, 270],
        [120, 200],
        [170, 190],
      ],
      [
        [235, 250],
        [290, 335],
        [350, 310],
      ],
      [
        [330, 270],
        [235, 215],
        [215, 140],
        [245, 65],
        [305, 55],
      ],
      [
        [405, 95],
        [455, 160],
        [450, 285],
        [485, 335],
      ],
      [
        [555, 320],
        [580, 230],
        [595, 155],
        [640, 110],
        [695, 125],
      ],
      [
        [665, 240],
        [715, 300],
        [725, 360],
      ],
      [
        [660, 400],
        [560, 395],
        [450, 395],
      ],
    ],
    labels: [
      [50, 355],
      [175, 145],
      [380, 325],
      [310, 105],
      [480, 285],
      [745, 100],
      [780, 365],
    ],
    title: [340, 170],
  },
};
for (const [id, spec] of Object.entries(expansionRoutes)) {
  const nodes = spec.routes.flat();
  // The last node is the first node repeated, closing the circuit.
  const distinct = nodes.slice(0, -1);
  let index = 0;
  const curves = spec.routes.slice(1).map((route) =>
    route.map(() => {
      const a = distinct[index % distinct.length],
        b = distinct[(index + 1) % distinct.length];
      const prev = distinct[(index - 1 + distinct.length) % distinct.length],
        after = distinct[(index + 2) % distinct.length];
      index++;
      return c(
        a,
        [a[0] + (b[0] - prev[0]) / 6, a[1] + (b[1] - prev[1]) / 6],
        [b[0] - (after[0] - a[0]) / 6, b[1] - (after[1] - a[1]) / 6],
        b,
      );
    }),
  );
  shapes[id] = { curves, labels: spec.labels, title: spec.title };
}
const round = (n: number) => +n.toFixed(3);
const geometryCache = new WeakMap<Track, ReturnType<typeof createGeometry>>();
function bezier([a, b, c, d]: Curve, t: number): Point {
  const u = 1 - t;
  return [
    u * u * u * a[0] +
      3 * u * u * t * b[0] +
      3 * u * t * t * c[0] +
      t * t * t * d[0],
    u * u * u * a[1] +
      3 * u * u * t * b[1] +
      3 * u * t * t * c[1] +
      t * t * t * d[1],
  ];
}
export function geometry(track: Track) {
  let value = geometryCache.get(track);
  if (!value) {
    value = createGeometry(track);
    geometryCache.set(track, value);
  }
  return value;
}
function createGeometry(track: Track) {
  const shape = shapes[track.id];
  if (!shape) {
    const point = (pos: number, offset = 0) => {
      const t = (pos / track.length) * Math.PI * 2;
      return {
        x: round(420 + (315 + offset) * Math.sin(t)),
        y: round(238 - (154 + offset) * Math.cos(t)),
        angle: round((t * 180) / Math.PI),
      };
    };
    return {
      point,
      path: "M420 84 A315 154 0 1 1 419.999 84 Z",
      labels: track.corners.map((x) => point(x.at - 0.5, 65)),
      title: { x: 420, y: 225 },
    };
  }
  const boundaries = [
    -0.5,
    ...track.corners.map((x) => x.at - 0.5),
    track.length - 0.5,
  ];
  const sectors = shape.curves.map((curves, i) => {
    const samples: { p: Point; distance: number }[] = [];
    let distance = 0;
    for (const curve of curves)
      for (let j = 0; j <= 160; j++) {
        const p = bezier(curve, j / 160),
          last = samples.at(-1)?.p;
        if (last) distance += Math.hypot(p[0] - last[0], p[1] - last[1]);
        samples.push({ p, distance });
      }
    return { samples, distance, start: boundaries[i], end: boundaries[i + 1] };
  });
  const raw = (pos: number): Point => {
    const n =
      ((((pos + 0.5) % track.length) + track.length) % track.length) - 0.5;
    const sector = sectors.find((s) => n >= s.start && n < s.end) || sectors[0];
    const d =
      ((n - sector.start) / (sector.end - sector.start)) * sector.distance;
    const index = sector.samples.findIndex((s) => s.distance >= d);
    if (index <= 0) return sector.samples[0].p;
    const a = sector.samples[index - 1],
      b = sector.samples[index],
      t = (d - a.distance) / (b.distance - a.distance || 1);
    return [a.p[0] + (b.p[0] - a.p[0]) * t, a.p[1] + (b.p[1] - a.p[1]) * t];
  };
  const point = (pos: number, offset = 0) => {
    const a = raw(pos),
      before = raw(pos - 0.025),
      after = raw(pos + 0.025);
    const angle = Math.atan2(after[1] - before[1], after[0] - before[0]);
    return {
      x: round(a[0] - Math.sin(angle) * offset),
      y: round(a[1] + Math.cos(angle) * offset),
      angle: round((angle * 180) / Math.PI),
    };
  };
  const path =
    shape.curves
      .flat()
      .map(
        (curve, i) =>
          `${i === 0 ? `M${curve[0].join(" ")}` : ""} C${curve
            .slice(1)
            .map((p) => p.join(" "))
            .join(" ")}`,
      )
      .join(" ") + " Z";
  return {
    point,
    path,
    labels: shape.labels.map(([x, y]) => ({ x, y })),
    title: { x: shape.title[0], y: shape.title[1] },
  };
}

/** Physical lane identity stays fixed when the direction of a bend changes. */
export function laneOffset(track: Track, lane: number) {
  return (lane === 0 ? 1 : -1) * (track.id === "coastline" ? -10 : 10);
}
const innerLaneCache = new WeakMap<Track, number[]>();
/** House rule: choose the lane towards the local centre of curvature, per cell.
 * Collinear cells inherit the preceding bend, including across the lap seam.
 * This table is shared by rendering, landing and all position comparisons.
 */
export function innerLane(track: Track, pos: number): number {
  let lanes = innerLaneCache.get(track);
  if (!lanes) {
    const g = geometry(track);
    const bends = Array.from({ length: track.length }, (_, i) => {
      const a = g.point(i - 0.3),
        b = g.point(i),
        c = g.point(i + 0.3);
      const ux = b.x - a.x,
        uy = b.y - a.y;
      const vx = c.x - b.x,
        vy = c.y - b.y;
      const turn =
        (ux * vy - uy * vx) / (Math.hypot(ux, uy) * Math.hypot(vx, vy));
      if (Math.abs(turn) < 0.0001) return null;
      const lane0 = g.point(i, laneOffset(track, 0));
      const right =
        -(lane0.x - b.x) * (c.y - a.y) + (lane0.y - b.y) * (c.x - a.x);
      return turn * right > 0 ? 0 : 1;
    });
    let previous = [...bends].reverse().find((lane) => lane !== null) ?? 0;
    lanes = bends.map((lane) => {
      if (lane !== null) previous = lane;
      return previous;
    });
    innerLaneCache.set(track, lanes);
  }
  const cell =
    ((Math.floor(pos + 0.5) % track.length) + track.length) % track.length;
  return lanes[cell];
}
export function compareCars(
  track: Track,
  a: { pos: number; lane: number },
  b: { pos: number; lane: number },
) {
  return (
    b.pos - a.pos ||
    Number(a.lane !== innerLane(track, a.pos)) -
      Number(b.lane !== innerLane(track, b.pos))
  );
}
export function innerGuide(track: Track, g = geometry(track)) {
  const positions: Partial<Record<Track["id"], number>> = {
    usa: 22,
    france: 55,
    britain: 24,
    italy: 34.5,
    coastline: 16,
  };
  const segments = (scale: number) =>
    Array.from({ length: track.length }, (_, cell) =>
      Array.from({ length: 5 }, (_, j) =>
        g.point(
          cell - 0.5 + j / 4,
          laneOffset(track, innerLane(track, cell)) * scale,
        ),
      ),
    );
  const edgeSegments = segments(1.7);
  const path = (segments: { x: number; y: number }[][]) =>
    segments
      .map((p) => p.map((v, i) => `${i ? "L" : "M"}${v.x} ${v.y}`).join(" "))
      .join(" ");
  const marker = positions[track.id] ?? track.length / 2;
  const offset = laneOffset(track, innerLane(track, marker));
  return {
    edgeSegments,
    edgePath: path(edgeSegments),
    lanePath: path(segments(1)),
    target: g.point(marker, offset * 1.7),
    label: g.point(marker, offset * 7.5),
  };
}
