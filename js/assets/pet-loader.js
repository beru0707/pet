/* ==================================================================
   ASSETS – NẠP THÚ
   Đọc PET_ANIM -> nạp 3 tầng cho từng thú: walk (bắt buộc) -> look (idle + sleep) -> skills (attack, fireball, explosion).
   Nạp theo nhu cầu theo map (ensureMap).
   ================================================================== */

// Khai báo ngắn: nếu không ghi, game tự tìm <thư mục thú>/idle.png, sleep.png (ảnh đơn), attack.png cạnh walk.png.
// (sleep.png không có thì thôi: thú ngủ bằng ảnh đứng yên.)
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

// ---------- THÚ: nạp 3 tầng: walk (bắt buộc) -> look (idle+sleep) -> skills ----------
const PETJOB = {};
const petJob = n => PETJOB[n] || (PETJOB[n] = {});
const petCfg = n => { const c = PET_ANIM[n], def = PET_DEF.find(d=>d.name===n); return (c && def && c.walkSheet) ? {c, def} : null; };
const sv = (s,k) => (s && typeof s === 'object') ? s[k] : undefined;
function petOpts(c){
  return {
    stride: (sv(c.walkSheet,'stride') ?? c.stride) || 1, speedMul: (sv(c.walkSheet,'speed') ?? c.speed) || 1,
    idleFit: sv(c.idleSheet,'fit') ?? c.idleFit, sleepFit: sv(c.sleepSheet,'fit') ?? c.sleepFit, attackFit: sv(c.attackSheet,'fit') ?? c.attackFit,
    idleScale: sv(c.idleSheet,'scale') ?? c.idleScale, sleepScale: sv(c.sleepSheet,'scale') ?? c.sleepScale, walkScale: sv(c.walkSheet,'scale') ?? 1, attackScale: sv(c.attackSheet,'scale') ?? c.attackScale, fireballScale: sv(c.fireballSheet,'scale') ?? 1, explosionScale: sv(c.explosionSheet,'scale') ?? 1,
    idleFps: sv(c.idleSheet,'fps') ?? c.idleFps ?? 12, sleepFps: sv(c.sleepSheet,'fps') ?? c.sleepFps ?? 6, attackFps: sv(c.attackSheet,'fps') ?? c.attackFps, fireballFps: sv(c.fireballSheet,'fps') ?? 6.67, explosionFps: sv(c.explosionSheet,'fps') ?? 16.7,
    attackFireFrame: sv(c.attackSheet,'fireFrame') ?? c.attackFireFrame,
    idleDX: sv(c.idleSheet,'dx'), idleDY: sv(c.idleSheet,'dy'), sleepDX: sv(c.sleepSheet,'dx'), sleepDY: sv(c.sleepSheet,'dy'), attackDX: sv(c.attackSheet,'dx'), attackDY: sv(c.attackSheet,'dy')
  };
}
const refreshPetMenu = () => { if(typeof MENU !== 'undefined' && MENU.open && MENU.tab === 'pets') renderMenu(); };

function loadPetWalk(n){
  const j = petJob(n); if(j.walk) return j.walk;
  const o = petCfg(n); if(!o) return j.walk = Promise.resolve();
  return j.walk = loadSheet(o.c.walkSheet).then(fr=>{
    if(fr){ applyWalk(n, o.c._walkId.replace(/^assets\//,'').replace(/\//g,'_'), fr, petOpts(o.c)); refreshPetMenu(); }
    else warnMissing(n,'walkSheet – thú này sẽ không hiện:',o.c.walkSheet);
  });
}
function loadPetLook(n){
  const j = petJob(n); if(j.look) return j.look;
  const o = petCfg(n); if(!o) return j.look = Promise.resolve();
  const {c, def} = o, base = c._base;
  const idleSpec = c.idleSheet || base+'/idle.png';
  const sleepSpec = c.sleepSheet || {src: base+'/sleep.png', cols:1, rows:1};
  return j.look = Promise.all([
    loadSheet(idleSpec).then(fr=>{ if(fr){ def.idleFrames = fr; def.idleImg = fr[0]; } else if(c.idleSheet) warnMissing(n,'idleSheet',idleSpec); }),
    loadSheet(sleepSpec).then(fr=>{ if(fr){ def.sleepFrames = fr; def.sleepImg = fr[0]; } else if(c.sleepSheet) warnMissing(n,'sleepSheet',sleepSpec); })
  ]).then(refreshPetMenu);
}
function loadPetSkills(n){
  const j = petJob(n); if(j.skills) return j.skills;
  const o = petCfg(n); if(!o) return j.skills = Promise.resolve();
  const {c, def} = o, base = c._base, jobs = [];
  const atkSpec = c.attackSheet || (c.fireballSheet ? base+'/attack.png' : null);
  if(atkSpec) jobs.push(loadSheet(atkSpec).then(fr=>{
    if(!fr){ if(c.attackSheet) warnMissing(n,'attackSheet',atkSpec); return; }
    const key = n.toLowerCase()+'_attack'; fr.forEach((im,i)=>IMGS[key+'_'+(i+1)] = im);
    def.attackAnimFrames = c.attackFrames || fr.length;
  }));
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
    runPool(PETS.filter(p=>p.map===id).map(p => () => ensurePet(p)), LOAD_PARALLEL)
  ]);
}
