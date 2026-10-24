/* 游戏物理和场景障碍物共用坐标，可在浏览器和 Node 中运行。 */
(function (root) {
  'use strict';
  const RADIUS = .60;
  const BODY_OFFSETS = [-1.25, -.625, 0, .625, 1.25];
  function createState() {
    return { x:0, z:0, heading:0, speed:0, distance:0, phase:0, steer:0,
      y:0, vy:0, mode:'riding', deathTime:0, hitTime:0, hitKind:'', waterDepth:0, wet:false,
      crashTime:0, crashDuration:0, impactSpeed:0, impactStrength:0, crashSide:1, crashForward:1 };
  }
  function obstacles(z) {
    const objects = [], center = Math.floor(z / 24);
    for (let i = center - 4; i <= center + 6; i++) {
      objects.push({kind:'tree', x:7+Math.sin(i*4)*1.3, z:i*24, radius:.25, height:4.3, trunkHeight:3.7+Math.cos(i)*.5, seed:i});
      if (i % 2 === 0) {
        objects.push({kind:'tree', x:-4.6, z:i*24+10, radius:.25, height:3.8, trunkHeight:3.3, seed:i*.7});
      }
      if (i % 3 === 0) {
        objects.push({kind:'wall', x:13, z:i*24+8, halfWidth:1.5, halfDepth:1.5, height:2.4});
      }
    }
    return objects;
  }
  function jump(state) {
    if (state.mode !== 'riding' || state.y > .001 || state.vy !== 0 || state.crashTime < state.crashDuration) { return false; }
    state.vy = 5.6;
    return true;
  }
  function pushOut(state, obstacle, offset) {
    if (state.y-state.waterDepth >= obstacle.height) { return false; }
    const x = state.x + Math.sin(state.heading)*offset;
    const z = state.z + Math.cos(state.heading)*offset;
    let dx, dz, limit = RADIUS;
    if (obstacle.kind === 'tree') {
      dx = x - obstacle.x; dz = z - obstacle.z; limit += obstacle.radius;
    } else {
      const minX=obstacle.x-obstacle.halfWidth, maxX=obstacle.x+obstacle.halfWidth;
      const minZ=obstacle.z-obstacle.halfDepth, maxZ=obstacle.z+obstacle.halfDepth;
      dx=x-Math.max(minX,Math.min(maxX,x)); dz=z-Math.max(minZ,Math.min(maxZ,z));
      if (dx === 0 && dz === 0) {
        const exits = [[x-minX,-1,0],[maxX-x,1,0],[z-minZ,0,-1],[maxZ-z,0,1]].sort((a,b)=>a[0]-b[0]);
        state.x += exits[0][1]*(exits[0][0]+RADIUS+.001);
        state.z += exits[0][2]*(exits[0][0]+RADIUS+.001);
        return true;
      }
    }
    const length = Math.hypot(dx,dz);
    if (length >= limit) { return false; }
    if (length < .000001) { dx=1; dz=0; }
    const normalLength = Math.hypot(dx,dz);
    state.x += dx/normalLength*(limit-length+.001);
    state.z += dz/normalLength*(limit-length+.001);
    return true;
  }
  function updateWater(state,dt) {
    const firstWheelX=state.x-Math.abs(Math.sin(state.heading))*1.25-.2;
    const target=Math.min(3,Math.max(0,(-6.15-firstWheelX)*.6));
    // 沿缓坡入水：下沉速度有限，不能刚碰到海面就瞬间死亡。
    if (state.y<=.06 || state.waterDepth>.01) {
      const change=target-state.waterDepth;
      state.waterDepth+=Math.max(-1.6*dt,Math.min(.85*dt,change));
    }
    if (state.waterDepth<.0001) { state.waterDepth=0; }
    state.wet=firstWheelX<-6.15 && state.y-state.waterDepth<=.06;
    if (state.waterDepth-state.y>=2.05) {
      state.mode='drowning'; state.deathTime=0; state.speed=0; state.vy=0;
    }
  }
  function impactVisual(state) {
    const p=state.crashDuration>0?state.crashTime/state.crashDuration:1;
    if (p>=1 || state.mode!=='riding') { return {roll:0,pitch:0,lift:0,shake:0}; }
    const envelope=p<.28?Math.sin(p/.28*Math.PI/2):p<.55?1:Math.pow((1-p)/.45,1.5);
    const strength=state.impactStrength, bounce=Math.sin(p*Math.PI);
    const roll=state.crashSide*(.12+1.85*strength)*envelope;
    const pitch=state.crashForward*(.06+.65*strength)*bounce;
    return {roll,pitch,lift:Math.abs(Math.sin(roll))*.42+Math.abs(Math.sin(pitch))*.45+(.02+.30*strength)*bounce,
      shake:strength*strength*envelope*.10};
  }
  function step(state, input, delta) {
    const dt = Math.max(0, Math.min(delta,.1));
    state.hitTime = Math.max(0,state.hitTime-dt);
    if (state.mode !== 'riding') {
      state.deathTime += dt;
      if (state.deathTime >= 2.6) { state.mode = 'dead'; }
      return;
    }
    if (state.crashTime < state.crashDuration) {
      state.crashTime=Math.min(state.crashDuration,state.crashTime+dt);
      state.speed=0; state.vy-=12*dt; state.y=Math.max(0,state.y+state.vy*dt);
      if (state.y===0) { state.vy=0; }
      updateWater(state,dt);
      return;
    }
    const throttle = input.throttle || 0;
    const immersion=Math.max(0,state.waterDepth-state.y);
    state.speed = throttle ? state.speed+throttle*4.4*dt/(1+immersion*1.2) : state.speed*Math.exp(-.7*dt);
    state.speed*=Math.exp(-immersion*.8*dt);
    if (input.brake) { state.speed *= Math.exp(-8*dt); }
    state.speed = Math.max(-3,Math.min(9,state.speed));
    if (Math.abs(state.speed)<.015) { state.speed=0; }
    state.steer += ((input.turn||0)-state.steer)*Math.min(1,dt*9);
    state.heading += state.steer*state.speed*.32*dt;
    state.vy -= 12*dt; state.y += state.vy*dt;
    if (state.y <= 0) { state.y=0; state.vy=0; }
    const beforeX=state.x, beforeZ=state.z;
    // 分小步移动，避免高速时越过较细的树干。
    const steps=Math.max(1,Math.ceil(Math.abs(state.speed)*dt/.10));
    const dx=Math.sin(state.heading)*state.speed*dt/steps;
    const dz=Math.cos(state.heading)*state.speed*dt/steps;
    const nearby=obstacles(state.z);
    // 在归零速度之前保存撞击瞬间的速度，不能用停车后的速度驱动动画。
    const incomingSpeed=state.speed;
    let collisionNormal=[0,0];
    let collision=false;
    for (let i=0;i<steps;i++) {
      state.x+=dx; state.z+=dz;
      for (let pass=0;pass<3;pass++) {
        for (const obstacle of nearby) {
          if (Math.abs(obstacle.x-state.x)>4 || Math.abs(obstacle.z-state.z)>4) { continue; }
          for (const offset of BODY_OFFSETS) {
            const oldX=state.x,oldZ=state.z;
            if (pushOut(state,obstacle,offset)) {
              if (!collision) { collisionNormal=[state.x-oldX,state.z-oldZ]; }
              collision=true; state.hitKind=obstacle.kind; state.hitTime=.6;
            }
          }
        }
      }
      if (collision) { break; }
    }
    updateWater(state,dt);
    if (collision) {
      if (Math.abs(incomingSpeed)>.30 && state.mode==='riding') {
        state.impactSpeed=Math.abs(incomingSpeed);
        state.impactStrength=Math.pow(Math.min(state.impactSpeed/9,1),1.3);
        state.crashTime=0; state.crashDuration=.45+1.5*state.impactStrength;
        state.crashForward=Math.sign(incomingSpeed)||1;
        const side=Math.cos(state.heading)*collisionNormal[0]-Math.sin(state.heading)*collisionNormal[1];
        state.crashSide=Math.abs(side)>.0001?Math.sign(side):(state.hitKind==='tree'?1:-1);
      }
      state.speed=0;
    }
    const traveled=Math.hypot(state.x-beforeX,state.z-beforeZ);
    state.distance+=traveled; state.phase+=Math.sign(state.speed||throttle)*traveled/.61;
  }
  const api={createState,obstacles,jump,step,impactVisual};
  if (typeof module!=='undefined' && module.exports) { module.exports=api; }
  else { root.CrabPhysics=api; }
})(typeof globalThis!=='undefined'?globalThis:this);
