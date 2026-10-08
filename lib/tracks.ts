/** Pole position is 0; `at` is the first cell AFTER a corner line.
 * Last cell before the line = at - 1. Base boards: 6 Heat / 3 Stress.
 * Geometry is an original schematic redraw; facts are documented in README.
 */
export type TrackId = "usa" | "france" | "britain" | "italy" | "coastline";
export type Track = {
  id: TrackId;
  name: string;
  english: string;
  flag: string;
  official: boolean;
  length: number;
  laps: number;
  corners: { at: number; limit: number }[];
};
export const TRACKS: Record<TrackId, Track> = {
  usa: {
    id: "usa",
    name: "美国",
    english: "USA",
    flag: "🇺🇸",
    official: true,
    length: 69,
    laps: 2,
    corners: [
      { at: 13, limit: 7 },
      { at: 34, limit: 3 },
      { at: 50, limit: 3 },
      { at: 58, limit: 2 },
    ],
  },
  france: {
    id: "france",
    name: "法国",
    english: "FRANCE",
    flag: "🇫🇷",
    official: true,
    length: 60,
    laps: 2,
    corners: [
      { at: 13, limit: 5 },
      { at: 21, limit: 2 },
      { at: 28, limit: 1 },
      { at: 40, limit: 3 },
      { at: 48, limit: 4 },
    ],
  },
  britain: {
    id: "britain",
    name: "英国",
    english: "GREAT BRITAIN",
    flag: "🇬🇧",
    official: true,
    length: 63,
    laps: 2,
    corners: [
      { at: 16, limit: 10 },
      { at: 31, limit: 6 },
      { at: 38, limit: 5 },
      { at: 44, limit: 4 },
      { at: 49, limit: 3 },
    ],
  },
  italy: {
    id: "italy",
    name: "意大利",
    english: "ITALY",
    flag: "🇮🇹",
    official: true,
    length: 54,
    laps: 3,
    corners: [
      { at: 11, limit: 5 },
      { at: 20, limit: 2 },
      { at: 27, limit: 3 },
    ],
  },
  coastline: {
    id: "coastline",
    name: "海岸环线",
    english: "COASTLINE",
    flag: "🌊",
    official: false,
    length: 64,
    laps: 2,
    corners: [
      { at: 10, limit: 3 },
      { at: 26, limit: 5 },
      { at: 41, limit: 3 },
      { at: 55, limit: 4 },
    ],
  },
};
export const TRACK_OPTIONS = Object.values(TRACKS);
export function isTrackId(id: unknown): id is TrackId {
  return typeof id === "string" && Object.hasOwn(TRACKS, id);
}
/** Rooms saved before map selection retain their original circuit. */
export function getTrack(id?: string): Track {
  return TRACKS[isTrackId(id) ? id : "coastline"];
}
