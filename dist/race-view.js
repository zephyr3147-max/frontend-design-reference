'use strict';
const R=CoastRace,base=I();let race=R.create(),last=null,elapsed=0,orbit=.06,pitch=.35,zoom=9,joystickAxis=0,joystickThrottle=0,resumePhase='racing';
const keys=new Set(),touchKeys=new Set(),pointers=new Map(),buttonPointers=new Map();
const $=id=>document.getElementById(id),active=k=>keys.has(k)||touchKeys.has(k);
const panel=$('race-panel'),map=$('map'),ctx=map.getContext('2d');
const joystick=$('joystick'),stick=$('stick');let stickPointer=null,drag=null,pinch=0;
let skidMarks=[],smoke=[],lastSkid=null,skidClock=0;
const keyMap={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',ShiftLeft:'brake',ShiftRight:'brake',KeyB:'brake',Space:'drift'};
const text=(id,value)=>{if($(id).textContent!==String(value))$(id).textContent=String(value);};
const coursePicker=$('course-select');coursePicker.value=R.courseId;
const courseChooser=$('course-chooser'),quickCourse=$('quick-course-select');quickCourse.value=R.courseId;courseChooser.hidden=true;let chooserPaused=false,chooserPanelWasHidden=false;
function closeChooser(){courseChooser.hidden=true;panel.hidden=chooserPanelWasHidden;panel.inert=false;canvas.inert=false;if(chooserPaused&&race.phase==='paused'){race.phase=resumePhase;panel.hidden=true;}chooserPaused=false;canvas.focus({preventScroll:true});}
$('choose-course').onclick=()=>{chooserPaused=['racing','countdown'].includes(race.phase);if(chooserPaused)pause();panel.hidden=true;panel.inert=true;canvas.inert=true;courseChooser.hidden=false;quickCourse.value=R.courseId;quickCourse.focus();};
$('cancel-course').onclick=closeChooser;
$('confirm-course').onclick=()=>{if(quickCourse.value===R.courseId){closeChooser();return;}const url=new URL(location.href);url.searchParams.set('course',quickCourse.value);location.assign(url);};
courseChooser.addEventListener('keydown',event=>{if(event.key==='Escape'){event.stopPropagation();closeChooser();}if(event.key==='Tab'){event.preventDefault();const items=[quickCourse,$('cancel-course'),$('confirm-course')],i=items.indexOf(document.activeElement);items[(i+(event.shiftKey?2:1)+3)%3].focus();}});
coursePicker.addEventListener('change',()=>{const url=new URL(location.href);url.searchParams.set('course',coursePicker.value);location.assign(url);});
text('course-name',R.course.name);text('map-format',R.course.loop?R.LAPS+' laps':'起点 → 终点');text('course-format',R.course.loop?R.LAPS:'1');text('course-unit',R.course.loop?'比赛圈数':'拉力赛段');
const format=t=>`${Math.floor(t/60)}:${(t%60).toFixed(1).padStart(4,'0')}`;
function release(){keys.clear();touchKeys.clear();pointers.clear();buttonPointers.clear();stickPointer=null;joystickAxis=0;joystickThrottle=0;stick.style.transform='none';document.querySelectorAll('.held').forEach(b=>b.classList.remove('held'));}
function resetCamera(){orbit=.06;pitch=.35;zoom=9;}
function showPanel(title,description,label){panel.hidden=false;text('panel-title',title);text('panel-description',description);text('start-label',label);}
function reset(){race=R.create();skidMarks=[];smoke=[];lastSkid=null;release();resetCamera();$('results').replaceChildren();$('race-details').hidden=false;$('roster').hidden=false;coursePicker.hidden=false;showPanel(R.course.name,R.course.loop?'长直道、连续弯与折返段。漂移快出弯，抢占超车路线。':'从起点奔向远方的终点。穿过海岸、S弯与长直道，一次冲线定胜负。','开始比赛');}
function start(){
  if(race.phase==='paused'){race.phase=resumePhase;}else{if(race.phase==='finished')race=R.create();R.start(race);}
  panel.hidden=true;coursePicker.hidden=true;canvas.focus({preventScroll:true});
}
function pause(){if(race.phase==='paused'){start();return;}if(!['racing','countdown'].includes(race.phase))return;resumePhase=race.phase;race.phase='paused';release();$('results').replaceChildren();$('race-details').hidden=true;$('roster').hidden=true;showPanel('稍作休息','比赛已暂停，所有车手都在等你。','继续比赛');}
$('start').onclick=start;$('reset').onclick=reset;$('camera').onclick=resetCamera;$('pause').onclick=pause;
addEventListener('keydown',e=>{if(!courseChooser.hidden)return;if(e.target&&['SELECT','INPUT','BUTTON'].includes(e.target.tagName)&&e.code!=='Escape')return;if(keyMap[e.code]){e.preventDefault();keys.add(keyMap[e.code]);}if(e.code==='KeyJ'){e.preventDefault();if(!e.repeat)R.jump(race);}if(e.code==='KeyR')reset();if(e.code==='Escape'||e.code==='KeyP')pause();if(e.code==='Enter'&&race.phase==='ready')start();});
addEventListener('keyup',e=>{if(keyMap[e.code])keys.delete(keyMap[e.code]);});
addEventListener('blur',()=>{release();if(['racing','countdown'].includes(race.phase))pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){release();if(['racing','countdown'].includes(race.phase))pause();last=null;}});
for(const b of document.querySelectorAll('[data-key]')){
  b.addEventListener('pointerdown',e=>{e.preventDefault();if(b.dataset.key==='jump')R.jump(race);b.setPointerCapture(e.pointerId);buttonPointers.set(e.pointerId,b.dataset.key);touchKeys.add(b.dataset.key);b.classList.add('held');});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>{buttonPointers.delete(e.pointerId);if(![...buttonPointers.values()].includes(b.dataset.key)){touchKeys.delete(b.dataset.key);b.classList.remove('held');}});
}
function moveStick(e){if(e.pointerId!==stickPointer)return;const r=joystick.getBoundingClientRect(),radius=r.width*.3;const x=Math.max(-radius,Math.min(radius,e.clientX-r.left-r.width/2));const v=x/radius;joystickAxis=Math.abs(v)<.12?0:Math.sign(v)*(Math.abs(v)-.12)/.88;joystickThrottle=0;stick.style.transform=`translate(${x}px,0)`;}
joystick.addEventListener('pointerdown',e=>{if(stickPointer!==null)return;e.preventDefault();stickPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);moveStick(e);});joystick.addEventListener('pointermove',moveStick);
for(const event of ['pointerup','pointercancel','lostpointercapture'])joystick.addEventListener(event,e=>{if(e.pointerId===stickPointer){stickPointer=null;joystickAxis=0;joystickThrottle=0;stick.style.transform='none';}});
const pinchDistance=()=>{const a=[...pointers.values()];return Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);};
canvas.addEventListener('pointerdown',e=>{e.preventDefault();canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);drag=[e.clientX,e.clientY];if(pointers.size===2)pinch=pinchDistance();});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2){const d=pinchDistance();zoom=Math.max(5,Math.min(17,zoom+(pinch-d)*.025));pinch=d;}else if(drag){orbit-=(e.clientX-drag[0])*.006;pitch=Math.max(.15,Math.min(.9,pitch+(e.clientY-drag[1])*.004));}drag=[e.clientX,e.clientY];});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,e=>{pointers.delete(e.pointerId);drag=pointers.size?[...pointers.values()][0]:null;});
canvas.addEventListener('wheel',e=>{e.preventDefault();zoom=Math.max(5,Math.min(17,zoom+e.deltaY*.008));},{passive:false});
function resize(){const d=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(innerWidth*d);canvas.height=Math.round(innerHeight*d);gl.viewport(0,0,canvas.width,canvas.height);}addEventListener('resize',resize);resize();
// Batch the entire road into a few meshes rather than hundreds of draw calls.
function ribbon(from,to,height,dashed=false,vertical=false){const p=[],n=[];for(let i=0;i<512;i++){if(dashed&&i%12>5)continue;const a=i===0&&!R.course.loop?-20:R.track[i].s,b=R.track[i+1].s;const points=vertical?[R.sample(a,from),R.sample(b,from),R.sample(b,from),R.sample(a,from)]:[R.sample(a,from),R.sample(b,from),R.sample(b,to),R.sample(a,to)];for(const k of [0,1,2,0,2,3]){const q=points[k];p.push(q.x,vertical?(k<2?.08:height):height,q.z);n.push(0,1,0);}}return mesh(p,n);}
const verge=ribbon(-35,35,-.06);
const roadParts=[
  [ribbon(-9.7,9.7,.014),[.63,.62,.54]],[ribbon(-7,7,.03),[.17,.21,.23]],
  [ribbon(-7,-6.82,.043),[.95,.95,.84]],[ribbon(6.82,7,.043),[.95,.95,.84]],
  [ribbon(-.10,.10,.045,true),[.96,.78,.46]],
  [ribbon(-8,-7.1,.10),[.97,.96,.88]],[ribbon(7.1,8,.10),[.97,.96,.88]],
  [ribbon(-8,-7.1,.108,true),[.90,.29,.22]],[ribbon(7.1,8,.108,true),[.90,.29,.22]],
  [ribbon(-9.7,-9.7,.70,false,true),[.63,.70,.69]],[ribbon(9.7,9.7,.70,false,true),[.63,.70,.69]],
  [ribbon(-9.78,-9.62,.72),[.94,.95,.86]],[ribbon(9.62,9.78,.72),[.94,.95,.86]]
];
const trees=R.scenery.trees;
const viewStart=R.sample(-12,-1.8);let cameraPos=[viewStart.x-7,5,viewStart.z-5],cameraTarget=[viewStart.x,1.4,viewStart.z];
function scenery(player){
  box(base,[0,-.8,0],[1800,.2,1800],[.30,.63,.70]);blob(base,[0,-.6,0],[148,.5,143],[.79,.79,.61]);blob(base,[0,-.3,0],[131,.25,126],[.52,.65,.49]);
  for(const h of R.scenery.hills)blob(base,[h.x,h.y,h.z],h.size,h.color);
  drawMesh(verge,base,[.48,.61,.43]);for(let i=0;i<roadParts.length;i++)drawMesh(roadParts[i][0],base,roadParts[i][1],i===1?.14:0);
  for(let i=0;i<64;i++)for(const side of[-1,1]){const q=R.sample(i/64*R.length,side*9.8);if(Math.hypot(q.x-player.x,q.z-player.z)>85)continue;const root=mul(T(q.x,0,q.z),RY(q.heading));box(root,[0,.48,0],[.16,.94,.16],[.23,.33,.34]);box(root,[0,.86,0],[.19,.15,.19],[.99,.77,.38]);}
  for(const t of trees){if(Math.hypot(t.x-player.x,t.z-player.z)>100)continue;beam(base,[t.x,0,t.z],[t.x,3.2,t.z],.16,[.46,.37,.26]);blob(base,[t.x,3.5,t.z],[1.6,1.9,1.5],[.31,.51,.39]);blob(base,[t.x+.7,3,t.z],[1.1,1.3,1.2],[.38,.58,.41]);}
  for(const gateDistance of R.course.loop?[0]:[0,R.length]){
  const start=R.sample(gateDistance),gate=mul(T(start.x,0,start.z),RY(start.heading));
  for(const side of [-1,1])box(gate,[side*8,2.9,0],[.35,5.8,.35],[.17,.30,.34]);box(gate,[0,5.8,0],[16.4,.85,.35],[.16,.28,.33]);
  for(let row=0;row<2;row++)for(let i=0;i<14;i++)box(gate,[-6.5+i,.061,-.5+row],[1,.025,1],(i+row)%2?[.19,.27,.30]:[.97,.96,.86]);
  }
  for(let i=0;i<20;i++){const s=i/20*R.length;if(Math.abs(R.curvature(s))<.018)continue;const q=R.sample(s,Math.sign(R.curvature(s))*-9.5);if(Math.hypot(q.x-player.x,q.z-player.z)>85)continue;const root=mul(T(q.x,0,q.z),RY(q.heading));box(root,[0,1.3,0],[1.3,.9,.12],[.17,.28,.32]);const sign=Math.sign(R.curvature(s));beam(root,[-sign*.25,1.6,-.08],[sign*.25,1.3,-.08],.05,palette.cream);beam(root,[sign*.25,1.3,-.08],[-sign*.25,1,-.08],.05,palette.cream);}
  for(let i=0;i<12;i++){const q=R.sample(i/12*R.length,12.5);if(Math.hypot(q.x-player.x,q.z-player.z)>90)continue;const root=mul(T(q.x,0,q.z),RY(q.heading));beam(root,[0,0,0],[0,4.3,0],.055,[.30,.38,.38]);box(root,[.5,3.5,0],[.95,1.4,.035],i%2?[.94,.43,.31]:[.17,.43,.45]);for(let j=0;j<3;j++)box(root,[.48,3.15+j*.3,-.027],[.58,.08,.04],palette.cream);}
}
function wheel(root,z,phase){const m=mul(root,T(0,.65,z)),spin=mul(m,RX(phase));drawMesh(tire,spin,palette.ink);for(let i=0;i<4;i++){const a=i*Math.PI/2;beam(spin,[0,0,0],[0,.5*Math.cos(a),.5*Math.sin(a)],.014,palette.cream);}}
function driftEffects(dt){
  const r=race.riders[0],p=R.position(r);skidClock+=dt;
  if(race.phase==='racing'&&r.drift>.3&&r.y<.03&&r.speed>7&&skidClock>.07){
    skidClock=0;const point=[p.x-Math.sin(p.heading)*1.1,.064,p.z-Math.cos(p.heading)*1.1];
    if(lastSkid)skidMarks.push({a:lastSkid,b:point,time:elapsed});lastSkid=point;
    smoke.push({x:point[0],z:point[2],time:elapsed});
  }else if(r.drift<.15||r.y>.03)lastSkid=null;
  skidMarks=skidMarks.filter(m=>elapsed-m.time<10).slice(-130);smoke=smoke.filter(m=>elapsed-m.time<.65).slice(-9);
  for(const m of skidMarks){if(Math.hypot(m.a[0]-p.x,m.a[2]-p.z)<65)beam(base,m.a,m.b,.035,[.10,.13,.14]);}
  for(const m of smoke){const age=elapsed-m.time,size=.10+age*.7;blob(base,[m.x+Math.sin(m.time*3)*age*.3,.16+age*.55,m.z],[size,size*.7,size],[.70+age*.15,.73+age*.12,.71+age*.14]);}
}
const colors={rabbit:[.93,.90,.83],fox:[.87,.46,.23],panda:[.91,.92,.87],frog:[.43,.69,.44],cat:[.56,.62,.76],crab:[.95,.39,.27]};
function racer(r){
  const p=R.position(r),body=colors[r.kind],crab=r.kind==='crab',pedal=r.phase*.28,bob=Math.sin(pedal*2)*.012;
  const bump=r.hit>0?Math.sin((1-r.hit/.45)*Math.PI)*.04:0;
  const root=mul(T(p.x,.10+r.y+bob,p.z),mul(RY(p.heading),RZ(-r.steer*.07+bump)));
  blob(base,[p.x,.055,p.z],[.8,.025,1.65],[.35,.41,.34]);wheel(root,-1.1,r.phase);wheel(root,1.15,r.phase);
  const rear=[0,.65,-1.1],seat=[0,1.45,-.45],crank=[0,.7,0],fork=[0,1.45,.85],front=[0,.65,1.15];
  for(const[a,b]of[[rear,seat],[seat,crank],[rear,crank],[seat,fork],[crank,fork],[fork,front]])beam(root,a,b,.04,r.id===0?palette.gold:[.70,.76,.73]);
  box(root,[0,1.52,-.45],[.35,.12,.4],palette.ink);beam(root,fork,[0,1.7,1],.04,palette.ink);beam(root,[-.4,1.7,1],[.4,1.7,1],.035,palette.ink);
  for(const side of[-1,1]){const a=pedal+(side>0?Math.PI:0),foot=[side*.22,.7+Math.cos(a)*.23,Math.sin(a)*.23],knee=[side*.35,1.05,-.25];beam(root,[side*.23,1.7,-.45],knee,.07,body);beam(root,knee,foot,.065,body);box(root,foot,[.23,.07,.18],palette.ink);beam(root,[side*.35,1.95,-.2],[side*.4,1.72,1],.09,r.kind==='panda'?palette.ink:body);}
  if(crab){
    blob(root,[0,2,-.4],[.75,.36,.48],body);
    for(const side of[-1,1]){
      beam(root,[side*.31,2.25,-.22],[side*.36,2.59,-.1],.055,body);blob(root,[side*.36,2.61,-.1],[.14,.17,.14],palette.cream);blob(root,[side*.36,2.64,.02],[.065,.09,.04],palette.ink);
      for(let i=0;i<3;i++)beam(root,[side*.56,1.95,-.8+i*.28],[side*1.0,1.5,-.9+i*.35],.055,body);
      blob(root,[side*.43,1.8,1],[.19,.15,.21],body);blob(root,[side*.55,1.9,1.13],[.07,.10,.15],palette.lightCrab);blob(root,[side*.33,1.83,1.14],[.06,.08,.13],body);
    }
    for(let i=0;i<3;i++)box(root,[Math.sin(elapsed*5-i)*.06,2.05,-.95-i*.23],[.32,.035,.25],[.07,.46,.48]);
  }else{
    const jerseys={rabbit:[.39,.65,.67],fox:[.22,.39,.48],panda:[.78,.48,.35],frog:[.91,.70,.34],cat:[.59,.46,.65]};
    blob(root,[0,1.95,-.35],[.43,.53,.40],jerseys[r.kind]);blob(root,[0,2.57,-.18],[.51,.48,.45],body);
    box(root,[0,2.02,-.75],[.23,.25,.03],palette.cream);
    for(const side of[-1,1]){
      if(r.kind==='rabbit'){blob(root,[side*.24,3.15,-.23],[.14,.52,.15],body,RZ(-side*.12));blob(root,[side*.24,3.17,-.09],[.065,.36,.035],[.89,.65,.62]);}
      if(r.kind==='panda'){blob(root,[side*.38,2.94,-.25],[.21,.22,.17],palette.ink);blob(root,[side*.22,2.64,.20],[.18,.20,.11],palette.ink);}
      if(r.kind==='fox'||r.kind==='cat')blob(root,[side*.32,2.98,-.21],[.16,.30,.16],body,RZ(-side*.35));
      if(r.kind==='frog')blob(root,[side*.34,2.94,-.06],[.23,.25,.22],body);
      const eyeY=r.kind==='frog'?2.99:2.64;blob(root,[side*.22,eyeY,.24],[.10,.12,.07],palette.cream);blob(root,[side*.22,eyeY,.30],[.052,.075,.035],palette.ink);
    }
    blob(root,[0,2.4,.24],[.28,.18,.20],r.kind==='frog'?body:palette.cream);blob(root,[0,2.47,.40],[.07,.06,.05],palette.ink);
    if(r.kind==='rabbit')blob(root,[0,1.61,-.8],[.19,.19,.19],palette.cream);
    if(r.kind==='fox'){blob(root,[.2,1.8,-.95],[.27,.30,.65],body,RX(-.4));blob(root,[.2,2.0,-1.43],[.19,.21,.22],palette.cream);}
    if(r.kind==='cat'){beam(root,[.15,1.65,-.7],[.5,1.4,-1.2],.075,body);beam(root,[.5,1.4,-1.2],[.7,1.65,-1.3],.065,body);for(const side of[-1,1])for(const y of[2.34,2.43])beam(root,[side*.15,y,.4],[side*.46,y+.04,.35],.012,palette.ink);}
  }
}
const mapBounds=R.track.reduce((b,p)=>({minX:Math.min(b.minX,p.x),maxX:Math.max(b.maxX,p.x),minZ:Math.min(b.minZ,p.z),maxZ:Math.max(b.maxZ,p.z)}),{minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity});
function mapPoint(p){const scale=Math.min(196/(mapBounds.maxX-mapBounds.minX),144/(mapBounds.maxZ-mapBounds.minZ));return[116-(p.x-(mapBounds.minX+mapBounds.maxX)/2)*scale,90-(p.z-(mapBounds.minZ+mapBounds.maxZ)/2)*scale];}
function drawMap(){ctx.clearRect(0,0,map.width,map.height);const point=mapPoint;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();R.track.forEach((p,i)=>{const[x,y]=point(p);if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);});ctx.strokeStyle='#718e8d';ctx.lineWidth=8;ctx.stroke();ctx.strokeStyle='#b8ccbd';ctx.lineWidth=2;ctx.stroke();
  for(const [s,color]of [[0,'#8fe0b7'],[R.length,'#ef977b']]){const[x,y]=point(R.sample(s));ctx.fillStyle=color;ctx.fillRect(x-3,y-3,6,6);}
  const p=race.riders[0];ctx.beginPath();for(let i=0;i<20;i++){const[x,y]=point(R.sample(p.s+i*3));if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.lineWidth=3;ctx.strokeStyle='#f8c77d';ctx.stroke();
  for(const r of [...race.riders].reverse()){const q=R.position(r),[x,y]=point(q);ctx.save();ctx.translate(x,y);ctx.fillStyle=r.id===0?'#ef8063':r.color;ctx.beginPath();if(r.id===0){ctx.rotate(-q.heading);ctx.moveTo(0,-6);ctx.lineTo(4,4);ctx.lineTo(0,2);ctx.lineTo(-4,4);ctx.closePath();}else ctx.arc(0,0,3.1,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#17343e';ctx.lineWidth=1.3;ctx.stroke();ctx.restore();}
}
let showedFinish=false;
function updateHUD(){const p=race.riders[0],order=R.rank(race);text('rank',order.findIndex(r=>r.id===0)+1);if(R.course.loop)text('lap',Math.min(R.LAPS,Math.floor(Math.max(0,p.s)/R.length)+1));text('clock',format(race.time));text('speed',Math.round(Math.abs(p.speed)*3.6));text('distance',Math.floor(Math.max(0,p.s)));$('speed-fill').style.width=Math.min(100,Math.abs(p.speed)/R.MAX_SPEED*100)+'%';$('progress-fill').style.width=Math.max(0,Math.min(100,p.s/(R.length*R.LAPS)*100))+'%';text('countdown',race.phase==='countdown'?Math.ceil(race.countdown):race.phase==='racing'&&race.time<.8?'GO!':'');text('game-state',race.messageTime>0?race.message:race.phase==='racing'&&Math.abs(p.offset)>R.ROAD_HALF?'驶离路面 · 草地正在拖慢速度':'');
  if(race.messageTime<=0&&race.phase==='racing'&&p.drift>.35)text('game-state','漂移中 · 松开漂移恢复抓地');
  if(race.messageTime<=0&&race.phase==='racing'&&p.drift>.35&&p.driftCharge>.35)text('game-state','漂移已蓄力 · 松开获得出弯加速');
  if(race.messageTime<=0&&race.phase==='racing'&&p.draft>.7&&p.drift<.35)text('game-state','尾流加速 · 找机会超车');
  if(R.course.loop)text('lap-total',R.LAPS);if(!R.course.loop)text('lap-line',Math.floor(Math.max(0,Math.min(100,p.s/R.length*100)))+'% · 冲向终点');
  $('drift-fill').style.width=((p.boost>0?Math.min(1,p.boost/.6):p.driftCharge)*100)+'%';$('drift-meter').hidden=p.drift<.15&&p.boost<=0;
  text('drift-label',p.boost>0?'出弯加速':'漂移蓄力');
  canvas.dataset.drifting=String(p.drift>.35);canvas.dataset.boost=p.boost.toFixed(2);canvas.dataset.boosting=String(p.boost>0);canvas.dataset.slip=p.slip.toFixed(3);
  canvas.dataset.position=`${R.position(p).x.toFixed(2)},${R.position(p).z.toFixed(2)}`;canvas.dataset.speed=p.speed.toFixed(2);canvas.dataset.phase=race.phase;canvas.dataset.height=p.y.toFixed(3);canvas.dataset.distance=p.s.toFixed(2);canvas.dataset.riders=String(race.riders.length);canvas.dataset.frame=String(Math.round(elapsed*1000));
  if(race.phase==='finished'&&!showedFinish){showedFinish=true;showPanel('第 '+(order.findIndex(r=>r.id===0)+1)+' 名冲线！','用时 '+format(race.time)+' · 再挑战一次，试着更早刹车入弯。','再赛一场');$('race-details').hidden=true;$('roster').hidden=true;$('results').replaceChildren();order.forEach((r,i)=>{const row=document.createElement('div');row.className='result-row'+(r.id===0?' you':'');const name=document.createElement('b'),time=document.createElement('time');name.textContent=`${i+1}  ${r.name}`;time.textContent=r.finished?format(r.finishTime):'尚未冲线';row.append(name,time);$('results').append(row);});}
  if(race.phase!=='finished')showedFinish=false;
}
function frame(now){const dt=last===null?0:Math.min((now-last)/1000,.05);last=now;elapsed+=dt;R.tick(race,{throttle:Number(active('forward')||(touchKeys.has('drift')&&!active('back')))-Number(active('back')),brake:active('brake'),drift:active('drift'),turn:stickPointer!==null?joystickAxis:Number(active('right'))-Number(active('left'))},dt);
  const p=R.position(race.riders[0]),a=p.heading+Math.PI+orbit,d=zoom+Math.abs(race.riders[0].speed)*.025,target=[p.x,1.6+p.y*.5,p.z],desired=[p.x+Math.sin(a)*d*Math.cos(pitch),1.6+Math.sin(pitch)*d+p.y*.5,p.z+Math.cos(a)*d*Math.cos(pitch)],follow=1-Math.exp(-6*dt);
  for(let i=0;i<3;i++){cameraPos[i]+=(desired[i]-cameraPos[i])*follow;cameraTarget[i]+=(target[i]-cameraTarget[i])*follow;}
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniformMatrix4fv(loc.vp,false,new Float32Array(mul(perspective(canvas.width/canvas.height),lookAt(cameraPos,cameraTarget))));scenery(p);driftEffects(dt);for(const r of race.riders){const q=R.position(r);if(Math.hypot(q.x-p.x,q.z-p.z)<110)racer(r);}drawMap();updateHUD();requestAnimationFrame(frame);
}
reset();requestAnimationFrame(frame);
