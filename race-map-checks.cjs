const assert=require('node:assert/strict'),Root=require('./dist/race.js');
for(const id of Object.keys(Root.courses)){
 const R=Root.forCourse(id);
 // Check rendered scene footprints against the whole road, including nearby bends.
 for(const hill of R.scenery.hills)assert(R.roadClearance(hill.x,hill.z)>Math.max(...hill.size.filter((_,i)=>i!==1))+9.8,id+' hill must clear the road');
 for(const tree of R.scenery.trees)assert(R.roadClearance(tree.x,tree.z)>11.6,id+' tree crown must clear the road');
 const cross=(a,b,c)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
 for(let i=0;i<512;i++){
  const a=R.sample(R.track[i].s,-9.78),b=R.sample(R.track[i+1].s,-9.78),c=R.sample(R.track[i+1].s,9.78),d=R.sample(R.track[i].s,9.78);
  assert(cross(a,b,c)*cross(a,c,d)>0,id+' road mesh must not fold inside sharp corners');
 }
 for(const side of [-1,1])for(const angle of [-1.15,-.6,0,.6,1.15])for(const speed of [-4,20,25])for(const height of [0,1]){
  const race=R.create();race.phase='racing';race.riders.slice(1).forEach(r=>r.finished=true);
  const p=race.riders[0];Object.assign(p,{s:R.length*.5,offset:side*R.RAIL,angle,speed,y:height,boost:speed>20?.5:0});
  R.tick(race,{throttle:Math.sign(speed),turn:-side,drift:true},1/120);
  assert(Math.abs(p.offset)+1.05*Math.abs(Math.cos(p.angle))+1.8*Math.abs(Math.sin(p.angle))<9.62,id+' whole rider must remain inside rail, also in reverse, boost and jump');
 }
 for(let s=0;s<R.length;s+=8)for(const side of [-1,1])for(const angle of [-1.15,-.6,0,.6,1.15]){
  const race=R.create();race.phase='racing';race.riders.slice(1).forEach(r=>r.finished=true);
  Object.assign(race.riders[0],{s,offset:R.RAIL*side,angle,speed:25,boost:.5});R.tick(race,{throttle:1,turn:-side},1/120);
  const p=R.position(race.riders[0]);
  for(const x of [-1.05,1.05])for(const z of [-1.8,1.8])assert(R.roadClearance(p.x+Math.cos(p.heading)*x+Math.sin(p.heading)*z,p.z-Math.sin(p.heading)*x+Math.cos(p.heading)*z)<9.62,id+' rider corners must clear the actual curved rail');
 }
 console.log('PASS: '+id+' scenery clearance, 512 road quads, 60 collision variants and full-route rider footprint sweep');
}
