/* ==================================================================
   BATTLE – DIỄN BIẾN
   Vào trận, bắt đầu, vòng cập nhật mỗi khung (updateBattle: đợt địch, pet, địch), tổng kết, về phòng chờ.
   Cuối file: nối nút bấm với hàm.
   ================================================================== */

function btOpen(){
  if(BT.phase !== 'off' || (typeof PETS === 'undefined') || !PETS.length) return;
  BT.phase = 'entering';
  if(MENU.open) setMenuOpen(false);
  // màn hình chờ (dùng lại makeLoader của phòng chờ): nạp xong map + địch + ảnh MỌI pet rồi mới vào trận
  const L = makeLoader(), bar = L.querySelector('#ld-bar'), txt = L.querySelector('#ld-txt'), pct = L.querySelector('#ld-pct');
  L.firstChild.textContent = '⚔️ Chuẩn bị vào trận';
  btPreload((done, total, label) => {
    const p = Math.round(done / total * 100); bar.style.width = p + '%'; pct.textContent = p + '%'; if(label) txt.textContent = label;
  }).catch(e => console.error('[battle]', e)).then(() => {
    try{ btEnterScene(); }catch(e){ console.error('[battle]', e); }
    txt.textContent = 'Sẵn sàng!'; bar.style.width = '100%'; pct.textContent = '100%';
    L.style.opacity = '0'; setTimeout(() => L.remove(), 450);
  });
}
// đổi sang map chiến đấu (chạy khi màn hình chờ đang che toàn màn hình)
function btEnterScene(){
  BT.map = btMapId();
  BT.lobby = ACTIVE_MAP;
  BT.snap = PETS.map(p => ({p, map:p.map, x:p.x, y:p.y}));
  if(VIEW.overview) setOverview(false);
  PETS.forEach(p => { p.map = null; p.selected = false; p.target = null; p.isAttacking = false; p.hasFired = false; p.bdead = false; });
  closePetPanel();
  PROJECTILES.length = 0; EXPLOSIONS.length = 0;
  BT.enemies = []; BT.fx = [];
  setActiveMap(BT.map);
  BT.phase = 'pick';   // chọn pet trước (pick.js), xong mới sang 'prep'
  $b('bt-open').style.display = 'none';
  btPickShow();
}

// ============ BẮT ĐẦU ============
async function btStart(){
  if(BT.phase !== 'prep') return;
  const pets = btPlaced(); if(!pets.length){ toast('Hãy đặt ít nhất 1 pet'); return; }
  const go = $b('bt-go'); go.disabled = true; go.textContent = 'Đang tải…';
  await Promise.all(pets.map(btReady));
  go.textContent = 'Bắt đầu';
  pets.forEach(p => { const s = btStat(p.def); p.bmax = p.bhp = s.hp; p.bdead = false; p.btNext = 0; p.btHit = false; p.btAimed = false; p.selected = false; p.target = null; });
  BT.snapPlaced = pets.length; BT.stat = {}; pets.forEach(p => BT.stat[p.def.name] = {dmg:0});
  BT.kills = 0; BT.total = BATTLE_CFG.waves.reduce((a,w)=>a+w.count, 0);
  BT.waveIdx = 0; BT.waveState = 'rest'; BT.restUntil = BT.nowT + 1.5; BT.spawned = 0; BT.elapsed = 0; BT.enemies = []; BT.fx = [];
  $b('bt-bar').style.display = 'none'; $b('bt-hud').style.display = 'block';
  BT.phase = 'fight';
  btBanner('Sẵn sàng!');
}

