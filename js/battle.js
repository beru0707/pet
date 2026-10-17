/* ==================================================================
   BATTLE – chế độ chiến đấu
   Nút "Vào trận" (góc dưới trái) -> chuyển cảnh sang map chiến đấu -> đặt pet -> Bắt đầu
   -> địch lần lượt xuất hiện, tiến về pet và cắn; pet dùng attackSheet đánh trả
   -> hạ hết địch = thắng, bảng tổng kết, quay về map phòng chờ ban đầu.
   Địch + thanh máu vẽ trên 1 canvas phủ lên canvas game (không đụng render.js).
   ================================================================== */

// ============ CẤU HÌNH TRẬN ĐÁNH (chỉnh ở đây) ============
const BATTLE_CFG = {
  map: 'fire',          // id map chiến đấu (trong MAPS)
  maxPets: 5,           // số pet tối đa được đặt
  reward: 60,           // xu thưởng khi thắng
  waveRest: 3,          // giây nghỉ trước mỗi đợt
  hpGrow: 0.25,         // mỗi đợt địch trâu hơn 25%
  blastRadius: 120,     // bán kính nổ của quả cầu lửa (px)
  barDY: 105,           // độ cao thanh máu pet so với chân (nhân với scale của pet)
  waves: [              // mỗi đợt: loại địch (trong ENEMY_TYPES), số lượng, giây giữa 2 con xuất hiện
    {type:'worm', count:3, gap:2.2},
    {type:'worm', count:4, gap:1.8},
    {type:'worm', count:6, gap:1.4},
  ]
};
// Loại địch. h = chiều cao vẽ (px thế giới) · anchor = vị trí "chân" trong khung (0..1 từ trên xuống)
// range = tầm cắn · cd = nghỉ giữa 2 lần cắn · dmg = sát thương mỗi cắn · speed = tốc độ chui đi
// sheets: các sprite sheet của địch (đọc theo lưới cols x rows, đếm từ khung 0).
// anim: mỗi trạng thái chọn sheet + dãy khung + fps. attack.hitAt = khung thứ mấy thì trúng đòn.
//   dive (lặn xuống) -> travel (chui đi) -> emerge (trồi lên) -> attack (cắn) -> dive ...
// Chưa có file ảnh thì địch vẽ tạm bằng khối tròn đỏ.
const range = (a, n) => Array.from({length:n}, (_, i) => a + i);
const ENEMY_TYPES = {
  worm: { name:'Sâu Cát', hp:70, dmg:9, speed:80, h:230, anchor:.86, range:150, cd:1.2,
    sheets: {
      main:   {src:'assets/worm/worm.webp',   cols:6, rows:6, frames:36, max:360},   // 36 khung: 16 lặn + 4 đi + 16 trồi
      attack: {src:'assets/worm/attack.webp', cols:6, rows:6, frames:36, max:360},   // 36 khung tấn công
    },
    anim: {
      dive:   {sheet:'main',   seq:range(0,16),  fps:14, scale: 1},
      travel: {sheet:'main',   seq:range(16,4),  fps:6, scale: 1},
      emerge: {sheet:'main',   seq:range(20,16), fps:14, scale:1},
      attack: {sheet:'attack', seq:range(0,36),  fps:18, hitAt:22, scale:1},
    } }
};
// Chỉ số chiến đấu của pet (không khai = mặc định). range: tầm đánh · cd: giây giữa 2 đòn
const PET_BATTLE_DEFAULT = {hp:100, dmg:12, range:170, cd:1.6};
const PET_BATTLE = {
  'Shibav3_1': {hp:90,  dmg:22, range:650, cd:1.5},   // có fireball: bắn xa, nổ lan
  'Wukong':    {hp:140, dmg:16, range:200, cd:1.4},
  'Wukongv3':  {hp:160, dmg:20, range:230, cd:1.4},
};

// ============ TRẠNG THÁI ============
const BT = { phase:'off', map:null, lobby:null, snap:[], enemies:[], fx:[], frames:{}, stat:{}, kills:0, total:0,
             waveIdx:0, waveState:'rest', spawned:0, nextAt:0, restUntil:0, nowT:0, elapsed:0, drag:null, banner:'', bannerT:0 };
const btStat = def => Object.assign({}, PET_BATTLE_DEFAULT, PET_BATTLE[def.name] || {});

// không lưu game khi đang đánh (tránh ghi đè vị trí pet ở phòng chờ)
(function(){ if(typeof saveGame === 'function'){ const o = saveGame; window.saveGame = function(){ if(BT.phase !== 'off') return; return o.apply(this, arguments); }; } })();

