# HEAT · 中文联机赛车

非官方的 HEAT 基础玩法实现，包含基础版美国、法国、英国、意大利四张赛道，以及原创「海岸环线」。赛道采用原创 SVG 示意重绘。2–6 位车手，可用电脑补位，支持中文浏览器界面、房间码邀请、刷新恢复座位、房主启用电脑接管。

线上入口：https://heat-race-jwx-1008.bestpaper-55555.chatgpt.site

ParrotVPN 公网入口：https://52.76.213.199/heat/ （此入口的房间与 Sites 独立）。

## 开始比赛

1. 输入昵称，选择赛道和 1 圈练习赛或正式赛（意大利 3 圈，其余 2 圈），创建房间。
2. 点击房间码或「邀请朋友」复制邀请链接；朋友输入自己的昵称并加入。
3. 房主可在大厅调整赛道和距离，设置同步到其他车手；发车后锁定。房主在至少两名车手就位后开始比赛。需要时可添加电脑。
4. 每回合选择挡位与对应张数的牌并锁定。所有人确认后，按位置依次执行移动、反应、尾流与弯道检查。检查完成立即交接下一位；弃牌和补牌各自异步完成，全员收尾后进入下一回合。
5. 跑完规定圈数，服务器计算最终排名。界面内有完整玩法指南。

每位玩家应使用自己的浏览器。相同浏览器里的标签页共用身份；在一台电脑上测试两个座位时，请使用不同浏览器或隐私窗口。当前座位由浏览器 cookie 保存，清除 cookie 会丢失该座位。房间在最后一次操作后保留七天。

## 规则范围

实现基础换挡、同时选牌、逐车行动、压力牌翻牌、热量支付与冷却、每轮一次加速、肾上腺素、双车道占位、尾流、逐弯检查、打滑、过热停留、可选弃牌、洗牌补牌和同回合冲线排序。起始牌组含 12 张基础速度牌、0 与 5 起始升级、1 张起始热量、3 张压力；引擎初始热量为 6。

本版使用自定义的几何内侧优先规则：每格以示意赛道中心线的局部曲率决定内侧，反向弯换侧；直线沿用前一个弯的内侧，跨圈保持一致。落位优先该格内侧，已占用则落外侧，满格退让后重新按实际落点判断。回合顺序、末位奖励、界面排名和同回合冲线排序均使用相同判定。绿线逐格绘在该侧，两条物理车道不因弯向变化而互换编号。这一规则替代官方印刷 Race Line 的同格优先方式，以本程序原创示意图为准。

基础版四张赛道的参数如下。所有地图均为双车道。

| 赛道 | 每圈格数 | 正式圈数 | 按行驶顺序的限速 | 弯线后的第一格（杆位为 0） |
| --- | ---: | ---: | --- | --- |
| 美国 | 69 | 2 | 7 / 3 / 3 / 2 | 13 / 34 / 50 / 58 |
| 法国 | 60 | 2 | 5 / 2 / 1 / 3 / 4 | 13 / 21 / 28 / 40 / 48 |
| 英国 | 63 | 2 | 10 / 6 / 5 / 4 / 3 | 16 / 31 / 38 / 44 / 49 |
| 意大利 | 54 | 3 | 5 / 2 / 3 | 11 / 20 / 27 |
| 海岸环线（原创） | 64 | 2 | 3 / 5 / 3 / 4 | 10 / 26 / 41 / 55 |

旧房间没有 trackId 时继续使用海岸环线，避免比赛中途变化。每一段赛道按该段格数均匀绘制；弯线在对应格的前边界，停车在弯线前不触发过弯。地图形状为示意重绘，不使用原版棋盘图片。