// ============ VÒNG CẬP NHẬT (gọi từ main.js mỗi khung) ============
function updateBattle(t, dt){
  BT.nowT = t;
  if(BT.phase === 'off'){ if(OV.style.display !== 'none') OV.style.display = 'none'; return; }
  if(BT.bannerT > 0){ BT.bannerT -= dt; if(BT.bannerT <= 0) $b('bt-banner').style.display = 'none'; }
  if(BT.phase === 'pick' || BT.phase === 'prep' || BT.phase === 'fight'){
    if(VIEW.overview) setOverview(false);
    if(ACTIVE_MAP !== BT.map) setActiveMap(BT.map);
  }
  if(BT.phase === 'fight') btFight(t, dt);
  BT.fx.forEach(f => { f.life -= dt; f.y -= 40*dt; }); BT.fx = BT.fx.filter(f => f.life > 0);
  btDraw(t);
}
function btFight(t, dt){
  BT.elapsed += dt;
  const W = BATTLE_CFG.waves, alive = BT.enemies.filter(e => !e.die).length;
  // --- đợt địch ---
  if(BT.waveIdx < W.length){
    const w = W[BT.waveIdx];
    if(BT.waveState === 'rest'){
      if(t >= BT.restUntil){ BT.waveState = 'spawn'; BT.spawned = 0; BT.nextAt = t; btBanner('Đợt ' + (BT.waveIdx+1) + ' / ' + W.length); }
    } else if(BT.waveState === 'spawn'){
      if(t >= BT.nextAt && BT.spawned < w.count){ btSpawnEnemy(w.type, 1 + BATTLE_CFG.hpGrow*BT.waveIdx); BT.spawned++; BT.nextAt = t + w.gap; }
      if(BT.spawned >= w.count) BT.waveState = 'clear';
    } else if(BT.waveState === 'clear' && alive === 0){ BT.waveIdx++; BT.waveState = 'rest'; BT.restUntil = t + BATTLE_CFG.waveRest; }
  }
  // --- pet ---
    for(const p of PETS){
    if(p.map !== BT.map || p.bdead) continue;
    const s = btStat(p.def);
    // tự động đánh: pet KHÔNG được chọn tự tìm địch gần nhất, đi tới trong tầm rồi tung đòn (nghỉ giữa 2 đòn = cd)
    if((p.selected || !BT.auto) && p._autoGo){ p.target = null; p._autoGo = false; }   // người chơi chọn pet / tắt tự động: bỏ đường đi tự động
    if(BT.auto && !p.selected && !p.isAttacking && p.def.attackAnimFrames){
      const near = btNearestEnemy(p.x, p.y, 1e9);
      if(near){
        const d = Math.hypot(near.x - p.x, near.y - p.y);
        if(d <= s.range){
          if(p._autoGo){ p.target = null; p._autoGo = false; }
          if(t >= (p.btNext || 0)){ triggerAttack(p); p.btNext = t + s.cd; }
        } else {   // còn xa: đi tới điểm cách địch ~70% tầm đánh
          const k = (d - s.range*.7) / d;
          p.target = {x:p.x + (near.x - p.x)*k, y:p.y + (near.y - p.y)*k}; p._autoGo = true; p.idleUntil = 0; p.nextTurn = 0;
        }
      } else if(p._autoGo){ p.target = null; p._autoGo = false; }
    }
    if(!p.manual && !p.isAttacking && !p.target) p.idleUntil = Math.max(p.idleUntil || 0, t + .3);   // đứng giữ chỗ
    if(p.isAttacking){
      if(!p.btAimed){   // vừa bắt đầu đòn do người chơi bấm: tự quay + ngắm vào địch gần nhất trong tầm
        const kd = p.atkKind || 'attack', e = btNearestEnemy(p.x, p.y, (kd !== 'attack' && p.def[kd+'BallFrames']) ? (p.def[kd+'Reach'] ?? 650) : s.range);
        if(e){ p.facingLeft = e.x < p.x; p.target = {x:e.x, y:e.y}; }
        p.btAimed = true;
      }
      const kind = p.atkKind || 'attack';
      if(kind !== 'attack' && p.def[kind+'BallFrames']){ /* skill có quả cầu: sát thương tính lúc nổ (battleOnBlast) */ }
      else if(kind !== 'attack'){   // skill: sát thương lan quanh pet ở giữa hoạt ảnh (skill1Dmg = hệ số nhân, skill1Range = tầm; mặc định x2 sát thương, tầm x1.3)
        if(!p.btHit && p.attackFrame >= Math.floor((p.def[kind+'AnimFrames'] || 10)*.5)){
          p.btHit = true; const R = p.def[kind+'Range'] ?? s.range*1.3, D = s.dmg * (p.def[kind+'Dmg'] ?? 2);
          BT.enemies.forEach(e => { if(!e.die && Math.hypot(e.x-p.x, e.y-p.y) <= R) btHurtEnemy(e, D, p); });
        }
      } else if(!p.def.fireball && !p.btHit && p.attackFrame >= Math.floor((p.def.attackAnimFrames || 10)*.5)){   // đòn cận chiến trúng ở giữa hoạt ảnh
        p.btHit = true; BT.enemies.forEach(e => { if(!e.die && Math.hypot(e.x-p.x, e.y-p.y) <= s.range) btHurtEnemy(e, s.dmg, p); });
      }
      continue;
    }
    if(p.btAimed){ p.target = null; p.btAimed = false; }
    p.btHit = false;
  }
  // --- địch ---
  BT.enemies.forEach(e => btUpdateEnemy(e, t, dt));
  BT.enemies = BT.enemies.filter(e => !e.dead);
  // --- kết thúc ---
  const left = BT.total - BT.kills, myAlive = btPlaced().filter(p => !p.bdead).length;
  $b('bt-hud').textContent = 'Đợt ' + Math.min(BT.waveIdx+1, W.length) + '/' + W.length + '  ·  Địch còn: ' + left + '  ·  Pet: ' + myAlive + '/' + BT.snapPlaced;
  if(myAlive === 0) btEnd(false);
  else if(BT.waveIdx >= W.length && BT.enemies.length === 0) btEnd(true);
}