// ============ GIAO DIỆN (tự chèn vào trang) ============
(function(){
  const st = document.createElement('style');
  st.textContent = `
  #bt-open{position:fixed;right:16px;bottom:16px;z-index:30;padding:12px 20px;border:0;border-radius:99px;background:linear-gradient(180deg,#ff7a45,#d9361b);color:#fff;font:700 16px Fredoka,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.45);transition:transform .15s}
  #bt-open:hover{transform:translateY(-2px) scale(1.04)}
  #bt-ov{position:fixed;z-index:6;pointer-events:none;display:none}
  #bt-fade{position:fixed;inset:0;z-index:99990;background:#000;opacity:0;pointer-events:none;transition:opacity .45s}
  #bt-bar{position:fixed;left:50%;bottom:12px;transform:translateX(-50%);z-index:31;display:none;align-items:center;gap:12px;max-width:min(96vw,1000px);padding:10px 14px;border-radius:16px;background:rgba(20,28,16,.9);color:#eaf6d4;font:600 14px Fredoka,sans-serif;box-shadow:0 6px 22px rgba(0,0,0,.5)}
  #bt-bar .bt-t{white-space:nowrap}#bt-bar .bt-t small{display:block;opacity:.75;font-weight:500}
  #bt-list{display:flex;gap:8px;overflow-x:auto;padding:4px 2px;max-width:60vw}
  .bt-card{flex:0 0 auto;width:68px;text-align:center;padding:6px 4px;border-radius:12px;background:#ffffff14;border:2px solid transparent;cursor:grab;user-select:none;touch-action:none}
  .bt-card.on{border-color:#7bd34a;background:#7bd34a26}
  .bt-card canvas,.bt-card img{width:48px;height:48px;object-fit:contain;pointer-events:none}
  .bt-card b{display:block;font-size:11px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .bt-btn{border:0;border-radius:99px;padding:10px 18px;font:700 15px Fredoka,sans-serif;cursor:pointer;color:#fff}
  #bt-go{background:linear-gradient(180deg,#6fd13e,#3d9a1e)}#bt-go[disabled]{opacity:.5;cursor:default}
  #bt-quit{background:#ffffff26}
  #bt-hud{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:31;display:none;padding:8px 20px;border-radius:99px;background:rgba(20,28,16,.85);color:#fff;font:700 16px Fredoka,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.4);white-space:nowrap}
  #bt-banner{position:fixed;top:30%;left:50%;transform:translate(-50%,-50%);z-index:31;display:none;color:#fff;font:700 54px Fredoka,sans-serif;text-shadow:0 4px 14px rgba(0,0,0,.7);pointer-events:none}
  #bt-res{position:fixed;inset:0;z-index:99980;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55)}
  #bt-res .card{min-width:min(92vw,420px);padding:24px 28px;border-radius:20px;background:#1b2814;color:#eaf6d4;font:600 16px Fredoka,sans-serif;box-shadow:0 10px 40px rgba(0,0,0,.6);text-align:center}
  #bt-res h2{margin:0 0 12px;font-size:32px}
  #bt-res table{width:100%;margin:12px 0 18px;border-collapse:collapse;font-size:14px}
  #bt-res td,#bt-res th{padding:4px 6px;text-align:right}#bt-res td:first-child,#bt-res th:first-child{text-align:left}
  #bt-res tr+tr td{border-top:1px solid #ffffff1a}
  `;
  document.head.appendChild(st);
  const mk = (tag, id, html) => { const d = document.createElement(tag); d.id = id; if(html) d.innerHTML = html; document.body.appendChild(d); return d; };
  mk('button','bt-open','⚔️ Vào trận');
  mk('canvas','bt-ov'); mk('div','bt-fade'); mk('div','bt-hud'); mk('div','bt-banner'); mk('div','bt-res');
  mk('div','bt-bar','<div class="bt-t">⚔️ Chuẩn bị<small id="bt-sub"></small></div><div id="bt-list"></div><button class="bt-btn" id="bt-go">Bắt đầu</button><button class="bt-btn" id="bt-quit">Thoát</button>');
})();
const $b = id => document.getElementById(id);
const OV = $b('bt-ov'), oc = OV.getContext('2d');

function btFade(cb){
  const f = $b('bt-fade'); f.style.opacity = 1;
  setTimeout(()=>{ try{ cb(); }catch(e){ console.error('[battle]', e); } setTimeout(()=>{ f.style.opacity = 0; }, 80); }, 480);
}

