const assert=require('node:assert/strict'),R=require('./dist/race.js');
function isolated(){const r=R.create();r.phase='racing';r.riders.slice(1).forEach((p,i)=>{p.s=100+i*10;});return r;}
function run(r,seconds,input){for(let i=0;i<seconds*120;i++)R.tick(r,input,1/120);}
const right=isolated(),left=isolated();right.riders[0].speed=left.riders[0].speed=10;
run(right,.6,{turn:1,throttle:1});run(left,.6,{turn:-1,throttle:1});
assert(right.riders[0].offset<left.riders[0].offset,'screen-right must use negative track offset in the rear camera');
function rail(angle){const r=isolated(),p=r.riders[0];Object.assign(p,{offset:R.RAIL+.05,angle,speed:20});R.tick(r,{},1/120);return p.speed;}
assert(rail(.08)>rail(1),'glancing impacts must retain more speed than head-on impacts');
assert(rail(.08)>18,'a light scrape must not remove half the speed');
const rear=isolated();Object.assign(rear.riders[0],{s:50,offset:0,speed:20});Object.assign(rear.riders[1],{s:52.4,offset:0,speed:10});
R.tick(rear,{},1/120);assert(rear.riders[0].speed<18);assert(rear.riders[1].speed>=10,'a rear-end impact must not multiply the front rider speed by a fixed penalty');
assert(Math.abs(rear.riders[0].offset)<.01,'rear impacts must not teleport a rider sideways');
const braking=isolated();braking.riders[0].speed=20;run(braking,2,{throttle:1,brake:true});assert(braking.riders[0].speed<.1,'brake must override a held accelerator');
const full=R.create();R.start(full);
for(let i=0;i<240*60&&full.phase!=='finished';i++){const p=full.riders[0],factor=.35+Math.abs(p.speed)*.055;const turn=Math.max(-1,Math.min(1,(p.offset*.18+p.angle*2-R.curvature(p.s+6)*p.speed*.38)/factor));R.tick(full,{throttle:1,turn},1/60);assert(Math.abs(p.speed)<=20.001);}
assert.equal(full.phase,'finished','a complete multi-lap race must be playable');assert.equal(full.riders[0].s,R.length*R.LAPS);
console.log('PASS: screen-relative steering, impact-angle response, light scrapes, rear contact without lateral teleport, brake priority and complete 3-lap race');
