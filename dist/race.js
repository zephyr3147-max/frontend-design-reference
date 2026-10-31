/* Shared circuit and deterministic race simulation. No rendering dependencies. */
(function(root){
  'use strict';
  function makeCourse(courseId='coast'){
  const courses={
    coast:{name:'海岸大奖赛',laps:2,loop:true,points:[[-82,-50],[-82,45],[-65,86],[-10,94],[35,64],[70,96],[123,70],[140,20],[100,-5],[42,-8],[45,-45],[100,-68],[62,-112],[0,-105],[-42,-88]]},
    mountain:{name:'山路挑战',laps:2,loop:true,points:[[-150,-90],[-150,70],[-90,125],[-30,110],[0,60],[-55,25],[-45,-25],[20,-40],[60,0],[40,55],[85,95],[150,60],[180,0],[140,-45],[80,-45],[65,-100],[125,-145],[60,-190],[-10,-160],[-65,-195],[-130,-150]]},
    rally:{name:'海岸拉力',laps:1,loop:false,points:[[-80,-50],[-80,50],[-40,100],[50,100],[90,150],[65,205],[-30,210],[-85,255],[-55,310],[45,320],[115,360],[155,405],[120,455],[60,450],[20,405],[-40,405],[-80,460],[-45,515],[50,530],[130,570],[130,640],[55,680],[-35,680],[-90,730],[-70,800],[10,835],[100,820],[150,870],[125,930],[40,970]]}
  };
  courseId=courses[courseId]?courseId:'coast';
  const course=courses[courseId];
  const TAU=Math.PI*2,MAX_SPEED=20,BOOST_SPEED=25,ROAD_HALF=7,RAIL=9.1,LAPS=course.laps;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const wrap=(v,n)=>((v%n)+n)%n;
  const angle=v=>wrap(v+Math.PI,TAU)-Math.PI;
  const track=[];
  let length=0;
  let points=course.points.map(p=>p.map(v=>v*(course===courses.coast?1.25:1)));
  for(let pass=0;pass<2;pass++){
    const next=course.loop?[]:[points[0]];
    for(let i=0;i<(course.loop?points.length:points.length-1);i++){const a=points[i],b=points[(i+1)%points.length];next.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25],[a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75]);}
    if(!course.loop)next.push(points[points.length-1]);points=next;
  }
  function path(t){
    const span=t*(course.loop?points.length:points.length-1),i=course.loop?Math.floor(span):Math.min(Math.floor(span),points.length-2),f=span-i;
    const get=k=>points[course.loop?wrap(k,points.length):clamp(k,0,points.length-1)];
    const p0=get(i-1),p1=get(i),p2=get(i+1),p3=get(i+2);
    return[0,1].map(k=>.5*((2*p1[k])+(-p0[k]+p2[k])*f+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*f*f+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*f*f*f));
  }
  for(let i=0;i<=512;i++){
    const t=i/512,[x,z]=path(t),a=path(Math.max(0,t-.0001)),b=path(Math.min(1,t+.0001)),heading=Math.atan2(b[0]-a[0],b[1]-a[1]);
    if(i)length+=Math.hypot(x-track[i-1].x,z-track[i-1].z);
    track.push({x,z,heading,s:length});
  }
  function sample(distance,offset=0){
    if(!course.loop&&(distance<0||distance>=length)){const p=distance<0?track[0]:track[512],d=distance<0?distance:0;return{x:p.x+Math.sin(p.heading)*d+Math.cos(p.heading)*offset,z:p.z+Math.cos(p.heading)*d-Math.sin(p.heading)*offset,heading:p.heading};}
    const s=course.loop?wrap(distance,length):distance;
    let lo=0,hi=track.length-1;
    while(hi-lo>1){const m=(lo+hi)>>1;if(track[m].s<=s)lo=m;else hi=m;}
    const a=track[lo],b=track[hi],f=(s-a.s)/(b.s-a.s),h=a.heading+angle(b.heading-a.heading)*f;
    return{x:a.x+(b.x-a.x)*f+Math.cos(h)*offset,z:a.z+(b.z-a.z)*f-Math.sin(h)*offset,heading:h};
  }
  const aheadGap=(a,b)=>course.loop?wrap(a-b,length):a-b;
  const curvature=s=>angle(sample(s+2).heading-sample(s-2).heading)/4;
  function roadClearance(x,z){
    let nearest=Infinity;
    for(let i=course.loop?0:-1;i<512;i++){
      const a=i<0?sample(-20):track[i],b=track[i+1],dx=b.x-a.x,dz=b.z-a.z;
      const t=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);
      nearest=Math.min(nearest,Math.hypot(x-a.x-dx*t,z-a.z-dz*t));
    }
    return nearest;
  }
  const scenery={
    hills:[{x:-18,y:0,z:-12,size:[20,4,22],color:[.48,.61,.46]},{x:16,y:-1,z:17,size:[16,3,18],color:[.57,.67,.50]}].filter(h=>roadClearance(h.x,h.z)>Math.max(h.size[0],h.size[2])+9.8),
    trees:Array.from({length:38},(_,i)=>({...sample(i/38*length,(i%2?1:-1)*(19+Math.sin(i*5)*5)),seed:i})).filter(t=>roadClearance(t.x,t.z)>11.6)
  };
  // Reserve space for the rotated rider and both wheels, not only its centre.
  const railLimit=r=>Math.min(RAIL,9.62-1.05*Math.abs(Math.cos(r.angle))-1.8*Math.abs(Math.sin(r.angle))-.2);
  const roster=[
    {kind:'crab',name:'你',color:'#ed775e',lane:-1.8,pace:20},
    {kind:'rabbit',name:'小兔',color:'#f0d4c5',lane:1.8,pace:19.9},
    {kind:'fox',name:'狐狸',color:'#e7a352',lane:-1.8,pace:20},
    {kind:'panda',name:'熊猫',color:'#e8e9ea',lane:1.8,pace:19.65},
    {kind:'frog',name:'青蛙',color:'#8bbf9b',lane:-1.8,pace:19.8},
    {kind:'cat',name:'小猫',color:'#9ca7ca',lane:1.8,pace:19.95}
  ];
  function create(){
    return{phase:'ready',countdown:3,time:0,finishOrder:[],contacts:{},message:'',messageTime:0,
      riders:roster.map((r,i)=>({...r,id:i,s:i===0?-12:-4-Math.floor((i-1)/2)*4,offset:r.lane,speed:0,angle:0,steer:0,drift:0,slip:0,driftSide:1,driftCharge:0,boost:0,draft:0,y:0,vy:0,phase:0,hit:0,finished:false,finishTime:null}))};
  }
  function start(race){if(race.phase==='ready'){race.phase='countdown';race.countdown=3;return true;}return false;}
  function jump(race){const p=race.riders[0];if(race.phase!=='racing'||p.y>.001||p.vy!==0||p.finished)return false;p.vy=5;return true;}
  function position(rider){const p=sample(rider.s,rider.offset);return{...p,heading:p.heading+rider.angle,y:rider.y};}
  function rank(race){
    return [...race.riders].sort((a,b)=>a.finished&&b.finished?a.finishTime-b.finishTime:a.finished?-1:b.finished?1:b.s-a.s||b.id-a.id);
  }
  function hit(race,rider,kind){
    rider.hit=.45;rider.driftCharge=0;rider.boost=0;
    if(rider.id===0){race.message=kind==='rail'?'碰撞减速 · 回到路面继续追赶':'擦碰对手 · 速度降低';race.messageTime=1.6;}
  }
  function tick(race,input={},delta){
    let left=clamp(delta,0,.25);
    while(left>0){const dt=Math.min(left,1/120);left-=dt;step(race,input,dt);}
  }
  function step(race,input,dt){
    race.messageTime=Math.max(0,race.messageTime-dt);
    if(race.phase==='countdown'){
      race.countdown-=dt;
      if(race.countdown<=0){race.phase='racing';race.countdown=0;}
      return;
    }
    if(race.phase!=='racing')return;
    race.time+=dt;
    for(const r of race.riders){
      if(r.finished)continue;
      r.hit=Math.max(0,r.hit-dt);
      const previousSpeed=r.speed;
      const oldOffset=r.offset;
      const player=r.id===0,c=curvature(r.s+6);
      if(player){
        const throttle=input.brake?0:clamp(input.throttle||0,-1,1);
        const inWake=r.speed>8&&r.y<.03&&Math.abs(r.offset)<ROAD_HALF&&race.riders.some(other=>other!==r&&!other.finished&&aheadGap(other.s,r.s)>3&&aheadGap(other.s,r.s)<16&&Math.abs(other.offset-r.offset)<1.5);
        r.draft=clamp(r.draft+(inWake?dt:-dt*2),0,1.5);
        r.boost=Math.max(0,r.boost-dt);
        r.speed+=throttle*7.2*(r.boost>0?1.75:1)*(r.draft>.7?1.2:1)*dt;
        r.speed*=Math.exp(-(throttle===0?.4:.018)*dt);
        if(input.brake)r.speed*=Math.exp(-5*dt);
        if(Math.abs(r.speed)<.025)r.speed=0;
        r.speed=clamp(r.speed,-4,r.boost>0?BOOST_SPEED:Math.max(MAX_SPEED,previousSpeed-6*dt));
        // In this rear camera, negative track offset is screen-right.
        r.steer+=(-(input.turn||0)-r.steer)*Math.min(1,dt*10);
        const sliding=!!input.drift&&!input.brake&&r.speed>8&&r.y<.03&&Math.abs(r.offset)<ROAD_HALF&&(Math.abs(r.steer)>.15||r.drift>.25);
        if(!input.drift&&!input.brake&&r.wasSliding&&r.driftCharge>.28&&r.y<.03&&Math.abs(r.offset)<ROAD_HALF){r.boost=.35+r.driftCharge*.25;race.message='漂亮出弯 · 加速奖励';race.messageTime=1.1;r.driftCharge=0;}
        if(sliding&&Math.abs(r.angle)>.10&&Math.abs(r.angle)<.8&&r.speed>10){r.driftCharge=clamp(r.driftCharge+dt*1.6,0,1);}
        else if(!sliding)r.driftCharge=Math.max(0,r.driftCharge-dt*1.5);
        r.wasSliding=sliding;
        if(sliding&&Math.abs(r.steer)>.15)r.driftSide=Math.sign(r.steer);
        r.drift+=((sliding?1:0)-r.drift)*Math.min(1,dt*(sliding?8:10));
        r.slip+=(r.driftSide*r.drift*(.20+.12*r.speed/MAX_SPEED)-r.slip)*Math.min(1,dt*5);
        // Gentle road-following assistance keeps mobile steering approachable.
        const travelAngle=r.angle-r.slip,travel=r.speed*Math.cos(travelAngle)*dt/clamp(1-c*r.offset,.7,1.3);
        r.angle=clamp(r.angle+r.steer*r.speed*.0725*(1+r.drift*.12)*dt-c*travel*.38,-1.15,1.15);
        if(Math.abs(r.speed)>.25)r.angle*=Math.exp(-(.72-r.drift*.25)*dt);
        r.s+=travel;
        r.offset+=Math.sin(travelAngle)*r.speed*dt;
        r.speed*=Math.exp(-r.drift*.045*dt);
        const offRoad=clamp((Math.abs(r.offset)-ROAD_HALF)/1.2,0,1);
        r.speed*=Math.exp(-offRoad*.9*dt);
        const limit=railLimit(r);
        if(Math.abs(r.offset)>limit){
          r.offset=Math.sign(r.offset)*limit;
          const impact=Math.abs(r.speed*Math.sin(r.angle));
          if(r.hit<=0&&impact>.35){r.speed*=1-clamp(impact/30,.035,.40);hit(race,r,'rail');}
          r.angle=-Math.sign(r.offset)*Math.min(.18,Math.abs(r.angle)*.25);
        }
        r.vy-=12*dt;r.y=Math.max(0,r.y+r.vy*dt);if(!r.y)r.vy=0;
      }else{
        let desired=Math.min(r.pace,Math.max(18.8,Math.sqrt(12/(Math.abs(curvature(r.s+15))+.003))));
        if(!r.laneUntil||race.time>r.laneUntil){
          r.targetLane=clamp(c*60,-2.7,2.7)+r.lane*.2;
          for(const other of race.riders){if(other===r||other.finished)continue;const gap=aheadGap(other.s,r.s);if(gap>0&&gap<13&&Math.abs(other.offset-r.offset)<1.6){
            const candidates=[-4.5,-2.2,0,2.2,4.5];
            const score=lane=>race.riders.reduce((cost,o)=>o===r?cost:cost+(aheadGap(o.s,r.s)>0&&aheadGap(o.s,r.s)<16&&Math.abs(o.offset-lane)<1.5?100:0),Math.abs(lane-r.offset));
            r.targetLane=candidates.sort((a,b)=>score(a)-score(b))[0];r.laneUntil=race.time+1.8;break;
          }}
        }
        for(const other of race.riders){if(other===r||other.finished)continue;const gap=aheadGap(other.s,r.s);if(gap>0&&gap<7&&Math.abs(other.offset-r.offset)<1.35)desired=Math.min(desired,Math.max(0,other.speed+(gap-3)*1.6));}
        r.speed+=clamp(desired-r.speed,-8*dt,6.9*dt);r.speed=clamp(r.speed,0,MAX_SPEED);
        const lateral=clamp((r.targetLane-r.offset)*1.1,-1.65,1.65);
        r.offset+=lateral*dt;
        r.angle+= (Math.atan2(lateral,Math.max(r.speed,3))-r.angle)*Math.min(1,dt*3);
        r.s+=r.speed*dt/clamp(1-c*r.offset,.7,1.3);
      }
      r.lateralSpeed=(r.offset-oldOffset)/dt;
      r.phase+=r.speed*dt/.61;
      if(r.s>=length*LAPS){
        r.s=length*LAPS;r.finished=true;r.finishTime=race.time;race.finishOrder.push(r.id);
      }
    }
    for(let i=0;i<race.riders.length;i++)for(let j=i+1;j<race.riders.length;j++){
      const a=race.riders[i],b=race.riders[j];
      const ds=(course.loop?wrap(a.s-b.s+length/2,length)-length/2:a.s-b.s),dx=a.offset-b.offset;
      if(a.finished||b.finished||Math.abs(ds)>=2.55||Math.abs(dx)>=1.18||Math.abs(a.y-b.y)>.8)continue;
      const longitudinal=(2.55-Math.abs(ds))/2.55<(1.18-Math.abs(dx))/1.18;
      const key=i+':'+j,canImpact=race.time-(race.contacts[key]??-10)>.7;
      if(longitudinal){
        const sign=Math.sign(ds)||1,push=(2.55-Math.abs(ds))*.5+.0001;
        a.s+=sign*push;b.s-=sign*push;
        const closing=Math.max(0,(b.speed-a.speed)*sign);
        if(canImpact&&closing>.25){const impulse=closing*.55;a.speed=clamp(a.speed+sign*impulse,-4,MAX_SPEED);b.speed=clamp(b.speed-sign*impulse,-4,MAX_SPEED);hit(race,a,'rider');hit(race,b,'rider');race.contacts[key]=race.time;}
      }else{
        const side=Math.sign(dx)||1,push=(1.18-Math.abs(dx))*.5+.0001;
        a.offset=clamp(a.offset+side*push,-railLimit(a),railLimit(a));b.offset=clamp(b.offset-side*push,-railLimit(b),railLimit(b));
        const closing=Math.max(0,-side*((a.lateralSpeed||0)-(b.lateralSpeed||0)));
        if(canImpact&&closing>.2){const loss=clamp(closing*.06,.015,.12);a.speed*=1-loss;b.speed*=1-loss;hit(race,a,'rider');hit(race,b,'rider');race.contacts[key]=race.time;}
      }
    }
    if(race.riders[0].finished){race.phase='finished';}
  }
  const api={course,courseId,courses,BOOST_SPEED,MAX_SPEED,ROAD_HALF,RAIL,LAPS,length,track,scenery,roadClearance,roster,create,start,jump,tick,sample,curvature,position,rank};
  return api;
  }
  const selected=root.location?new URLSearchParams(root.location.search).get('course'):'coast';
  const api=makeCourse(selected||'coast');api.forCourse=makeCourse;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CoastRace=api;
})(typeof globalThis!=='undefined'?globalThis:this);
