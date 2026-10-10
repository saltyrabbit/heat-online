import { getRoomDatabase } from "@/db/room-store";
import {
  room,
  configure,
  player,
  start,
  plan,
  react,
  autoBots,
  view,
  type Room,
} from "../../../lib/game";
import { getTrack, isTrackId } from "../../../lib/tracks";
export const dynamic = "force-dynamic";
function token(req: Request) {
  return (
    req.headers
      .get("cookie")
      ?.match(/(?:^|;\s*)heat_sid=([a-f0-9-]{36})/)?.[1] || crypto.randomUUID()
  );
}
function response(data: unknown, status = 200, sid?: string, started?: number) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...(started !== undefined ? {"Server-Timing": `app;dur=${Date.now() - started}`} : {}),
      ...(sid
        ? {
            "Set-Cookie": `heat_sid=${sid}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
          }
        : {}),
    },
  });
}
async function read(code: string) {
  return getRoomDatabase()
    .prepare("SELECT data, version FROM rooms WHERE code=? AND expires>?")
    .bind(code, Date.now())
    .first<{ data: string; version: number }>();
}
export async function GET(req: Request) {
  try {
    const code = new URL(req.url).searchParams.get("code")?.toUpperCase() || "";
    const row = await read(code);
    if (!row) return response({ error: "房间不存在或已过期" }, 404);
    const r: Room = JSON.parse(row.data);
    r.version = row.version;
    return response(view(r, token(req)));
  } catch (e) {
    return response({ error: (e as Error).message }, 403);
  }
}
export async function POST(req: Request) {
  const started = Date.now();
  const reply = (data: unknown, status = 200, sid?: string) => response(data, status, sid, started);
  try {
    if (
      req.headers.get("origin") &&
      req.headers.get("origin") !== new URL(req.url).origin
    )
      return reply({ error: "不允许跨站请求" }, 403);
    if (Number(req.headers.get("content-length")) > 16000)
      return reply({ error: "请求过大" }, 413);
    const b = (await req.json()) as {
      action: string;
      laps: number;
      trackId?: string;
      name: string;
      code: string;
      requestId: string;
      version: number;
      playerId: string;
      gear: number;
      cards: string[];
      kind: string;
    };
    const sid = token(req);
    if (b.action === "create") {
      if (b.trackId !== undefined && !isTrackId(b.trackId))
        throw new Error("赛道不存在");
      const track = getTrack(b.trackId);
      const laps = b.laps === 1 ? 1 : track.laps;
      for (let i = 0; i < 5; i++) {
        const bytes = crypto.getRandomValues(new Uint8Array(6));
        const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        const code = Array.from(
          bytes,
          (v) => alphabet[v % alphabet.length],
        ).join("");
        const r = room(code, String(b.name || "车手"), sid, laps, track.id);
        const result = await getRoomDatabase()
          .prepare(
            "INSERT OR IGNORE INTO rooms(code,data,version,expires) VALUES(?,?,0,?)",
          )
          .bind(code, JSON.stringify(r), Date.now() + 7 * 86400000)
          .run();
        if (result.meta.changes) return reply(view(r, sid), 200, sid);
      }
      throw new Error("创建房间失败，请重试");
    }
    const code = String(b.code || "").toUpperCase();
    const row = await read(code);
    if (!row) return reply({ error: "房间不存在或已过期" }, 404);
    const r: Room = JSON.parse(row.data);
    r.version = row.version;
    if (typeof b.requestId !== "string" || b.requestId.length > 80)
      throw new Error("请求标识无效");
    if (r.requests.includes(b.requestId))
      return reply(view(r, sid), 200, sid);
    if (b.action !== "join" && b.version !== row.version)
      return reply({ error: "房间状态已更新，请重试", refresh: true, state: view(r, sid) }, 409);
    let p = r.players.find((p) => p.token === sid);
    if (b.action === "join") {
      if (!p) {
        if (r.phase !== "lobby")
          throw new Error("比赛已开始，只有原车手可以重新连接");
        if (r.players.length >= 6) throw new Error("房间已满");
        const used = new Set(r.players.map((p) => p.color));
        const i = [
          "#ef573f",
          "#50a9e8",
          "#f0c34b",
          "#53b99b",
          "#b28ae2",
          "#ef92b5",
        ].findIndex((c) => !used.has(c));
        p = player(String(b.name || "车手"), sid, i);
        r.players.push(p);
      }
    } else {
      if (!p) throw new Error("请先加入房间");
      if (
        ["start", "bot", "remove", "reset", "takeover", "configure"].includes(
          b.action,
        ) &&
        p.id !== r.host
      )
        throw new Error("只有房主可以操作");
      if (b.action === "configure") configure(r, b.trackId, b.laps);
      else if (b.action === "start") start(r);
      else if (b.action === "bot") {
        if (r.phase !== "lobby" || r.players.length >= 6)
          throw new Error("只能在大厅添加电脑，最多六人");
        const used = new Set(r.players.map((p) => p.color));
        const i = [
          "#ef573f",
          "#50a9e8",
          "#f0c34b",
          "#53b99b",
          "#b28ae2",
          "#ef92b5",
        ].findIndex((c) => !used.has(c));
        r.players.push(
          player(
            `电脑 ${r.players.filter((p) => p.bot).length + 1}`,
            crypto.randomUUID(),
            i,
            true,
          ),
        );
      } else if (b.action === "remove") {
        if (r.phase !== "lobby" || b.playerId === r.host)
          throw new Error("只能移除大厅中其他车手");
        r.players = r.players.filter((p) => p.id !== b.playerId);
      } else if (b.action === "takeover") {
        const target = r.players.find((p) => p.id === b.playerId);
        if (!target || target.id === r.host) throw new Error("不能接管房主");
        target.bot = true;
        target.token = crypto.randomUUID();
        r.log.push(`${target.name} 由电脑接管。`);
      } else if (b.action === "reset") {
        r.phase = "lobby";
        r.turn = null;
        r.queue = [];
        r.pendingDiscards = [];
        r.round = 0;
        r.log = ["已回到大厅。"];
        for (const p of r.players) {
          p.pos = 0;
          p.rank = null;
          p.hand = [];
          p.played = [];
          p.plan = false;
          p.gear = 1;
          p.engine = 6;
        }
      } else if (b.action === "plan") plan(r, p, b.gear, b.cards);
      else if (b.action === "react") react(r, p, b.kind, b.cards || []);
      else throw new Error("未知操作");
    }
    autoBots(r);
    r.requests = [...r.requests, b.requestId].slice(-100);
    r.version = row.version + 1;
    const result = await getRoomDatabase()
      .prepare(
        "UPDATE rooms SET data=?,version=?,expires=? WHERE code=? AND version=?",
      )
      .bind(
        JSON.stringify(r),
        r.version,
        Date.now() + 7 * 86400000,
        code,
        row.version,
      )
      .run();
    if (!result.meta.changes) {
      const latest = await read(code);
      const state = latest ? view({...JSON.parse(latest.data), version: latest.version}, sid) : undefined;
      return reply({ error: "其他车手刚刚行动，请重试", refresh: true, state }, 409);
    }
    return reply(view(r, sid), 200, sid);
  } catch (e) {
    return reply({ error: (e as Error).message }, 400);
  }
}