// ============ VÀO TRẬN / CHUẨN BỊ ============
const btPlaced = () => PETS.filter(p => p.map === BT.map);
function btLoadEnemies(){
  Object.entries(ENEMY_TYPES).forEach(([k,T])=>{
    if(BT.frames[k] !== undefined) return;
    const set = BT.frames[k] = {};
    Object.entries(T.sheets || {}).forEach(([name, spec]) => loadSheet(spec).then(fr => { set[name] = fr || false; if(!fr) console.warn('[BATTLE] không đọc được', spec.src, '– dùng hình tạm'); }));
  });
}
function btOpen(){
  if(BT.phase !== 'off' || (typeof PETS === 'undefined') || !PETS.length) return;
  BT.phase = 'entering';
  if(MENU.open) setDecor(false);
  btFade(()=>{
    BT.map = MAPDATA[BATTLE_CFG.map] ? BATTLE_CFG.map : MAPS[MAPS.length-1].id;
    BT.lobby = ACTIVE_MAP;
    BT.snap = PETS.map(p => ({p, map:p.map, x:p.x, y:p.y}));
    if(VIEW.overview) setOverview(false);
    PETS.forEach(p => { p.map = null; p.selected = false; p.target = null; p.isAttacking = false; p.hasFired = false; p.bdead = false; p._ready = null; });
    closePetPanel();
    PROJECTILES.length = 0; EXPLOSIONS.length = 0;
    BT.enemies = []; BT.fx = [];
    setActiveMap(BT.map);
    BT.phase = 'prep';
    btLoadEnemies();
    $b('bt-open').style.display = 'none'; $b('bt-bar').style.display = 'flex';
    // nạp ảnh đứng yên của mọi pet để có hình thẻ
    runPool(PETS.map(p => () => loadPetLook(p.def.name).then(btRenderBar)), 2);
    btRenderBar();
  });
}
function btReady(p){ return p._ready || (p._ready = loadPetWalk(p.def.name).then(()=>loadPetLook(p.def.name)).then(()=>loadPetSkills(p.def.name))); }
function btPlace(p, x, y){
  if(BT.phase !== 'prep') return;
  if(!p.map && btPlaced().length >= BATTLE_CFG.maxPets){ toast('Tối đa ' + BATTLE_CFG.maxPets + ' pet'); return; }
  placePetAt(p, x, y, BT.map); btReady(p).then(btRenderBar); btRenderBar();
}
function btRenderBar(){
  if(BT.phase !== 'prep' || BT.drag) return;
  const list = $b('bt-list'); list.innerHTML = '';
  PETS.forEach((p,i)=>{
    const c = document.createElement('div'); c.className = 'bt-card' + (p.map === BT.map ? ' on' : ''); c.dataset.i = i;
    c.appendChild(thumbNode(p.def)); const b = document.createElement('b'); b.textContent = p.def.name; c.appendChild(b);
    list.appendChild(c);
  });
  const n = btPlaced().length;
  $b('bt-sub').textContent = 'Kéo thẻ pet vào map · bấm thẻ để thả / thu hồi (' + n + '/' + BATTLE_CFG.maxPets + ')';
  $b('bt-go').disabled = n === 0;
}
setInterval(()=>{ if(BT.phase === 'prep') btRenderBar(); }, 1200);

$b('bt-open').addEventListener('click', btOpen);
$b('bt-quit').addEventListener('click', ()=>{ if(BT.phase === 'prep') btExit(); });
$b('bt-go').addEventListener('click', btStart);

