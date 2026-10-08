# HEAT · 中文联机赛车

非官方的 HEAT 基础玩法实现，使用原创「海岸环线」赛道与美术。2–6 位车手，可用电脑补位，支持中文浏览器界面、房间码邀请、刷新恢复座位、房主启用电脑接管。

线上入口：https://heat-race-jwx-1008.bestpaper-55555.chatgpt.site

## 开始比赛

1. 输入昵称，选择 1 圈练习赛或 2 圈正式赛，创建房间。
2. 点击房间码或「邀请朋友」复制邀请链接；朋友输入自己的昵称并加入。
3. 房主在至少两名车手就位后开始比赛。需要时可添加电脑。
4. 每回合选择挡位与对应张数的牌并锁定。所有人确认后，按位置依次执行冷却、加速、肾上腺素、尾流、检查弯道、弃牌。
5. 跑完规定圈数，服务器计算最终排名。界面内有完整玩法指南。

每位玩家应使用自己的浏览器。相同浏览器里的标签页共用身份；在一台电脑上测试两个座位时，请使用不同浏览器或隐私窗口。当前座位由浏览器 cookie 保存，清除 cookie 会丢失该座位。房间在最后一次操作后保留七天。

## 规则范围

实现基础换挡、同时选牌、逐车行动、压力牌翻牌、热量支付与冷却、每轮一次加速、肾上腺素、双车道占位、尾流、逐弯检查、打滑、过热停留、可选弃牌、洗牌补牌和同回合冲线排序。起始牌组含 12 张基础速度牌、0 与 5 起始升级、1 张起始热量、3 张压力；引擎初始热量为 6。

原创赛道有 64 格、双车道，弯道在第 10、26、41、55 格，限速分别为 3、5、3、4。它不是原版的四张赛道。不包含车库、天气、传奇车手模块、锦标赛和扩展。电脑使用本程序自己的简单策略。

规则参考：https://www.daysofwonder.com/game/heat/

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
node --test tests/game.test.mjs
npx tsc --noEmit
# 启动本地服务后，执行两名独立玩家的 API 联机验证：
node tests/network.test.mjs
```

测试覆盖规则边界、20 场六车完整比赛、并发操作、重复请求、非法越权行动、手牌隐藏、座位恢复以及两名网络客户端的完整比赛。

## 程序结构

- `lib/game.ts`：服务器共用的规则引擎、电脑策略与隐私视图。
- `app/api/rooms/route.ts`：房间、身份和操作接口。
- `app/page.tsx`、`app/globals.css`：中文响应式界面和 SVG 赛道。
- `db/schema.ts`、`drizzle/`：Cloudflare D1 房间持久化。
- `tests/`：规则与联网测试。

前端每 1.7 秒查询最新房间状态。每次行动由服务器校验，D1 使用版本号条件更新避免同时写入覆盖；请求标识避免成功行动被重复执行。其他车手的未公开手牌与牌库不发送到客户端。Cookie 身份使用 HttpOnly 与 SameSite=Lax。

项目使用 Vinext / React / Cloudflare Workers / D1，通过 Sites 托管。发布配置保存在 `.openai/hosting.json`；源码包不含访问凭据、线上比赛数据或本地数据库。
