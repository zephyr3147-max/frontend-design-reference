const assert=require('node:assert/strict');
const P=require('./dist/physics.js');
function advance(state,frames,input={}){for(let i=0;i<frames;i++){P.step(state,input,1/120);}}
let s=P.createState();
assert(P.jump(s));assert(!P.jump(s),'禁止二段跳');
let highest=0;for(let i=0;i<180;i++){P.step(s,{},1/120);highest=Math.max(highest,s.y);}
assert(highest>1.1&&highest<1.4);assert.equal(s.y,0);assert.equal(s.vy,0);
assert(P.jump(s),'落地后可再次跳跃');

// 左侧树干位于 (-4.6,10)，车头与树干之间必须留出碰撞间距。
s={...P.createState(),x:-4.6,z:5,speed:9};
advance(s,180,{throttle:1});
assert(s.z<=7.902,`车头穿树：z=${s.z}`);assert.equal(s.hitKind,'tree');
assert.equal(s.mode,'riding');

// 房屋占据 x=[11.5,14.5], z=[6.5,9.5]，分别测试正面、侧面和倒车。
s={...P.createState(),x:13,z:2,speed:9};
advance(s,240,{throttle:1});assert(s.z<=4.652,`车头穿墙：z=${s.z}`);assert.equal(s.hitKind,'wall');
s={...P.createState(),x:8,z:8,heading:Math.PI/2,speed:9};
for(let i=0;i<30;i++){P.step(s,{throttle:1},.1);}
assert(s.x<=9.652,`高速侧面穿墙：x=${s.x}`);
s={...P.createState(),x:13,z:14,speed:-3};
advance(s,300,{throttle:-1});assert(s.z>=11.348,`倒车穿墙：z=${s.z}`);
s={...P.createState(),x:13,z:4.4,speed:9,y:1,vy:1};
P.step(s,{throttle:1},.1);assert(s.z<=4.652,'跳跃不应穿越高墙');

s={...P.createState(),x:-4.3,heading:-Math.PI/2,speed:8};
advance(s,30,{throttle:1});assert.equal(s.mode,'riding','刚入水不能直接死亡');
assert(s.waterDepth>0&&s.waterDepth<.25,'车轮应先逐渐没入水中');
advance(s,330,{throttle:1});assert.equal(s.mode,'drowning','深入海中才触发溺水');
const deathPosition=[s.x,s.z];advance(s,400,{throttle:1,turn:1});
assert.equal(s.mode,'dead');assert.deepEqual([s.x,s.z],deathPosition);assert(!P.jump(s));
s={...P.createState(),x:-7,y:1,vy:0};
P.step(s,{},1/120);assert.equal(s.mode,'riding','腾空时不能立即落海死亡');
advance(s,100);assert.equal(s.mode,'riding','落到浅水后仍有回岸机会');
assert(s.waterDepth>0&&s.waterDepth<1);
advance(s,600);assert.equal(s.mode,'riding','浅水停留不能误判为深水死亡');
s={...P.createState(),x:-6.7,heading:-Math.PI/2,waterDepth:.5};
advance(s,300,{throttle:-1});assert(s.x>-6);assert.equal(s.waterDepth,0,'倒车回岸应逐渐出水');
const dry={...P.createState(),speed:6},wet={...P.createState(),x:-20,speed:6,waterDepth:1};
P.step(dry,{},.1);P.step(wet,{},.1);assert(wet.speed<dry.speed,'入水后阻力应该增大');
s={...P.createState(),x:-12};P.step(s,{},.1);
assert(s.waterDepth<=.08501);assert.equal(s.mode,'riding','深水入水也不能瞬间下沉');
advance(s,330);assert.equal(s.mode,'drowning');
s={...P.createState(),x:-5.7};P.step(s,{},1/120);assert.equal(s.mode,'riding','安全岸边不误判');
assert(P.obstacles(-100).some(o=>o.kind==='tree'),'反向骑行仍要生成碰撞体');
function hit(kind,speed){
  const state={...P.createState(),x:kind==='tree'?-4.6:13,z:kind==='tree'?7.89:4.64,speed};
  P.step(state,{throttle:1},.04);
  assert(state.crashDuration>0,`${kind} 必须触发翻车`);
  assert.equal(state.speed,0);
  return state;
}
for(const kind of ['tree','wall']){
  const low=hit(kind,1),medium=hit(kind,4),high=hit(kind,9);
  const peak=state=>P.impactVisual({...state,crashTime:state.crashDuration*.35});
  const a=peak(low),b=peak(medium),c=peak(high);
  assert(Math.abs(a.roll)<Math.abs(b.roll)&&Math.abs(b.roll)<Math.abs(c.roll),'越快侧翻幅度必须越大');
  assert(Math.abs(a.pitch)<Math.abs(b.pitch)&&Math.abs(b.pitch)<Math.abs(c.pitch),'越快前栽幅度必须越大');
  assert(a.lift<b.lift&&b.lift<c.lift,'越快弹起幅度必须越大');
  assert(a.shake<b.shake&&b.shake<c.shake,'越快震动必须越明显');
  assert(low.crashDuration<medium.crashDuration&&medium.crashDuration<high.crashDuration);
  assert(high.impactSpeed>8.9,'必须保存停车前的撞击速度');
  assert(!P.jump(high),'翻车期间不能跳跃');
  const position=[high.x,high.z],savedSpeed=high.impactSpeed;
  advance(high,30,{throttle:1,turn:1});
  assert.deepEqual([high.x,high.z],position,'翻车期间应停留在碰撞体外');
  assert.equal(high.impactSpeed,savedSpeed,'不能用后续输入覆盖本次撞击速度');
  advance(high,300);
  assert.deepEqual(P.impactVisual(high),{roll:0,pitch:0,lift:0,shake:0},'动画结束应自动扶正');
  assert(P.jump(high),'扶正后可继续操作');
}
const reverse={...P.createState(),x:13,z:11.36,speed:-3};P.step(reverse,{throttle:-1},.04);
assert(reverse.crashDuration>0);assert(P.impactVisual({...reverse,crashTime:reverse.crashDuration*.35}).pitch<0,'倒车撞击应向相反方向前栽');
const resetState=P.createState();assert.equal(resetState.crashDuration,0);assert.equal(resetState.impactSpeed,0);
const forward=P.createState(),backward=P.createState();
advance(forward,2400,{throttle:1});advance(backward,2400,{throttle:-1});
assert(forward.speed>80,'持续前进应超过旧的 9m/s 限速');
assert(backward.speed<-80,'持续倒车应超过旧的 -3m/s 限速');
const fastTree={...P.createState(),x:-4.6,z:0,speed:300};
P.step(fastTree,{throttle:1},.1);
assert(fastTree.z<=7.902&&fastTree.hitKind==='tree','取消限速后高速不能穿树');
assert(fastTree.impactSpeed>300,'高速撞击应保存真实车速');
const fastWall={...P.createState(),x:13,z:-200,speed:5000};
P.step(fastWall,{throttle:1},.1);
assert(fastWall.z<=-139.348&&fastWall.hitKind==='wall','单帧跨区域也不能穿墙');
const braking=forward.speed;P.step(forward,{brake:true},.1);assert(forward.speed<braking,'不限速时刹车仍须有效');
console.log('PASS: progressive water entry, shallow-water escape, deep-water drowning and drag; jump/collision regressions; speed-scaled tree + wall rollovers and recovery');
console.log('PASS: uncapped forward/reverse acceleration, extreme-speed tree/wall collision and braking');
