import { env } from "cloudflare:workers";

export function getRoomDatabase() {
  if (!env.DB) throw new Error("房间数据库未配置");
  return env.DB;
}
