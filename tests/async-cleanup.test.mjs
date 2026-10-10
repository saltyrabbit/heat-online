import {test} from "node:test";
import assert from "node:assert/strict";
import {room, player, start, plan, react, autoBots, view} from "../lib/game.ts";
import {driverStage, roundFlowState} from "../lib/round-status.ts";
const card = (value, type = "speed") => ({id:crypto.randomUUID(), value, type, basic:true});
function setup(n = 3) {
  const r = room("ASYNC1", "A", "a", 1, "usa");
  for (let i = 1; i < n; i++) r.players.push(player("车手" + i, "token" + i, i));
  start(r);
  r.players.forEach((p,i) => {
    p.pos = 8 - i * 3; p.lane = 0; p.gear = 1;
    p.hand = [card(1),card(2),card(0,"heat")];
    p.deck = Array.from({length:12}, () => card(1)); p.discard = [];
  });
  r.queue = r.players.map(p => p.id);
  for (const p of r.players) plan(r,p,1,[p.hand[0].id]);
  return r;
}
test("checking a corner immediately releases the next driver while discard stays private and available", () => {
  const r = setup(), [a,b] = r.players;
  const before = a.hand.map(c => c.id);
  react(r,a,"check");
  assert.equal(r.turn.id,b.id);
  assert.deepEqual(r.pendingDiscards,[a.id]);
  assert.deepEqual(a.hand.map(c => c.id),before);
  assert.equal(driverStage(view(r,a.token),a.id),"discard");
  assert.equal(driverStage(view(r,b.token),b.id),"react");
  assert.equal(view(r,b.token).players.find(p=>p.id===a.id).hand.length,0);
  react(r,b,"cool");
  const bTurn = structuredClone(r.turn), bPos = b.pos;
  react(r,a,"finish",[a.hand.find(c=>c.type==="speed").id]);
  assert.deepEqual(r.turn,bTurn);
  assert.equal(b.pos,bPos);
  assert.equal(a.hand.length,7);
  assert.equal(a.played.length,0);
  assert.throws(()=>react(r,a,"finish"),/等待/);
});
test("all drivers may finish cleanup in any order; new round and reveal reset wait for the last one", () => {
  const r = setup(), round = r.round;
  for (const p of r.players) react(r,p,"check");
  assert.equal(r.turn,null);
  assert.equal(r.phase,"turn");
  assert.equal(r.pendingDiscards.length,3);
  assert.throws(()=>plan(r,r.players[0],1,[]));
  react(r,r.players[2],"finish");
  react(r,r.players[0],"finish");
  assert.equal(r.round,round);
  assert.equal(r.actions.some(a=>a.round===round && a.kind==="played"),true);
  react(r,r.players[1],"finish");
  assert.equal(r.phase,"plan");
  assert.equal(r.round,round+1);
  assert.deepEqual(r.pendingDiscards,[]);
  for (const p of r.players) assert.equal(p.hand.length,7);
});
test("cleanup cannot cool, boost or move; waiting drivers cannot discard or see another hand", () => {
  const r=setup(),[a,b,c]=r.players;
  react(r,a,"check");
  for(const action of ["cool","boost","adrenaline","slip","check"]) assert.throws(()=>react(r,a,action));
  assert.throws(()=>react(r,c,"finish"));
  assert.throws(()=>react(r,a,"finish",[a.hand.find(c=>c.type==="heat").id]));
  assert.equal(r.turn.id,b.id);
  assert.deepEqual(r.pendingDiscards,[a.id]);
});
test("bot actions and cleanup continue behind a human who is still discarding", () => {
  const r=setup(),[a,b,c]=r.players;
  b.bot=c.bot=true;
  react(r,a,"check"); autoBots(r);
  assert.equal(r.turn,null);
  assert.deepEqual(r.pendingDiscards,[a.id]);
  assert.equal(r.round,1);
  assert.equal(b.played.length,0);
  assert.equal(c.played.length,0);
  react(r,a,"finish");
  assert.equal(r.round,2);
});
test("taking over an already pending seat finishes its cleanup without disturbing another driver", () => {
  const r=setup(),[a,b]=r.players;
  react(r,a,"check"); a.bot=true;
  const turn=structuredClone(r.turn);
  autoBots(r);
  assert.deepEqual(r.turn,turn);
  assert.equal(r.pendingDiscards.length,0);
  assert.equal(a.hand.length,7);
  assert.equal(b.id,r.turn.id);
});
test("legacy synchronous discard rooms migrate without repeating movement or discarding twice", () => {
  const r=setup(),[a,b]=r.players;
  const old=structuredClone(r.turn);
  // This is the old persisted shape after corner checking, before next().
  r.turn={...old,step:"discard"}; delete r.pendingDiscards;
  const aPos=a.pos, bPos=b.pos;
  assert.equal(driverStage(view(r,a.token),a.id),"discard");
  react(r,a,"finish");
  assert.equal(a.pos,aPos);
  assert.equal(b.pos,bPos+1);
  assert.equal(r.turn.id,b.id);
  assert.equal(a.hand.length,7);
  assert.equal(a.played.length,0);
});
test("final results keep the same ordering even if later finishers discard first", () => {
  const r=setup(2),[a,b]=r.players;
  a.pos=72; b.pos=70;
  react(r,a,"check"); react(r,b,"check");
  react(r,b,"finish");
  assert.equal(r.phase,"turn");
  assert.equal(a.rank,null);
  react(r,a,"finish");
  assert.equal(r.phase,"finished");
  assert.equal(a.rank,1); assert.equal(b.rank,2);
});
test("diagram highlights actual decision steps, including concurrent reaction and cleanup", () => {
  const r=setup(),[a,b]=r.players;
  assert.deepEqual(Object.keys(roundFlowState(view(r,a.token)).labels),["5"]);
  react(r,a,"check");
  const state=roundFlowState(view(r,a.token));
  assert.deepEqual(Object.keys(state.labels),["5","8"]);
  assert.equal(state.labels[8],"你正在收尾");
  assert.ok(state.status.includes(b.name));
  for(const p of r.players.slice(1)) react(r,p,"check");
  assert.deepEqual(Object.keys(roundFlowState(view(r,a.token)).labels),["8"]);
  for(const p of r.players) react(r,p,"finish");
  assert.deepEqual(Object.keys(roundFlowState(view(r,a.token)).labels),["1","2"]);
});
