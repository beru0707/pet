/* ==================================================================
   BATTLE – ĐỊCH + SÁT THƯƠNG
   Nạp ảnh địch, sinh địch, tìm mục tiêu, trừ máu địch / pet, nổ lan của quả cầu lửa,
   AI của địch (đi tới pet gần nhất -> tấn công / ném đá -> nghỉ), đạn của quái bắn xa.
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
  // st: move (đứng / đi / chạy, xem gait) · attack · hurt.  Chết: die > 0 (đếm ngược), dk = kiểu chết (dead | dead2)
  BT.enemies.push({type:typeKey, T, x, y, hp, max:hp, st:'move', gait:'walk', tm:0, cool:1, face:x < CW/2 ? 1 : -1, seed:Math.random()*10, flash:0, hurtCd:0, die:0, dieMax:0, dk:'dead', dead:false, hit:false, born:0});
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
  const T = e.T;
  e.hp -= dmg; e.flash = .12; btFx(e.x, e.y - T.bar, '-' + Math.round(dmg), '#fff');
  if(pet && BT.stat[pet.def.name]) BT.stat[pet.def.name].dmg += dmg;
  if(e.hp <= 0){
    e.hp = 0; BT.kills++;
    e.dk = (T.anim.dead2 && Math.random() < .5) ? 'dead2' : 'dead';   // 2 kiểu ngã, chọn ngẫu nhiên
    const D = T.anim[e.dk]; e.dieMax = e.die = D.n / D.fps + 1;       // phát hết hoạt ảnh chết, nằm thêm 0.5s rồi mờ dần 0.5s
    e.st = 'dead';
  } else if(e.st === 'move' && e.hurtCd <= 0 && T.anim.hurt){   // giật mình (không ngắt đòn đang tung, và tối đa 1 lần / 1.2s để không bị khóa cứng)
    e.st = 'hurt'; e.tm = 0; e.hurtCd = 1.2;
  }
}
function btHurtPet(p, dmg, t){
  if(p.bdead) return;
  p.bhp -= dmg; p.btFlash = t + .25;
  p.hurtAt = t; p.hurtKind = (p.def.ex && p.def.ex.dizzy && p.bhp > 0 && p.bhp < p.bmax * .3) ? 'dizzy' : 'hurt';   // máu thấp -> choáng btFx(p.x, p.y - 90, '-' + Math.round(dmg), '#ff6b6b');
  if(p.bhp <= 0){ p.bhp = 0; p.bdead = true; p.deadAt = t; p.isAttacking = false; p.selected = false; btFx(p.x, p.y - 60, '💀', '#fff'); }
}
// Móc vào spawnExplosion (pets.js): quả cầu lửa nổ -> gây sát thương lan cho địch trong bán kính
function battleOnBlast(x, y, map, def, kind = 'attack'){
  if(BT.phase !== 'fight' || map !== BT.map || !def) return;
  const s = btStat(def), pet = {def};
  const R = kind === 'attack' ? BATTLE_CFG.blastRadius : (def[kind+'Range'] ?? BATTLE_CFG.blastRadius);   // skill: range = bán kính nổ
  const D = s.dmg * (kind === 'attack' ? 1 : (def[kind+'Dmg'] ?? 2));                                   // skill: dmg = hệ số nhân
  BT.enemies.forEach(e => { if(!e.die && Math.hypot(e.x-x, e.y-y) <= R) btHurtEnemy(e, D, pet); });
}

// ============ ĐẠN CỦA QUÁI BẮN XA (Skeleton ném đá) ============
// Bay thẳng tới chỗ pet đứng lúc ném (không đuổi theo): pet kịp chạy đi thì ném trượt; trúng pet nào trên đường thì pet đó chịu.
function btEnemyShoot(e, tg){
  const P = e.T.proj, sx = e.x + e.face * P.dx, sy = e.y - P.dy, tx = tg.x, ty = tg.y - 40, d = Math.hypot(tx - sx, ty - sy) || 1;
  BT.shots.push({x:sx, y:sy, vx:(tx - sx)/d * P.speed, vy:(ty - sy)/d * P.speed, rot:0, life:P.life ?? 2, dmg:e.T.dmg, type:e.type, P});
}
function btUpdateShots(t, dt){
  for(const s of BT.shots){
    s.x += s.vx * dt; s.y += s.vy * dt; s.rot += (s.P.spin || 0) * dt; s.life -= dt;
    for(const p of PETS){
      if(p.map !== BT.map || p.bdead) continue;
      if(Math.hypot(s.x - p.x, s.y - (p.y - 40)) < 36){ btHurtPet(p, s.dmg, t); s.life = 0; break; }
    }
    if(s.x < -60 || s.x > CW + 60 || s.y < -60 || s.y > CH + 60) s.life = 0;
  }
  BT.shots = BT.shots.filter(s => s.life > 0);
}

// ============ AI ============
function btUpdateEnemy(e, t, dt){
  if(e.die){ e.die -= dt; if(e.die <= 0) e.dead = true; return; }
  e.born += dt; e.flash = Math.max(0, e.flash - dt); e.hurtCd = Math.max(0, e.hurtCd - dt);
  const T = e.T, A = T.anim, tg = btNearestPet(e.x, e.y); if(!tg) return;
  const dx = tg.x - e.x, dy = tg.y - e.y, d = Math.hypot(dx, dy) || 1;
  e.tm += dt;
  if(e.st === 'hurt'){   // đứng khựng cho tới hết hoạt ảnh giật mình
    if(Math.floor(e.tm * A.hurt.fps) >= A.hurt.n){ e.st = 'move'; e.tm = 0; }
    return;
  }
  if(Math.abs(dx) > 4) e.face = dx < 0 ? -1 : 1;
  if(e.st === 'move'){
    e.cool -= dt;
    const stop = T.stop ?? T.range * .85;
    if(d > stop){   // đi / chạy tới pet gần nhất
      const run = !!A.run && d > T.range * 1.8;
      e.gait = run ? 'run' : 'walk';
      const sp = T.speed * (run ? (T.runMul ?? 1.6) : 1), w = Math.sin(t*2 + e.seed) * .3;   // lượn nhẹ
      e.x += (dx/d - dy/d*w) * sp * dt; e.y += (dy/d + dx/d*w) * sp * dt * .6;
    } else e.gait = 'idle';
    for(const o of BT.enemies){   // đẩy nhau ra để không dính thành một cục
      if(o === e || o.die) continue;
      const ox = e.x - o.x, oy = (e.y - o.y) * 1.6, od = Math.hypot(ox, oy);
      if(od > 0 && od < 46){ const k = (46 - od) / 46 * 60 * dt; e.x += ox/od * k; e.y += oy/od * k * .6; }
    }
    e.x = Math.max(60, Math.min(CW-60, e.x)); e.y = Math.max(160, Math.min(980, e.y));
    if(e.cool <= 0 && d <= T.range){ e.st = 'attack'; e.tm = 0; e.hit = false; }
  } else if(e.st === 'attack'){
    const a = A.attack, fi = Math.floor(e.tm * a.fps);
    if(!e.hit && fi >= a.hitAt){
      e.hit = true;
      if(T.proj) btEnemyShoot(e, tg);                                   // bắn xa: tung đạn
      else if(d < T.range * 1.4) btHurtPet(tg, T.dmg, t);               // giáp lá cà: trúng nếu pet vẫn trong tầm
    }
    if(fi >= a.n){ e.st = 'move'; e.tm = 0; e.cool = T.cd; }
  }
}
