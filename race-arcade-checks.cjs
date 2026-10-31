const assert=require('node:assert/strict'),R=require('./dist/race.js');
function isolated(){const r=R.create();r.phase='racing';r.riders.slice(1).forEach(x=>x.finished=true);return r;}
function advance(r,time,input={throttle:1}){for(let i=0;i<time*120;i++)R.tick(r,input,1/120);}
let maximum=0;
for(let s=0;s<R.length;s+=2){maximum=Math.max(maximum,Math.abs(R.curvature(s)));const r=isolated();Object.assign(r.riders[0],{s,speed:20,offset:0});advance(r,.06);assert(r.riders[0].speed>19.95,'a road bend alone must not cut the speed');}
assert(maximum<.075,'tighter technical bends must still leave enough radius for the full-width road');
const earned=isolated(),p=earned.riders[0];Object.assign(p,{speed:14,offset:-3,angle:.25,steer:.2});advance(earned,.75,{throttle:1,turn:-.15,drift:true});
assert(p.driftCharge>.28,'a sustained valid drift must charge the exit reward');advance(earned,1/120,{throttle:1,drift:false});assert(p.boost>.35,'releasing a charged drift must award acceleration');assert.equal(p.driftCharge,0);
const fake=isolated();advance(fake,1,{turn:1,drift:true});advance(fake,.1,{drift:false});assert.equal(fake.riders[0].boost,0,'stationary steering cannot farm boosts');
const wake=isolated(),plain=isolated();for(const r of[wake,plain])Object.assign(r.riders[0],{s:40,speed:9,offset:0});Object.assign(wake.riders[1],{finished:false,s:50,speed:10,offset:0});
advance(wake,1);advance(plain,1);assert(wake.riders[0].draft>.7,'following another racer must build slipstream');assert(wake.riders[0].speed>plain.riders[0].speed,'slipstream must aid acceleration');
advance(wake,20);assert(wake.riders.every(r=>Math.abs(r.speed)<=25.001),'bonuses must respect the shared speed limit');
const boosted=isolated();Object.assign(boosted.riders[0],{speed:18,offset:0,boost:1});advance(boosted,.3);assert(boosted.riders[0].speed<=25.001);
console.log('PASS: widened bends, no curve-only slowdown, earned drift exit bonus, no stationary farming, slipstream acceleration and common speed cap');