赛道长度、圈数和限速核对 [发行商棋盘图](https://www.asmodee.it/product/heat-pedal-to-the-metal/)；分段格数交叉参考 [社区赛道计数表 RaceMaps.xlsx](https://github.com/Sjskyler27/HEATMAPTEST)。法国第 3 弯按发行商棋盘使用限速 1（计数表的限速列写为 4，未采用）。不包含车库、天气、传奇车手模块、锦标赛和扩展。电脑使用本程序自己的简单策略。

规则参考：https://www.daysofwonder.com/game/heat/

本版支持异步收尾：官方流程要求每位车手完成第 3–9 步后再轮到下一位；这里在第 7 步后就交接行动，第 8–9 步可与其他车手的行动并行。待收尾名单保存在房间中，可刷新恢复；不会提前开始下一回合，也不会改变车辆落位、反应、弯道支付或名次。页面按各玩家实际阶段高亮第 5 步（反应）和第 8 步（弃牌），选牌阶段高亮第 1–2 步；自动执行的阶段不会人为暂停。

## 本地运行

需要 Node.js 22.13 或更高版本。

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_mature_carnage.sql
npm run dev
```

打开命令输出的本地地址，通常为 http://localhost:5173 。本地数据库与线上数据库独立。

## 验证

```sh
node --test tests/game.test.mjs tests/maps.test.mjs tests/rules-audit.test.mjs tests/geometric-inner.test.mjs tests/round-events.test.mjs tests/async-cleanup.test.mjs
npx tsc --noEmit
# 启动本地服务后，执行两名独立玩家的 API 联机验证：
HEAT_TEST_TRACK=italy HEAT_TEST_FORMAL=1 node tests/network.test.mjs
```

测试覆盖规则边界、260 场完整比赛（含四张地图 2-6 人组合共 200 场逐操作随机比赛）、并发操作、重复请求、非法越权行动、手牌隐藏、座位恢复、地图边界、跨圈占位、房主选图权限与同步，以及两名网络客户端的完整比赛。

## ParrotVPN 部署

服务器使用 Node.js 24 + SQLite + Docker + Nginx；构建在本机完成，远端只运行约 44 MB 的 standalone 产物，不安装开发依赖。Sites 的默认构建仍使用 Cloudflare Workers / D1。

```sh
# 本机 Node 版（自动创建 data/heat.sqlite，无需手动建表）
npm run build:node
npm run start:node
# 本机已配置 SSH Host ParrotVPN，源码提交后部署
bash scripts/deploy-parrot.sh ParrotVPN
# 验证公网完整比赛
HEAT_TEST_URL=https://52.76.213.199/heat HEAT_TEST_TRACK=italy HEAT_TEST_FORMAL=1 node tests/network.test.mjs
node --test tests/node-store.test.mjs tests/request-id.test.mjs
```

远端源码与构建在 `/srv/heat-online/releases/<Git SHA>`，当前版本链接为 `/srv/heat-online/current`，比赛数据库在 `/srv/heat-online/data/heat.sqlite`。容器 `heat-online` 仅绑定 `127.0.0.1:18766`，通过已有 Nginx 的 HTTPS `/heat/` 路径提供服务，复用公网 IP 证书；HTTP 80 跳转到此入口，保留 ZVal 的 HTTPS 根路径服务和 HTTP ACME 验证路径。容器使用非 root 用户、只读根目录、512 MB 内存上限、日志轮转和 `unless-stopped` 自动重启。

```sh
ssh ParrotVPN 'sudo docker stats --no-stream heat-online'
ssh ParrotVPN 'sudo docker logs --tail 50 heat-online'
ssh ParrotVPN 'sudo docker restart heat-online'
# SQLite 在线一致性备份（首次或每次备份使用不同文件名）
ssh ParrotVPN "sudo docker exec heat-online node --input-type=module -e 'import {DatabaseSync} from \"node:sqlite\"; new DatabaseSync(\"/data/heat.sqlite\").prepare(\"VACUUM INTO ?\").run(\"/data/heat-backup.sqlite\");'"
```

若自行改用 HTTP 公网 IP，浏览器使用 `getRandomValues` 生成请求标识，兼容不提供 `randomUUID` 的非安全上下文。刷新或服务重启后，只要浏览器身份 cookie 仍在且房间未过期，即可恢复座位。首次部署不会复制 Sites 上已有比赛。

## 程序结构

- `lib/tracks.ts`：赛道参数；`lib/track-geometry.ts`：按格数绘制的赛道几何。
- `app/circuit.tsx`：赛道、弯线和赛车的 SVG 渲染。
- `lib/game.ts`：服务器共用的规则引擎、电脑策略与隐私视图。
- `app/api/rooms/route.ts`：房间、身份和操作接口。
- `app/page.tsx`、`app/globals.css`：中文响应式界面和 SVG 赛道。
- `db/schema.ts`、`drizzle/`：Cloudflare D1 房间持久化。
- `tests/`：规则与联网测试。

前端每 1.7 秒查询最新房间状态。每次行动由服务器校验，D1 使用版本号条件更新避免同时写入覆盖；请求标识避免成功行动被重复执行。其他车手的未公开手牌与牌库不发送到客户端。Cookie 身份使用 HttpOnly 与 SameSite=Lax。

行动提交期间暂停常规轮询，界面显示同步状态。并发操作若发生版本冲突，服务器返回当前玩家的最新隐私视图，客户端保留请求标识自动重试，避免额外读取房间的网络往返。选中的弃牌只随自身阶段或手牌变化清空，不受其他车手行动影响。POST 响应的 Server-Timing 记录处理耗时，可与完整请求耗时比较定位延迟。

项目使用 Vinext / React / Cloudflare Workers / D1，通过 Sites 托管。发布配置保存在 `.openai/hosting.json`；源码包不含访问凭据、线上比赛数据或本地数据库。

## 中文规则书与规则核对

- `public/heat-rules-zh.pdf`：8 页中文规则书，含赛道图、完整回合示例与速查。
- `public/heat-rules-audit-zh.pdf`：3 页测试报告，含官方基础规则逐项对应、发现与修正、联机结果和复现命令。
- 游戏「玩法指南」中提供两份 PDF 的下载入口。

2026-10-09 核对官方基础规则 v1.1 第 3-7 页，57 项自动测试通过（含 10 项几何内侧专项）；套圈尾流按物理赛道位置判断，并移除压力翻牌的任意次数上限。联网测试使用纯选牌决策函数，不再对缺少私有牌库的客户端视图执行揭牌逻辑。四张地图的双客户端正式赛均完成。

测试结论限于覆盖的基础规则场景；不包含官方高级模块。数字版动态生成打滑压力牌，不模拟实体盒中的储备牌总量。几何内侧优先属于用户指定的自定义规则，不纳入与官方 Race Line 完全一致的结论。详细范围见测试报告。

2026-10-10：76 项自动测试通过，新增异步收尾交接、多位车手任意顺序收尾、回合屏障、机器人接管、旧房间迁移与阶段高亮测试；双客户端完整比赛验证了并行行动、版本冲突重试和手牌隐私。异步收尾与几何内侧优先均为本版的自定义规则。

2026-10-10 ParrotVPN 验证：新增 4 项 Node 数据库 / HTTP 请求标识测试；两名公网客户端完成意大利正式赛（29 回合、195 次操作）。12 并发客户端持续 20 秒共 540 次读取、零失败，端到端响应 P50 144 ms / P95 228 ms；并行运行比赛测试时容器约 69 MiB，整机约 407 MiB 可用。这是小规模测试，不作为最大承载人数的保证。
