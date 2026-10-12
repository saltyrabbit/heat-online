import type { Upgrade } from "./modules";

export type UpgradeNote = {
  label: string;
  timing: string;
  kind: "automatic" | "optional" | "mandatory";
  text: string;
  example?: string;
};

export function upgradeNotes(u: Upgrade): UpgradeNote[] {
  if (u.heatCard)
    return [
      {
        label: "额外热量牌",
        timing: "冷却时",
        kind: "optional",
        text: "选中后，这张热量牌会洗入你的起始牌库。抽到手里不能主动打出，也不能随意弃掉；使用冷却后，它才从手牌回到引擎区，之后就能用来支付热量。",
        example: "它增加整场比赛可循环使用的热量，但也可能暂时占住一格手牌。",
      },
    ];
  const notes: UpgradeNote[] = [
    {
      label: u.speed.length > 1 ? "选择速度" : "牌面速度",
      timing: u.effects.direct
        ? "第 3 步正常出牌，或第 5 步追加时"
        : "第 3 步 · 翻牌与移动",
      kind: u.speed.length > 1 ? "mandatory" : "automatic",
      text:
        u.speed.length > 1
          ? `完成本轮翻牌后，从 ${u.speed.join("、")} 中选一个数字，加入本轮总速度。不是把这些数字相加。`
          : `这张牌为本轮总速度增加 ${u.speed[0]}；与其他已出牌的速度相加。`,
    },
  ];
  if (u.plus)
    notes.push({
      label: `${u.plus} 个＋：随机速度`,
      timing: "第 3 步 · 选择可变速度之前",
      kind: "automatic",
      text: `逐个结算 ${u.plus} 个＋。每个＋都从抽牌堆翻牌，跳过热量、压力和升级牌，直到翻到基础速度 1–4；把该基础牌的数字加到总速度中。翻出的牌均进入弃牌堆。`,
      example: "一个＋翻到热量、升级、基础 3：前两张跳过，速度增加 3。",
    });
  const e = u.effects;
  if (e.superCool)
    notes.push({
      label: `超级冷却至多 ${e.superCool} 张`,
      timing: "第 5 步 · 反应",
      kind: "optional",
      text: `查看自己的弃牌堆，将至多 ${e.superCool} 张热量移回引擎区。与普通冷却不同：牌来自弃牌堆，不来自手牌。可以先支付费用或弃牌库，再找刚弃掉的热量；每个符号每轮使用一次。禁止冷却路段同样禁止超级冷却。`,
    });
  if (e.draft)
    notes.push({
      label: `牵引至多 ${e.draft} 格`,
      timing: "第 5 步 · 反应",
      kind: "optional",
      text: `可前进 1 至 ${e.draft} 格；经过的每一格及落点的两个车位必须全空，落点前一格必须有其他车。可合并多张已出牌的牵引数值一次用，也可分开用；每个符号每轮使用一次。这次位移不增加速度，可以跨过最终终点线。牵引后仍可使用第 6 步尾流。`,
    });
  if (e.extraSlip)
    notes.push({
      label: `额外尾流 ${e.extraSlip} 次`,
      timing: "第 6 步 · 普通尾流之后",
      kind: "optional",
      text: `本轮打出此牌并先完成普通尾流后，若新位置再次满足尾流条件，可再尾流 ${e.extraSlip} 次。多张牌的次数叠加，每次都重新判断当前位置的天气／路况与其他赛车；升级尾流奖励可再次应用。不能倒回第 5 步反应，也不能用尾流越过最终终点。所有尾流结束后统一检查经过的弯道。`,
    });
  if (e.heat)
    notes.push({
      label: `支付 ${e.heat} 张热量`,
      timing: "第 5 步 · 反应",
      kind: "mandatory",
      text: `必须将引擎区的 ${e.heat} 张热量移入弃牌堆。这是使用此牌的费用，与过弯费用另外计算。可以先冷却再支付；引擎热量不足时，可弃掉此升级并翻出随机基础速度牌替换。`,
    });
  if (e.scrap)
    notes.push({
      label: `弃抽牌堆顶 ${e.scrap} 张`,
      timing: "第 5 步 · 反应",
      kind: "mandatory",
      text: `从抽牌堆顶翻出 ${e.scrap} 张牌，直接放进弃牌堆。不是从手牌中挑牌，也不会增加速度。抽牌堆用完时，照常洗入弃牌堆再继续。`,
    });
  if (e.cool)
    notes.push({
      label: `冷却至多 ${e.cool} 张`,
      timing: "第 5 步 · 反应",
      kind: "optional",
      text: `可将手牌中至多 ${e.cool} 张热量移回引擎区。与挡位及肾上腺素的冷却次数相加；使用页面上方“冷却一次”按钮执行。没有手牌热量时不会凭空增加热量；禁止冷却的路段不能使用。`,
    });
  if (e.reduce)
    notes.push({
      label: `弃掉至多 ${e.reduce} 张压力`,
      timing: "第 5 步 · 反应",
      kind: "optional",
      text: `从自己的手牌选至多 ${e.reduce} 张压力牌，放入弃牌堆。它们不触发翻牌、不增加速度；腾出的手牌位置在收尾时补牌。停在隧道内时禁止从手牌弃牌，不能使用减压。`,
    });
  if (e.salvage)
    notes.push({
      label: `回收至多 ${e.salvage} 张弃牌`,
      timing: "第 5 步 · 反应",
      kind: "optional",
      text: `从自己的弃牌堆选至多 ${e.salvage} 张任意牌，洗入抽牌堆。不是立刻拿回手牌，也不保证下一张抽到；本轮尚未弃置的已出牌不能回收。`,
    });
  if (e.slip)
    notes.push({
      label: `尾流额外 ${e.slip} 格`,
      timing: "第 6 步 · 尾流",
      kind: "optional",
      text: `先满足尾流位置条件，才可在通常的 2 格之外额外前进 ${e.slip} 格。此奖励必须整份使用，也可不用；可叠加其他尾流奖励。尾流只移动位置，不增加本轮速度，禁止尾流的路段不能发起。`,
      example: `没有其他奖励时，可选择前进 2 格或 ${2 + e.slip} 格。多走的位置可能让你跨过弯道线，但不增加用于检查的速度。`,
    });
  if (e.limit)
    notes.push({
      label: `你的弯道限速 ${e.limit > 0 ? "+" : ""}${e.limit}`,
      timing: "第 7 步 · 弯道检查",
      kind: "automatic",
      text: `只调整你本轮经过的所有弯道限速，自动计算，可与其他升级和路况相加。不会移动汽车，也不会改变其他车手的限速。`,
      example: `弯道原限速 3，这张牌使你的限速变为 ${3 + e.limit}。以速度 5 过弯时，超速热量为 ${Math.max(0, 5 - (3 + e.limit))} 张（未计其他修正）。`,
    });
  if (e.direct)
    notes.push({
      label: "从手牌追加打出",
      timing: "第 5 步 · 反应",
      kind: "optional",
      text: `可以在反应阶段从手牌额外打出这张牌，不占换挡选牌时的张数。它立即增加 ${u.speed[0]} 速度并前进相应格数；此牌的其他效果也要照常结算。也可以在第 2 步正常选出。`,
      example:
        "2 挡先出 2 张牌，反应阶段再追加此牌，总共打出 3 张。增加的速度也计入弯道检查。",
    });
  if (e.accelerate)
    notes.push({
      label: "每个＋额外 +1 速度",
      timing: "第 5 步 · 反应时启用",
      kind: "optional",
      text: "启用后，本轮每个已结算或之后结算的＋都额外增加 1 速度，包括压力牌、升级牌的＋和加速。按＋的个数计算，不按翻出的总张数计算；额外速度会前进，也计入弯道检查。",
      example:
        "本轮 2 个＋各翻出基础 3 和 2，原本增加 5；启用此效果后增加 7。跳过的热量牌不会带来额外奖励。",
    });
  if (e.refresh)
    notes.push({
      label: "补牌前放回牌顶",
      timing: "第 5 步决定 · 第 9 步执行",
      kind: "optional",
      text: "选择保留后，收尾时将此牌放到抽牌堆顶，再补至 7 张手牌，而不是将它弃掉。有空位时，本次补牌就能抽回；没有空位时留在牌顶。多张保留牌按点击顺序抽取。",
    });
  return notes;
}
