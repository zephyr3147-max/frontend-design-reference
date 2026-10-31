const assert=require('node:assert/strict'),Root=require('./dist/race.js');
for(const id of ['coast','mountain','rally']){
 const R=Root.forCourse(id),r=R.create();assert(R.length>700&&R.length<2600);assert(R.track.every(p=>Number.isFinite(p.heading)&&Number.isFinite(p.x)&&Number.isFinite(p.z)));
 const first=R.sample(0),end=R.sample(R.length),gap=Math.hypot(first.x-end.x,first.z-end.z);
 let curvatureMax=0;for(let s=0;s<R.length;s+=4)curvatureMax=Math.max(curvatureMax,Math.abs(R.curvature(s)));assert(curvatureMax<.085,'full-width rails must fit the tightest bend');
 for(let s=0;s<R.length;s+=12){const a=R.sample(s);for(let t=s+48;t<R.length;t+=12){if(R.course.loop&&R.length-t+s<48)continue;const b=R.sample(t);assert(Math.hypot(a.x-b.x,a.z-b.z)>R.RAIL*2,'unconnected road sections must not overlap');}}
 if(R.course.loop){assert(gap<.01);assert(R.LAPS>=2);}else{assert(gap>500);assert.equal(R.LAPS,1);assert(Math.hypot(R.sample(-12).x-first.x,R.sample(-12).z-first.z)>11);assert.deepEqual(R.sample(R.length+100),end);}
 r.phase='racing';r.riders[0].s=R.length*R.LAPS-.15;r.riders[0].speed=20;R.tick(r,{throttle:1},.1);assert.equal(r.phase,'finished',id+' finish must terminate correctly');
 const full=R.create();R.start(full);for(let i=0;i<240*60&&full.phase!=='finished';i++){const p=full.riders[0],f=Math.max(.01,Math.abs(p.speed)*.0725),turn=Math.max(-1,Math.min(1,(p.offset*.18+p.angle*2-R.curvature(p.s+6)*p.speed*.38)/f));R.tick(full,{throttle:1,turn},1/60);}assert.equal(full.phase,'finished',id+' must support a complete race');
}
const R=Root,r=R.create();r.phase='racing';r.riders.slice(1).forEach(x=>x.finished=true);Object.assign(r.riders[0],{speed:20,offset:0,wasSliding:true,driftCharge:.6,drift:.8});
for(let i=0;i<50;i++)R.tick(r,{throttle:1},1/120);assert(r.riders[0].speed>20.5,'drift release must exceed the normal speed cap');assert(r.riders[0].speed<=25.001);
for(let i=0;i<240;i++)R.tick(r,{throttle:1},1/120);assert(r.riders[0].speed<=20.001,'the bonus must expire and return to the normal cap');
console.log('PASS: three distinct courses, closed/open route semantics, rally staging and finish, complete races, short 90 km/h boost and smooth speed recovery');
