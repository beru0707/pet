/* ==================================================================
   BATTLE – ĐỊCH + SÁT THƯƠNG
   Nạp ảnh địch, sinh địch, tìm mục tiêu, trừ máu địch / pet, nổ lan của quả cầu lửa, AI của địch (chui đi -> trồi lên -> cắn -> lặn).
   ================================================================== */

// Trả về Promise (chỉ nạp 1 lần, các lần sau dùng lại kết quả)
function btLoadEnemies(){
  if(BT.enemyLoad) return BT.enemyLoad;
  const jobs = [];
  Object.entries(ENEMY_TYPES).forEach(([k,T])=>{
    const set = BT.frames[k] = {};
    Object.entries(T.sheets || {}).forEach(([name, spec]) => jobs.push(loadSheet(spec).then(fr => { set[name] = fr || false; if(!fr) console.warn('[BATTLE] không đọc được', spec.src, '– dùng hình tạm'); })));
  });
  return BT.enemyLoad = Promise.all(jobs);
}

// ============ ĐỊCH ============
function btSpawnEnemy(typeKey, hpMul){
  const T = ENEMY_TYPES[typeKey]; if(!T) return;
  const side = Math.floor(Math.random()*3); let x, y;
  if(side === 0){ x = 70; y = 220 + Math.random()*680; } else if(side === 1){ x = CW-70; y = 220 + Math.random()*680; } else { x = 200 + Math.random()*(CW-400); y = 190; }
  const hp = Math.round(T.hp * hpMul);
  BT.enemies.push({type:typeKey, T, x, y, hp, max:hp, st:'travel', tm:0, cool:1, face:1, seed:Math.random()*10, flash:0, die:0, dead:false, hit:false, born:0});
}
function btNearestPet(x, y, maxD){
  let best = null, bd = maxD ?? 1e9;
  for(const p of PETS){ if(p.map !== BT.map || p.bdead) continue; const d = Math.hypot(p.x-x, p.y-y); if(d < bd){ bd = d; best = p; } }
  return best;
}
function btNearestEnemy(x, y, maxD){
  let best = null, bd = maxD;
  for(const e of BT.enemies){ if(e.die) continue; const d = Math.hypot(e.x-x, e.y-y); if(d < bd){ bd = d; best = e; } }
  return best;
}
function btFx(x, y, txt, col){ BT.fx.push({x, y, txt, col, life:.9, max:.9}); }
function btHurtEnemy(e, dmg, pet){
  if(e.die) return;
  e.hp -= dmg; e.flash = .12; btFx(e.x, e.y - e.T.h*.7, '-' + Math.round(dmg), '#fff');
  if(pet && BT.stat[pet.def.name]) BT.stat[pet.def.name].dmg += dmg;
  if(e.hp <= 0){ e.hp = 0; e.die = .6; BT.kills++; }
}
function btHurtPet(p, dmg, t){
  if(p.bdead) return;
  p.bhp -= dmg; p.btFlash = t + .25; btFx(p.x, p.y - 90, '-' + Math.round(dmg), '#ff6b6b');
  if(p.bhp <= 0){ p.bhp = 0; p.bdead = true; p.map = null; p.isAttacking = false; p.selected = false; closePetPanel(); btFx(p.x, p.y - 60, '💀', '#fff'); }
}
// Móc vào spawnExplosion (pets.js): quả cầu lửa nổ -> gây sát thương lan cho địch trong bán kính
function battleOnBlast(x, y, map, def, kind = 'attack'){
  if(BT.phase !== 'fight' || map !== BT.map || !def) return;
  const s = btStat(def), pet = {def};
  const R = kind === 'attack' ? BATTLE_CFG.blastRadius : (def[kind+'Range'] ?? BATTLE_CFG.blastRadius);   // skill: range = bán kính nổ
  const D = s.dmg * (kind === 'attack' ? 1 : (def[kind+'Dmg'] ?? 2));                                   // skill: dmg = hệ số nhân
  BT.enemies.forEach(e => { if(!e.die && Math.hypot(e.x-x, e.y-y) <= R) btHurtEnemy(e, D, pet); });
}

function btUpdateEnemy(e, t, dt){
  if(e.die){ e.die -= dt; if(e.die <= 0) e.dead = true; return; }
  e.born += dt; e.flash = Math.max(0, e.flash - dt);
  const T = e.T, A = T.anim, tg = btNearestPet(e.x, e.y); if(!tg) return;
  const dx = tg.x - e.x, dy = tg.y - e.y, d = Math.hypot(dx, dy) || 1;
  e.tm += dt;
  if(e.st === 'travel'){
    e.cool -= dt;
    const w = Math.sin(t*2.5 + e.seed) * .7;                       // lượn quanh
    e.x += (dx/d - dy/d*w) * T.speed * dt; e.y += (dy/d + dx/d*w) * T.speed * dt * .6;
    e.x = Math.max(60, Math.min(CW-60, e.x)); e.y = Math.max(160, Math.min(980, e.y));
    if(Math.abs(dx) > 4) e.face = dx < 0 ? -1 : 1;
    if(d < T.range*.9 && e.cool <= 0){ e.st = 'emerge'; e.tm = 0; }
  } else {
    if(Math.abs(dx) > 4) e.face = dx < 0 ? -1 : 1;
    const a = A[e.st], n = a.seq.length, fi = Math.floor(e.tm * a.fps);
    if(e.st === 'attack' && !e.hit && fi >= a.hitAt){ e.hit = true; if(d < T.range*1.4) btHurtPet(tg, T.dmg, t); }
    if(fi >= n){
      if(e.st === 'emerge'){ e.st = 'attack'; e.hit = false; }
      else if(e.st === 'attack'){ e.st = 'dive'; }
      else { e.st = 'travel'; e.cool = T.cd; }
      e.tm = 0;
    }
  }
}
