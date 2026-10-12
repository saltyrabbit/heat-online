import type { Track } from "./tracks.ts";
/** Official board facts; pole = 0, first space beyond finish = 1.
 * Cross-checked against publisher boards and licensed BGA circuit data:
 * https://github.com/bga-devs/bga-heat/tree/master/modules/php/Circuits
 * No publisher artwork or external game implementation is distributed. */
export const EXPANSION_TRACKS = {
  japan: {
    id: "japan",
    name: "日本",
    english: "JAPAN",
    flag: "🇯🇵",
    official: true,
    pack: "heavyRain",
    length: 60,
    laps: 2,
    engine: 7,
    stress: 3,
    corners: [
      {
        at: 11,
        limit: 4,
      },
      {
        at: 13,
        limit: 4,
      },
      {
        at: 19,
        limit: 2,
      },
      {
        at: 46,
        limit: 5,
      },
      {
        at: 54,
        limit: 3,
      },
    ],
    chicanes: [[11, 13]],
    terrain: [
      {
        at: 6,
        lane: 0,
        kind: "flooded",
      },
      {
        at: 6,
        lane: 1,
        kind: "flooded",
      },
      {
        at: 7,
        lane: 0,
        kind: "flooded",
      },
      {
        at: 7,
        lane: 1,
        kind: "flooded",
      },
      {
        at: 8,
        lane: 0,
        kind: "flooded",
      },
      {
        at: 8,
        lane: 1,
        kind: "flooded",
      },
      {
        at: 9,
        lane: 0,
        kind: "flooded",
      },
      {
        at: 9,
        lane: 1,
        kind: "flooded",
      },
      {
        at: 10,
        lane: 0,
        kind: "flooded",
      },
      {
        at: 10,
        lane: 1,
        kind: "flooded",
      },
      {
        at: 11,
        lane: 0,
        kind: "flooded",
      },
      {
        at: 11,
        lane: 1,
        kind: "flooded",
      },
      {
        at: 39,
        lane: 0,
        kind: "flooded",
      },
      {
        at: 39,
        lane: 1,
        kind: "flooded",
      },
      {
        at: 40,
        lane: 0,
        kind: "flooded",
      },
      {
        at: 40,
        lane: 1,
        kind: "flooded",
      },
      {
        at: 41,
        lane: 0,
        kind: "flooded",
      },
      {
        at: 41,
        lane: 1,
        kind: "flooded",
      },
      {
        at: 42,
        lane: 0,
        kind: "flooded",
      },
      {
        at: 42,
        lane: 1,
        kind: "flooded",
      },
      {
        at: 43,
        lane: 0,
        kind: "flooded",
      },
      {
        at: 43,
        lane: 1,
        kind: "flooded",
      },
      {
        at: 44,
        lane: 0,
        kind: "flooded",
      },
      {
        at: 44,
        lane: 1,
        kind: "flooded",
      },
      {
        at: 45,
        lane: 0,
        kind: "flooded",
      },
      {
        at: 45,
        lane: 1,
        kind: "flooded",
      },
      {
        at: 50,
        lane: 0,
        kind: "flooded",
      },
      {
        at: 50,
        lane: 1,
        kind: "flooded",
      },
      {
        at: 51,
        lane: 0,
        kind: "flooded",
      },
      {
        at: 51,
        lane: 1,
        kind: "flooded",
      },
      {
        at: 52,
        lane: 0,
        kind: "flooded",
      },
      {
        at: 52,
        lane: 1,
        kind: "flooded",
      },
      {
        at: 53,
        lane: 0,
        kind: "flooded",
      },
      {
        at: 53,
        lane: 1,
        kind: "flooded",
      },
      {
        at: 54,
        lane: 0,
        kind: "flooded",
      },
      {
        at: 54,
        lane: 1,
        kind: "flooded",
      },
      {
        at: 55,
        lane: 0,
        kind: "flooded",
      },
      {
        at: 55,
        lane: 1,
        kind: "flooded",
      },
    ],
  },
  mexico: {
    id: "mexico",
    name: "墨西哥",
    english: "MEXICO",
    flag: "🇲🇽",
    official: true,
    pack: "heavyRain",
    length: 60,
    laps: 3,
    engine: 6,
    stress: 2,
    corners: [
      {
        at: 15,
        limit: 7,
      },
      {
        at: 20,
        limit: 7,
      },
      {
        at: 39,
        limit: 6,
      },
      {
        at: 45,
        limit: 4,
      },
      {
        at: 51,
        limit: 2,
      },
      {
        at: 52,
        limit: 2,
      },
    ],
    chicanes: [
      [15, 20],
      [51, 52],
    ],
    terrain: [],
  },
  spain: {
    id: "spain",
    name: "西班牙",
    english: "SPAIN",
    flag: "🇪🇸",
    official: true,
    pack: "tunnelVision",
    length: 109,
    laps: 1,
    engine: 6,
    stress: 3,
    corners: [
      {
        at: 12,
        limit: 5,
      },
      {
        at: 16,
        limit: 4,
      },
      {
        at: 30,
        limit: 4,
      },
      {
        at: 33,
        limit: 4,
      },
      {
        at: 45,
        limit: 2,
      },
      {
        at: 66,
        limit: 5,
      },
      {
        at: 86,
        limit: 2,
      },
      {
        at: 93,
        limit: 3,
      },
      {
        at: 96,
        limit: 4,
      },
      {
        at: 99,
        limit: 4,
      },
      {
        at: 104,
        limit: 3,
      },
    ],
    chicanes: [
      [30, 33],
      [96, 99],
    ],
    terrain: [
      {
        at: 17,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 17,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 18,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 18,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 19,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 19,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 20,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 20,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 21,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 21,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 22,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 22,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 23,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 23,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 24,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 24,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 38,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 38,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 39,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 39,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 40,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 40,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 41,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 41,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 42,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 42,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 46,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 46,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 47,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 47,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 48,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 48,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 49,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 49,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 62,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 62,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 63,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 63,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 64,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 64,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 65,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 65,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 66,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 66,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 67,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 67,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 68,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 68,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 69,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 69,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 70,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 70,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 71,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 71,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 80,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 80,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 81,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 81,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 82,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 82,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 83,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 83,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 84,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 84,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 85,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 85,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 86,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 86,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 87,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 87,
        lane: 1,
        kind: "tunnel",
      },
      {
        at: 88,
        lane: 0,
        kind: "tunnel",
      },
      {
        at: 88,
        lane: 1,
        kind: "tunnel",
      },
    ],
  },
  netherlands: {
    id: "netherlands",
    name: "荷兰",
    english: "NETHERLANDS",
    flag: "🇳🇱",
    official: true,
    pack: "tunnelVision",
    length: 55,
    laps: 3,
    engine: 6,
    stress: 3,
    corners: [
      {
        at: 10,
        limit: 5,
      },
      {
        at: 14,
        limit: 5,
      },
      {
        at: 17,
        limit: 3,
      },
      {
        at: 27,
        limit: 8,
      },
      {
        at: 35,
        limit: 4,
      },
    ],
    chicanes: [[10, 14]],
    terrain: [],
  },
  germany: {
    id: "germany",
    name: "德国",
    english: "GERMANY",
    flag: "🇩🇪",
    official: true,
    pack: "rockyRoads",
    length: 62,
    laps: 2,
    engine: 5,
    stress: 3,
    corners: [
      {
        at: 12,
        limit: 5,
      },
      {
        at: 24,
        limit: 2,
      },
      {
        at: 25,
        limit: 2,
      },
      {
        at: 38,
        limit: 6,
      },
      {
        at: 46,
        limit: 4,
      },
      {
        at: 53,
        limit: 4,
      },
    ],
    chicanes: [[24, 25]],
    terrain: [],
  },
  southAfrica: {
    id: "southAfrica",
    name: "南非",
    english: "SOUTH AFRICA",
    flag: "🇿🇦",
    official: true,
    pack: "rockyRoads",
    length: 71,
    laps: 2,
    engine: 7,
    stress: 3,
    corners: [
      {
        at: 12,
        limit: 4,
      },
      {
        at: 19,
        limit: 3,
      },
      {
        at: 25,
        limit: 2,
      },
      {
        at: 35,
        limit: 6,
      },
      {
        at: 47,
        limit: 5,
      },
      {
        at: 56,
        limit: 2,
      },
      {
        at: 63,
        limit: 4,
      },
    ],
    chicanes: [],
    terrain: [
      {
        at: 8,
        lane: 1,
        kind: "gravel",
      },
      {
        at: 9,
        lane: 1,
        kind: "gravel",
      },
      {
        at: 10,
        lane: 1,
        kind: "gravel",
      },
      {
        at: 11,
        lane: 1,
        kind: "gravel",
      },
      {
        at: 12,
        lane: 1,
        kind: "gravel",
      },
      {
        at: 13,
        lane: 1,
        kind: "gravel",
      },
      {
        at: 14,
        lane: 0,
        kind: "gravel",
      },
      {
        at: 14,
        lane: 1,
        kind: "gravel",
      },
      {
        at: 15,
        lane: 0,
        kind: "gravel",
      },
      {
        at: 15,
        lane: 1,
        kind: "gravel",
      },
      {
        at: 16,
        lane: 0,
        kind: "gravel",
      },
      {
        at: 16,
        lane: 1,
        kind: "gravel",
      },
      {
        at: 17,
        lane: 1,
        kind: "gravel",
      },
      {
        at: 18,
        lane: 1,
        kind: "gravel",
      },
      {
        at: 19,
        lane: 1,
        kind: "gravel",
      },
      {
        at: 20,
        lane: 1,
        kind: "gravel",
      },
      {
        at: 21,
        lane: 1,
        kind: "gravel",
      },
      {
        at: 25,
        lane: 0,
        kind: "gravel",
      },
      {
        at: 25,
        lane: 1,
        kind: "gravel",
      },
      {
        at: 26,
        lane: 0,
        kind: "gravel",
      },
      {
        at: 27,
        lane: 0,
        kind: "gravel",
      },
      {
        at: 28,
        lane: 0,
        kind: "gravel",
      },
      {
        at: 48,
        lane: 0,
        kind: "gravel",
      },
      {
        at: 49,
        lane: 0,
        kind: "gravel",
      },
      {
        at: 50,
        lane: 0,
        kind: "gravel",
      },
      {
        at: 51,
        lane: 0,
        kind: "gravel",
      },
      {
        at: 52,
        lane: 0,
        kind: "gravel",
      },
      {
        at: 53,
        lane: 0,
        kind: "gravel",
      },
      {
        at: 53,
        lane: 1,
        kind: "gravel",
      },
      {
        at: 54,
        lane: 0,
        kind: "gravel",
      },
      {
        at: 54,
        lane: 1,
        kind: "gravel",
      },
      {
        at: 55,
        lane: 0,
        kind: "gravel",
      },
      {
        at: 55,
        lane: 1,
        kind: "gravel",
      },
      {
        at: 56,
        lane: 0,
        kind: "gravel",
      },
      {
        at: 56,
        lane: 1,
        kind: "gravel",
      },
      {
        at: 57,
        lane: 0,
        kind: "gravel",
      },
      {
        at: 57,
        lane: 1,
        kind: "gravel",
      },
      {
        at: 58,
        lane: 1,
        kind: "gravel",
      },
      {
        at: 59,
        lane: 1,
        kind: "gravel",
      },
    ],
  },
} as const satisfies Record<string, Track>;
