/* ==================================================================
   PETS
   Vùng đi được, khởi tạo thú, di chuyển (tự đi, ảnh động, bàn phím)
   ================================================================== */

function inPoly(px, py, poly) {
  let inside = false;
  for (let i=0, j=poly.length-1; i<poly.length; j=i++) {
    const [xi,yi]=poly[i], [xj,yj]=poly[j];
    if (((yi>py)!==(yj>py)) && (px < (xj-xi)*(py-yi)/(yj-yi)+xi)) inside=!inside;
  }
  return inside;
}
function walkable(x, y) {
  if (!inPoly(x, y, WALK_POLY)) return false;
  for (const z of FORBIDDEN) {
    if (z.type==='rect') { if (x>=z.x && x<=z.x+z.w && y>=z.y && y<=z.y+z.h) return false; }
    else { if ((x-z.cx)**2+(y-z.cy)**2 < z.r*z.r) return false; }
  }
  return !blockedByItem(x, y);
}
let PETS = [];
function spawnPos(){
  for(let i=0;i<300;i++){
    const x = 200+Math.random()*(CW-436), y = 300+Math.random()*600;
    if(walkable(x,y)) return {x,y};
  }
  return {x:CW/2,y:CH/2};
}

function initPets(){
  PETS = PET_DEF.map((def, idx) => {
    const saved = state.petsData[idx] || {};
    const sp = (saved.x && saved.y) ? {x:saved.x, y:saved.y} : spawnPos();
    return {
      def, x:sp.x, y:sp.y, vx:0, vy:0, phase:Math.random()*7, nextTurn:0, idleUntil:0, facingLeft:false,
      hunger:saved.hunger??100, happy:saved.happy??100, energy:saved.energy??100, selected:false,
      animFrame:0, animTime:0   // dùng cho animation đa frame
    };
  });
}
function pSize(y){ return PET_BASE_SIZE; }
// ---- Thú đi bộ: mượt, chân khớp quãng đường ----
function updateWalker(p, t, dt){
  const depth = pSize(p.y) / 100;                 // = 1 (cỡ cố định)
  if(p.tvx===undefined){ p.tvx=0; p.tvy=0; p.animPhase=0; }
  const idle = t < p.idleUntil;
  if(!idle && t > p.nextTurn){
    if(Math.random() < .3){ p.idleUntil = t + 1.2 + Math.random()*2.4; p.tvx = 0; p.tvy = 0; }
    else {
      const dir = Math.random()<.5 ? -1 : 1;
      const a = (Math.random()-.5) * .9;          // gần như đi ngang, hơi chéo
      const sp = (34 + Math.random()*24) * (p.def.speedMul||1);
      p.tvx = Math.cos(a)*sp*dir; p.tvy = Math.sin(a)*sp*.5;
    }
    p.nextTurn = t + 2 + Math.random()*3.5;
  }
  if(idle){ p.tvx = 0; p.tvy = 0; }
  const k = 1 - Math.exp(-dt*3);                  // tăng/giảm tốc êm
  if(p.manual){ p.vx = p.tvx; p.vy = p.tvy; }   // đang điều khiển bằng phím: đi đều, không tăng tốc dần
  else { p.vx += (p.tvx - p.vx)*k; p.vy += (p.tvy - p.vy)*k; }
  const nx = p.x + p.vx*depth*dt, ny = p.y + p.vy*depth*dt;
  if(!walkable(p.x,p.y) || [walkable(nx,ny),walkable(nx-15,ny),walkable(nx+15,ny)].filter(Boolean).length >= 2){ p.x = nx; p.y = ny; }
  else { p.tvx = -p.tvx || -30; p.tvy = 0; p.vx *= .3; p.vy = 0; p.nextTurn = t + 1.5; }
  if(Math.abs(p.vx) > 4) p.facingLeft = p.vx < 0;  // chỉ quay đầu khi thật sự đổi hướng
  // bước chân tỉ lệ với quãng đường -> không bị trượt
  const speed = Math.hypot(p.vx, p.vy) * depth;
  const img = IMGS[p.def.imgKey.replace('_anim','_')+'1'];
  const ratio = (img && img.naturalWidth) ? img.naturalWidth/img.naturalHeight : 1;
  const cycleLen = pSize(p.y) * (p.def.scale||1) * ratio * .85 * (p.def.stride||1);
  if(speed > 5){ p.animPhase = (p.animPhase + speed*dt/cycleLen) % 1; p.animFrame = Math.floor(p.animPhase * p.def.animFrames) % p.def.animFrames; p.moving = true; }
  else { p.animPhase = 0; p.animFrame = 0; p.moving = false; }
}
function updatePet(p, t, dt){
  // hướng đi: ưu tiên phím WASD/mũi tên; nếu không có thì đi tới điểm vừa bấm (p.target)
  let kd = (p.selected && !DECOR.active) ? keyDir() : {x:0,y:0};
  if(kd.x || kd.y){ p.target = null; }
  else if(p.target){
    const dx = p.target.x - p.x, dy = p.target.y - p.y, dist = Math.hypot(dx, dy);
    const spd = (p.def.walker ? KEY_SPEED_WALK : KEY_SPEED_OTHER) * (p.def.speedMul||1);
    if(dist <= Math.max(4, spd*dt)){ p.target = null; }                       // đã tới nơi
    else { kd = {x:dx/dist, y:dy/dist}; }
  }
  if(kd.x || kd.y){
    const L = Math.hypot(kd.x, kd.y), sp = (p.def.walker ? KEY_SPEED_WALK : KEY_SPEED_OTHER) * (p.def.speedMul||1);
    p.manual = true; p.idleUntil = 0; p.nextTurn = t + .5;
    if(p.def.walker){ p.tvx = kd.x/L*sp; p.tvy = kd.y/L*sp; }
    else { p.vx = kd.x/L*sp; p.vy = kd.y/L*sp; if(kd.x) p.facingLeft = kd.x < 0; }
  } else if(p.manual){
    p.manual = false; p.idleUntil = t + 1.2;
    if(p.def.walker){ p.tvx = 0; p.tvy = 0; } else { p.vx = 0; p.vy = 0; }
  }
  // đang đi tới điểm bấm mà bị vật cản chặn đứng -> bỏ điểm đó, khỏi đứng đẩy mãi
  if(p.target){
    const lx = p._lx ?? p.x, ly = p._ly ?? p.y;
    p._stuck = (Math.hypot(p.x-lx, p.y-ly) < 0.15) ? (p._stuck||0) + dt : 0;
    if(p._stuck > .7){ p.target = null; p._stuck = 0; }
  } else p._stuck = 0;
  p._lx = p.x; p._ly = p.y;
  if(p.def.walker){ updateWalker(p, t, dt); return; }
  if(t<p.idleUntil){p.vx*=.85;p.vy*=.85;return;}
  if(t>p.nextTurn){
    if(Math.random()<.25){ p.idleUntil=t+1+Math.random()*2; p.vx=0;p.vy=0; }
    else {
      const a=Math.random()*Math.PI*2, sp=45+Math.random()*50;
      p.vx=Math.cos(a)*sp; p.vy=Math.sin(a)*sp*.35; p.facingLeft=p.vx<0;
    }
    p.nextTurn=t+1.5+Math.random()*3;
  }
  const STEPS=4;
  for(let s=0;s<STEPS;s++){
    const nx=p.x+p.vx*(dt/STEPS), ny=p.y+p.vy*(dt/STEPS);
    if(!walkable(p.x,p.y) || [walkable(nx,ny),walkable(nx-15,ny),walkable(nx+15,ny)].filter(Boolean).length>=2){ p.x=nx;p.y=ny; }
    else{ const a=Math.random()*Math.PI*2; p.vx=Math.cos(a)*50; p.vy=Math.sin(a)*20; p.facingLeft=p.vx<0; p.nextTurn=t+.5; break; }
  }
  // Cập nhật frame animation (chỉ chạy khi đang di chuyển)
  if(p.def.animFrames){
    const isMoving = Math.abs(p.vx)>3 || Math.abs(p.vy)>3;
    if(isMoving){
      p.animTime += dt;
      const frameDur = 1 / (p.def.fps || 10);
      if(p.animTime >= frameDur){
        p.animTime -= frameDur;
        p.animFrame = (p.animFrame + 1) % p.def.animFrames;
      }
    } else {
      p.animFrame = 0;  // Reset về frame đứng yên
      p.animTime = 0;
    }
  }
}
