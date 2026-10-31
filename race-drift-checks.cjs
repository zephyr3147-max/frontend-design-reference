const assert=require('node:assert/strict'),R=require('./dist/race.js');
function isolated(){const r=R.create();r.phase='racing';r.riders.slice(1).forEach((p,i)=>{p.s=100+i*15;});return r;}
function advance(r,time,input){for(let i=0;i<time*120;i++)R.tick(r,input,1/120);}
const drift=isolated(),p=drift.riders[0];Object.assign(p,{speed:15,offset:0});
advance(drift,.4,{throttle:1,turn:1,drift:true});assert(p.drift>.7&&p.slip<0,'right drift must build a controlled slip angle');
assert(p.offset<0,'drifting must preserve corrected screen-right direction');assert(p.speed<=20);
advance(drift,1.3,{throttle:1,turn:0,drift:false});assert(p.drift<.01&&Math.abs(p.slip)<.02,'release must restore grip smoothly');
const slow=isolated();advance(slow,.6,{turn:1,drift:true});assert.equal(slow.riders[0].drift,0,'stationary bikes must not drift');
const airborne=isolated();Object.assign(airborne.riders[0],{speed:16,y:2,vy:3});advance(airborne,.2,{turn:1,drift:true});assert.equal(airborne.riders[0].drift,0,'no drift activation in midair');
const stopped=isolated();advance(stopped,.5,{turn:1});assert.equal(stopped.riders[0].angle,0,'steering must not spin a stationary bicycle');
const back=isolated();back.riders[0].speed=-3;advance(back,.3,{throttle:-1,turn:1});assert(back.riders[0].angle>0,'reverse yaw must invert relative to forward yaw');assert(back.riders[0].offset<-1.8);
const ai=isolated();advance(ai,1,{throttle:0});assert(ai.riders[1].speed>6.5,'stronger opponents must accelerate close to the player rate');assert(R.roster.slice(1).every(r=>r.pace>=19.6));
advance(ai,70,{});assert(ai.riders.slice(1).every(r=>r.speed<=20),'opponents must never bypass the common speed cap');
console.log('PASS: drift direction, smooth grip recovery, grounded/speed eligibility, stationary steering, reverse yaw and stronger legal-speed AI');