// kéo thẻ pet thả vào map (giống tab Pet của menu)
$b('bt-list').addEventListener('pointerdown', e=>{
  const c = e.target.closest('.bt-card'); if(!c || BT.phase !== 'prep') return;
  BT.drag = {i:+c.dataset.i, x0:e.clientX, y0:e.clientY, ghost:null, moved:false};
  window.addEventListener('pointermove', btDragMove); window.addEventListener('pointerup', btDragEnd); window.addEventListener('pointercancel', btDragEnd);
});
function btDragMove(e){
  const d = BT.drag; if(!d) return;
  if(!d.moved && Math.hypot(e.clientX-d.x0, e.clientY-d.y0) > 6){ d.moved = true; d.ghost = thumbNode(PETS[d.i].def, 'drag-ghost'); document.body.appendChild(d.ghost); }
  if(d.ghost){ d.ghost.style.left = e.clientX+'px'; d.ghost.style.top = e.clientY+'px'; }
}
function btDragEnd(e){
  window.removeEventListener('pointermove', btDragMove); window.removeEventListener('pointerup', btDragEnd); window.removeEventListener('pointercancel', btDragEnd);
  const d = BT.drag; BT.drag = null; if(!d) return;
  if(d.ghost) d.ghost.remove();
  const p = PETS[d.i];
  if(d.moved){
    if(e.type === 'pointerup' && document.elementFromPoint(e.clientX, e.clientY) === cv){ const pos = scaleXY(e); btPlace(p, pos.x, pos.y); }
    btRenderBar(); return;
  }
  if(p.map === BT.map){ p.map = null; btRenderBar(); }                       // bấm thẻ đã thả = thu hồi
  else { const sp = spawnPosOn(BT.map); btPlace(p, sp.x, sp.y); }
}
function spawnPosOn(m){ const o = SIM_MAP; SIM_MAP = m; const s = spawnPos(); SIM_MAP = o; return s; }

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
function btBanner(txt){ BT.bannerT = 2; const b = $b('bt-banner'); b.textContent = txt; b.style.display = 'block'; }

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
function battleOnBlast(x, y, map, def){
  if(BT.phase !== 'fight' || map !== BT.map || !def) return;
  const s = btStat(def), pet = {def};
  BT.enemies.forEach(e => { if(!e.die && Math.hypot(e.x-x, e.y-y) <= BATTLE_CFG.blastRadius) btHurtEnemy(e, s.dmg, pet); });
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

// ============ VÒNG CẬP NHẬT (gọi từ main.js mỗi khung) ============
function updateBattle(t, dt){
  BT.nowT = t;
  if(BT.phase === 'off'){ if(OV.style.display !== 'none') OV.style.display = 'none'; return; }
  if(BT.bannerT > 0){ BT.bannerT -= dt; if(BT.bannerT <= 0) $b('bt-banner').style.display = 'none'; }
  if(BT.phase === 'prep' || BT.phase === 'fight'){
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
    if(!p.manual && !p.isAttacking && !p.target) p.idleUntil = Math.max(p.idleUntil || 0, t + .3);   // đứng giữ chỗ
    if(p.isAttacking){
      if(!p.btAimed){   // vừa bắt đầu đòn do người chơi bấm: tự quay + ngắm vào địch gần nhất trong tầm
        const e = btNearestEnemy(p.x, p.y, s.range);
        if(e){ p.facingLeft = e.x < p.x; p.target = {x:e.x, y:e.y}; }
        p.btAimed = true;
      }
      if(!p.def.fireball && !p.btHit && p.attackFrame >= Math.floor((p.def.attackAnimFrames || 10)*.5)){   // đòn cận chiến trúng ở giữa hoạt ảnh
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
  if(BT.phase !== 'result' && BT.phase !== 'prep') return;
  BT.phase = 'leaving'; $b('bt-res').style.display = 'none'; $b('bt-bar').style.display = 'none'; $b('bt-hud').style.display = 'none';
  btFade(()=>{
    BT.snap.forEach(s => { const p = s.p; Object.assign(p, {map:s.map, x:s.x, y:s.y, vx:0, vy:0, target:null, isAttacking:false, hasFired:false, attackTime:0, bdead:false, btAimed:false, selected:false, idleUntil:0}); if(p.tvx !== undefined){ p.tvx = 0; p.tvy = 0; } });
    PROJECTILES.length = 0; EXPLOSIONS.length = 0; BT.enemies = []; BT.fx = [];
    setActiveMap(BT.lobby);
    BT.phase = 'off'; $b('bt-open').style.display = '';
    try{ saveGame(); }catch(e){}
    toast('Đã về phòng chờ');
  });
}

// ============ VẼ (canvas phủ lên canvas game) ============
// Thanh máu kiểu khung đá + khe tối + các ô màu chia vạch. kind: 'pet' (xanh lá) | 'enemy' (đỏ -> cam)
const BAR_COLS = { pet:['#1c6e2c','#2f9e3f','#55c84a','#9be45a'], enemy:['#9b1c2c','#cf3a2e','#e8742a','#f6a53a'] };
function btBar(x, y, w, frac, kind){
  const h = Math.round(w*.2), r = h*.3, x0 = x - w/2, N = 8;
  frac = Math.max(0, Math.min(1, frac));
  const rr = (a,b,c,d,e) => { oc.beginPath(); if(oc.roundRect) oc.roundRect(a,b,c,d,e); else oc.rect(a,b,c,d); };
  oc.save();
  oc.fillStyle = '#4a3322'; rr(x0-2.5, y-2.5, w+5, h+5, r+2); oc.fill();                 // viền gỗ ngoài
  oc.fillStyle = '#80848b'; rr(x0, y, w, h, r); oc.fill();                                // khung đá
  oc.strokeStyle = '#2b2c31'; oc.lineWidth = 1.2; oc.stroke();
  oc.fillStyle = 'rgba(255,255,255,.22)'; oc.fillRect(x0+r, y+1, w-2*r, 1.5);            // vệt sáng mép trên
  const m = Math.max(2, h*.22), ix = x0+m, iy = y+m, iw = w-2*m, ih = h-2*m;
  oc.fillStyle = '#14141a'; rr(ix, iy, iw, ih, r*.6); oc.fill();                          // khe tối
  if(frac > 0){
    oc.save(); rr(ix, iy, iw*frac, ih, r*.6); oc.clip();
    const C = BAR_COLS[kind] || BAR_COLS.pet;
    const gx = oc.createLinearGradient(ix, 0, ix+iw, 0);                                   // màu chạy liền từ đầu đến cuối thanh
    C.forEach((c,i) => gx.addColorStop(i/(C.length-1), c));
    oc.fillStyle = gx; oc.fillRect(ix, iy, iw, ih);
    const gy = oc.createLinearGradient(0, iy, 0, iy+ih);                                   // bóng sáng trên, tối dưới
    gy.addColorStop(0, 'rgba(255,255,255,.28)'); gy.addColorStop(.5, 'rgba(255,255,255,0)'); gy.addColorStop(1, 'rgba(0,0,0,.25)');
    oc.fillStyle = gy; oc.fillRect(ix, iy, iw, ih);
    oc.restore();
  }
  oc.restore();
}
function btDraw(t){
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.round(r.width*dpr), h = Math.round(r.height*dpr);
  if(OV.width !== w || OV.height !== h){ OV.width = w; OV.height = h; }
  Object.assign(OV.style, {display:'block', left:r.left+'px', top:r.top+'px', width:r.width+'px', height:r.height+'px'});
  const k = w / CW;
  oc.setTransform(1,0,0,1,0,0); oc.clearRect(0,0,w,h); oc.setTransform(k,0,0,k,0,0);
  if(BT.phase !== 'fight' && BT.phase !== 'result') return;
  // địch (xa -> gần)
  [...BT.enemies].sort((a,b) => a.y - b.y).forEach(e => {
    const T = e.T, A = T.anim[e.st] || T.anim.travel, fr = BT.frames[e.type] && BT.frames[e.type][A.sheet];
    oc.save(); oc.globalAlpha = Math.min(1, e.born*2) * (e.die ? Math.max(0, e.die/.6) : 1);
    oc.translate(e.x, e.y); if(e.face < 0) oc.scale(-1, 1);
    if(e.flash > 0) oc.filter = 'brightness(2.4)';
    if(fr && fr.length){
      const idx = A.seq[Math.min(A.seq.length-1, Math.floor(e.tm * A.fps) % (e.st === 'travel' ? A.seq.length : 1e9))];
      const f = fr[Math.min(fr.length-1, idx)], hh = T.h * (A.scale ?? 1), ww = hh * f.width / f.height;
      oc.drawImage(f, -ww/2, -hh*T.anchor, ww, hh);
    } else {   // hình tạm khi chưa có sprite
      const pulse = 1 + Math.sin(t*6 + e.seed)*.06;
      oc.fillStyle = '#c93b4a'; oc.beginPath(); oc.ellipse(0, -40, 46*pulse, 40*pulse, 0, 0, 7); oc.fill();
      oc.fillStyle = '#fff'; oc.beginPath(); oc.arc(14, -48, 8, 0, 7); oc.fill();
    }
    oc.restore();
    if(!e.die) btBar(e.x, e.y - (e.st === 'travel' ? 70 : T.h*.8), 90, e.hp/e.max, 'enemy');
  });
  // pet: thanh máu 
  PETS.forEach(p => {
    if(p.map !== BT.map || p.bdead || !p.bmax) return;
    const by = p.y - BATTLE_CFG.barDY*(p.def.scale || 1);
    btBar(p.x, by, 84, p.bhp/p.bmax, 'pet');
  });
  // chữ bay
  oc.textAlign = 'center'; oc.font = '700 26px Fredoka, sans-serif'; oc.lineWidth = 5; oc.strokeStyle = 'rgba(0,0,0,.75)';
  BT.fx.forEach(f => { oc.globalAlpha = Math.min(1, f.life/f.max*1.6); oc.strokeText(f.txt, f.x, f.y); oc.fillStyle = f.col; oc.fillText(f.txt, f.x, f.y); });
  oc.globalAlpha = 1;
}
