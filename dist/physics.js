/* 游戏物理和场景障碍物共用坐标，可在浏览器和 Node 中运行。 */
(function (root) {
  'use strict';
  const RADIUS = .60;
  const BODY_OFFSETS = [-1.25, -.625, 0, .625, 1.25];
  function createState() {
    return { x:0, z:0, heading:0, speed:0, distance:0, phase:0, steer:0,
      y:0, vy:0, mode:'riding', deathTime:0, hitTime:0, hitKind:'' };
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
    if (state.mode !== 'riding' || state.y > .001 || state.vy !== 0) { return false; }
    state.vy = 5.6;
    return true;
  }
  function pushOut(state, obstacle, offset) {
    if (state.y >= obstacle.height) { return false; }
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
  function entersWater(state) {
    const firstWheelX = state.x - Math.abs(Math.sin(state.heading))*1.25;
    return firstWheelX - .2 < -6.15 && state.y <= .06 && state.vy <= 0;
  }
  function step(state, input, delta) {
    const dt = Math.max(0, Math.min(delta,.1));
    state.hitTime = Math.max(0,state.hitTime-dt);
    if (state.mode !== 'riding') {
      state.deathTime += dt;
      if (state.deathTime >= 2.6) { state.mode = 'dead'; }
      return;
    }
    const throttle = input.throttle || 0;
    state.speed = throttle ? state.speed+throttle*4.4*dt : state.speed*Math.exp(-.7*dt);
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
    let collision=false;
    for (let i=0;i<steps;i++) {
      state.x+=dx; state.z+=dz;
      for (let pass=0;pass<3;pass++) {
        for (const obstacle of nearby) {
          if (Math.abs(obstacle.x-state.x)>4 || Math.abs(obstacle.z-state.z)>4) { continue; }
          for (const offset of BODY_OFFSETS) {
            if (pushOut(state,obstacle,offset)) {
              collision=true; state.hitKind=obstacle.kind; state.hitTime=.6;
            }
          }
        }
      }
      if (entersWater(state)) {
        state.mode='drowning'; state.deathTime=0; state.speed=0; state.vy=0;
        break;
      }
    }
    if (collision) { state.speed=0; }
    const traveled=Math.hypot(state.x-beforeX,state.z-beforeZ);
    state.distance+=traveled; state.phase+=Math.sign(state.speed||throttle)*traveled/.61;
  }
  const api={createState,obstacles,jump,step};
  if (typeof module!=='undefined' && module.exports) { module.exports=api; }
  else { root.CrabPhysics=api; }
})(typeof globalThis!=='undefined'?globalThis:this);
