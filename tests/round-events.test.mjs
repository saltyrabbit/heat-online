import {test} from "node:test";
import assert from "node:assert/strict";
import {playerRoundEvents} from "../lib/round-events.ts";
const reveal = (id, playerId, kind = "stress", round = 2) => ({
  id, playerId, kind, round, value: 3, at: Date.now(),
  cards: [{id: "heat-" + id, type: "heat", value: 0}, {id: "speed-" + id, type: "speed", value: 3, basic: true}],
});
test("player timeline combines linked flips with their action exactly once and keeps chosen cards separate", () => {
  const flip = reveal("flip", "a");
  const played = {id:"chosen", type:"stress", value:0};
  const room = {round:2, reveals:[flip], actions:[
    {id:"plan", playerId:"a", round:2, kind:"plan", text:"A 已锁定选牌。"},
    {id:"played", playerId:"a", round:2, kind:"played", text:"A 打出牌。", cards:[played]},
    {id:"stress", playerId:"a", round:2, kind:"stress", text:"A 压力翻牌。", revealId:flip.id},
    {id:"move", playerId:"a", round:2, kind:"move", text:"A 前进。"},
  ]};
  const events = playerRoundEvents(room, "a");
  assert.deepEqual(events.map((event) => event.kind), ["plan", "played", "stress", "move"]);
  assert.deepEqual(events[1].action.cards, [played]);
  assert.deepEqual(events[2].reveals, [flip]);
  assert.equal(events.flatMap((event) => event.reveals).length, 1);
});
test("timeline isolates players and clears past-round events without exposing future cards", () => {
  const room = {round:2, reveals:[reveal("a2", "a"), reveal("b2", "b"), reveal("a1", "a", "boost", 1)], actions:[
    {id:"a1", playerId:"a", round:1, kind:"played", text:"old", cards:[{id:"old"}]},
    {id:"b2", playerId:"b", round:2, kind:"move", text:"B moved"},
    {id:"future", playerId:"a", round:3, kind:"played", text:"future", cards:[{id:"secret"}]},
  ]};
  const events = playerRoundEvents(room, "a");
  assert.equal(events.length, 1);
  assert.equal(events[0].reveals[0].id, "a2");
  room.round = 3;
  assert.equal(playerRoundEvents(room, "a").flatMap((event) => event.reveals).length, 0);
});
test("older rooms combine unlinked stress and boost records without duplicate reveal entries", () => {
  const stress = reveal("stress", "a"), boost = reveal("boost", "a", "boost");
  const room = {round:2, reveals:[stress, boost], actions:[
    {id:"move", playerId:"a", round:2, text:"A 以速度 3 前进（压力：3）。"},
    {id:"boost", playerId:"a", round:2, text:"A 加速 +3。"},
  ]};
  const events = playerRoundEvents(room, "a");
  assert.equal(events.length, 2);
  assert.deepEqual(events.map((event) => event.reveals.map((r) => r.id)), [["stress"], ["boost"]]);
});
test("older rooms missing actions still display actual flips under the correct player", () => {
  assert.deepEqual(playerRoundEvents({round:2, reveals:[reveal("only", "a")]}, "a")[0].reveals[0].cards.map((c) => c.type), ["heat", "speed"]);
  assert.deepEqual(playerRoundEvents({round:2}, "a"), []);
});
