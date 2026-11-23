/* ==================================================================
   ASSETS – NẠP THÚ
   Đọc PET_ANIM -> nạp 3 tầng cho từng thú: walk (bắt buộc) -> look (idle) -> skills (attack, fireball, explosion).
   Nạp theo nhu cầu theo map (ensureMap).
   ================================================================== */

// Khai báo ngắn: nếu không ghi, game tự tìm <thư mục thú>/idle.png (ảnh đơn), attack.png cạnh walk.png.
const srcOf = s => s ? (typeof s === 'string' ? s : s.src) : '';
Object.values(PET_ANIM).forEach(c=>{
  c._base = srcOf(c.walkSheet).replace(/\/[^\/]*$/,'');
  c._walkId = srcOf(c.walkSheet).replace(/\.[^.]+$/,'');
});

function applyWalk(petName, imgPrefix, frames, opt){
  frames.forEach((im,i)=>IMGS[imgPrefix+'_'+(i+1)]=im);
  const def=PET_DEF.find(d=>d.name===petName); if(def){ def.animFrames=frames.length; def.imgKey=imgPrefix+'_anim'; def.walker=true; Object.assign(def,opt||{}); }
}
function warnMissing(petName, what, spec){ console.warn('[PET_ANIM] "'+petName+'": không đọc được '+what+' '+srcOf(spec)); }

function loadSkills(key, sheetPath, def, petName) {
    return loadSheet(sheetPath).then(fr => {
        if (fr) {
            def[`${key}Frames`] = fr;
        } else {
            warnMissing(petName, `${key}Sheet`, sheetPath);
        }
    });
}

// ---------- THÚ: nạp 3 tầng: walk (bắt buộc) -> look (idle) -> skills ----------
const PETJOB = {};
const petJob = n => PETJOB[n] || (PETJOB[n] = {});
const petCfg = n => { const c = PET_ANIM[n], def = PET_DEF.find(d=>d.name===n); return (c && def && c.walkSheet) ? {c, def} : null; };
const sv = (s,k) => (s && typeof s === 'object') ? s[k] : undefined;
function petOpts(c){
  return {
    stride: (sv(c.walkSheet,'stride') ?? c.stride) || 1, speedMul: (sv(c.walkSheet,'speed') ?? c.speed) || 1,
    idleFit: sv(c.idleSheet,'fit') ?? c.idleFit, attackFit: sv(c.attackSheet,'fit') ?? c.attackFit,
    idleScale: sv(c.idleSheet,'scale') ?? c.idleScale, walkScale: sv(c.walkSheet,'scale') ?? 1, attackScale: sv(c.attackSheet,'scale') ?? c.attackScale, fireballScale: sv(c.fireballSheet,'scale') ?? 1, explosionScale: sv(c.explosionSheet,'scale') ?? 1,
    idleFps: sv(c.idleSheet,'fps') ?? c.idleFps ?? 12, attackFps: sv(c.attackSheet,'fps') ?? c.attackFps, fireballFps: sv(c.fireballSheet,'fps') ?? 6.67, explosionFps: sv(c.explosionSheet,'fps') ?? 16.7,
    attackFireFrame: sv(c.attackSheet,'fireFrame') ?? c.attackFireFrame,
    idleDX: sv(c.idleSheet,'dx'), idleDY: sv(c.idleSheet,'dy'), attackDX: sv(c.attackSheet,'dx'), attackDY: sv(c.attackSheet,'dy'),
    skill1Scale: sv(c.skill1Sheet,'scale'), skill1Fps: sv(c.skill1Sheet,'fps'), skill1DX: sv(c.skill1Sheet,'dx'), skill1DY: sv(c.skill1Sheet,'dy'), skill1Cd: sv(c.skill1Sheet,'cd'), skill1Dmg: sv(c.skill1Sheet,'dmg'), skill1Range: sv(c.skill1Sheet,'range'), skill1FireFrame: sv(c.skill1Sheet,'fireFrame'), skill1Speed: sv(c.skill1Sheet,'speed'), skill1Reach: sv(c.skill1Sheet,'reach'),
    skill1BallScale: sv(c.skill1BallSheet,'scale') ?? 1, skill1BallFps: sv(c.skill1BallSheet,'fps') ?? 6.67, skill1BlastScale: sv(c.skill1BlastSheet,'scale') ?? 1, skill1BlastFps: sv(c.skill1BlastSheet,'fps') ?? 16.7
  };
}
const refreshPetMenu = () => { if(typeof MENU !== 'undefined' && MENU.open && MENU.tab === 'pets') renderMenu(); };