// ============ TỔNG KẾT + VỀ PHÒNG CHỜ ============
function btEnd(win){
  BT.phase = 'result'; $b('bt-hud').style.display = 'none';
  const mm = Math.floor(BT.elapsed/60), ss = Math.floor(BT.elapsed%60);
  const reward = win ? BATTLE_CFG.reward : 0;
  if(reward){ state.coins += reward; try{ updateHUD(); }catch(e){} }
  const used = PETS.filter(p => BT.stat[p.def.name] && p.bmax);
  const rows = used.map(p => `<tr><td>${esc(p.def.name)}</td><td>${Math.round(BT.stat[p.def.name].dmg)}</td><td>${p.bdead ? '✖' : Math.round(p.bhp) + '/' + p.bmax}</td></tr>`).join('');
  $b('bt-res').innerHTML = `<div class="card"><h2>${win ? '🏆 Chiến thắng!' : '💀 Thất bại'}</h2>
    <div>⏱ Thời gian: <b>${mm}:${String(ss).padStart(2,'0')}</b></div>
    <div>🪱 Hạ gục: <b>${BT.kills}/${BT.total}</b> địch</div>
    <div>🐾 Pet sống sót: <b>${used.filter(p=>!p.bdead).length}/${used.length}</b></div>
    ${reward ? `<div>🪙 Thưởng: <b>+${reward}</b> xu</div>` : ''}
    <table><tr><th>Pet</th><th>Sát thương</th><th>Máu</th></tr>${rows}</table>
    <button class="bt-btn" id="bt-back" style="background:linear-gradient(180deg,#6fd13e,#3d9a1e)">Về phòng chờ</button></div>`;
  $b('bt-res').style.display = 'flex';
  $b('bt-back').onclick = btExit;
}
function btExit(){
  if(BT.phase !== 'result' && BT.phase !== 'prep' && BT.phase !== 'pick') return;
  BT.phase = 'leaving'; BT.chosen = null; $b('bt-pick').style.display = 'none'; $b('bt-sp').style.display = 'none'; BT.paused = false; $b('bt-res').style.display = 'none'; $b('bt-bar').style.display = 'none'; $b('bt-hud').style.display = 'none';
  btFade(()=>{
    BT.snap.forEach(s => { const p = s.p; Object.assign(p, {map:s.map, x:s.x, y:s.y, vx:0, vy:0, target:null, isAttacking:false, hasFired:false, attackTime:0, bdead:false, btAimed:false, selected:false, idleUntil:0, nextTurn:0, sleepUntil:0}); if(p.tvx !== undefined){ p.tvx = 0; p.tvy = 0; } });
    PROJECTILES.length = 0; EXPLOSIONS.length = 0; BT.enemies = []; BT.fx = [];
    setActiveMap(BT.lobby);
    BT.phase = 'off'; $b('bt-open').style.display = '';
    try{ saveGame(); }catch(e){}
    toast('Đã về phòng chờ');
  });
}

// ============ NỐI NÚT VỚI HÀM ============
$b('bt-open').addEventListener('click', btOpen);
$b('bt-quit').addEventListener('click', ()=>{ if(BT.phase === 'prep') btExit(); });
$b('bt-go').addEventListener('click', btStart);
