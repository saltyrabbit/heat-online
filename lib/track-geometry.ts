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
const round = (n: number) => +n.toFixed(3);
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