// Nhân vật 4 hướng: nạp sheet <hướng>-<kind>.webp cho từng hướng vào def[store][hướng]
function loadDirSheets(o, kind, store, fallbackKind){
  const {c, def} = o, spec0 = kind==='walk' ? c.walkSheet : kind==='attack' ? c.attackSheet : c.idleSheet;
  def[store] = def[store] || {};
  return Promise.all(PET_DIRS.map(d => {
    const mk = k => Object.assign({}, spec0, {src: spec0.src.replace(/[^\/]*$/, d+'-'+k+'.webp')});
    const k0 = (fallbackKind && d === 'back') ? fallbackKind : kind;   // hướng back không có blink: dùng thẳng idle
    return loadSheet(mk(k0)).then(fr => fr || (fallbackKind && k0 !== fallbackKind ? loadSheet(mk(fallbackKind)) : null)).then(fr => { if(fr) def[store][d] = fr; else warnMissing(def.name, d+'-'+kind, spec0); });
  }));
}
function loadPetWalk(n){
  const j = petJob(n); if(j.walk) return j.walk;
  const o = petCfg(n); if(!o) return j.walk = Promise.resolve();
  if(o.c.dirs) return j.walk = loadDirSheets(o, 'walk', 'dWalk').then(()=>{
    const W = o.def.dWalk && o.def.dWalk.front;
    if(W){ applyWalk(n, o.c.dirs+'_front_walk', W, petOpts(o.c)); refreshPetMenu(); }
    else warnMissing(n,'walkSheet – thú này sẽ không hiện:',o.c.walkSheet);
  });
  return j.walk = loadSheet(o.c.walkSheet).then(fr=>{
    if(fr){ applyWalk(n, o.c._walkId.replace(/^assets\//,'').replace(/\//g,'_'), fr, petOpts(o.c)); refreshPetMenu(); }
    else warnMissing(n,'walkSheet – thú này sẽ không hiện:',o.c.walkSheet);
  });
}
function loadPetLook(n){
  const j = petJob(n); if(j.look) return j.look;
  const o = petCfg(n); if(!o) return j.look = Promise.resolve();
  const {c, def} = o, base = c._base;
  if(c.dirs) return j.look = loadDirSheets(o, 'blink', 'dIdle', 'idle').then(()=>{
    const I = def.dIdle && def.dIdle.front; if(I){ def.idleFrames = I; def.idleImg = I[0]; }
    refreshPetMenu();
  });
  const idleSpec = c.idleSheet || base+'/idle.png';
  return j.look = Promise.all([
    loadSheet(idleSpec).then(fr=>{ if(fr){ def.idleFrames = fr; def.idleImg = fr[0]; } else if(c.idleSheet) warnMissing(n,'idleSheet',idleSpec); })
  ]).then(refreshPetMenu);
}
function loadPetSkills(n){
  const j = petJob(n); if(j.skills) return j.skills;
  const o = petCfg(n); if(!o) return j.skills = Promise.resolve();
  const {c, def} = o, base = c._base, jobs = [];
  if(c.dirs) return j.skills = loadDirSheets(o, 'attack', 'dAttack').then(()=>{ const A = def.dAttack && def.dAttack.front; if(A) def.attackAnimFrames = A.length; });
  if(c.extra) Object.entries(c.extra).forEach(([k, e]) => jobs.push(loadSheet(e).then(fr => {   // run / jump / hurt / dead ...
    if(!fr){ warnMissing(n, k, e); return; }
    def.ex = def.ex || {}; def.ex[k] = {frames: fr, scale: e.scale || 1, dx: e.dx || 0, dy: e.dy || 0};
  })));
  const atkSpec = c.attackSheet || (c.fireballSheet ? base+'/attack.png' : null);
  if(atkSpec) jobs.push(loadSheet(atkSpec).then(fr=>{
    if(!fr){ if(c.attackSheet) warnMissing(n,'attackSheet',atkSpec); return; }
    const key = n.toLowerCase()+'_attack'; fr.forEach((im,i)=>IMGS[key+'_'+(i+1)] = im);
    def.attackAnimFrames = c.attackFrames || fr.length;
  }));
  if(c.skill1Sheet) jobs.push(loadSheet(c.skill1Sheet).then(fr=>{   // skill 1 (phím 1)
    if(!fr){ warnMissing(n,'skill1Sheet',c.skill1Sheet); return; }
    const key = n.toLowerCase()+'_skill1'; fr.forEach((im,i)=>IMGS[key+'_'+(i+1)] = im);
    def.skill1AnimFrames = fr.length;
  }));
  if(c.skill1BallSheet) jobs.push(loadSkills('skill1Ball', c.skill1BallSheet, def, n));    // quả cầu bay của skill 1
  if(c.skill1BlastSheet) jobs.push(loadSkills('skill1Blast', c.skill1BlastSheet, def, n));  // vụ nổ của skill 1 (tuỳ chọn)
  if(c.fireballSheet){ def.fireball = true; jobs.push(loadSkills('fireball', c.fireballSheet, def, n)); }
  if(c.explosionSheet) jobs.push(loadSkills('explosion', c.explosionSheet, def, n));
  return j.skills = Promise.all(jobs);
}
Object.entries(PET_ANIM).forEach(([name,c])=>{
  const def = PET_DEF.find(d=>d.name===name);
  if(!def){ console.warn('[PET_ANIM] Không có thú tên "'+name+'" trong PET_DEF – kiểm tra lại chính tả.'); return; }
  if(!c.walkSheet){ console.warn('[PET_ANIM] "'+name+'": thiếu walkSheet – thú này sẽ không hiện.'); return; }
  Object.assign(def, petOpts(c));
});

// ---------- NẠP THEO NHU CẦU ----------
const petsOnMap = id => PETS.filter(p=>p.map===id).map(p=>p.def.name);
const ensurePet = p => loadPetWalk(p.def.name).then(()=>loadPetLook(p.def.name)).then(()=>loadPetSkills(p.def.name));
function ensureMap(id){
  const names = petsOnMap(id);
  return Promise.all([
    loadBg(id),
    typeof loadTilemap === 'function' ? loadTilemap(id) : null,   // map dạng ô: dựng khi cần (xem map/tilemap.js)
    runPool(PETS.filter(p=>p.map===id).map(p => () => ensurePet(p)), LOAD_PARALLEL)
  ]);
}
