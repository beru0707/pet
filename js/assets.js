/* ==================================================================
   ASSETS
   Nạp ảnh nền + cắt sprite sheet của từng thú (theo PET_ANIM)
   ================================================================== */

// ASSETS
const IMGS = {};
const PREFER_WEBP = true;   // ưu tiên .webp cạnh .png; không có thì tự dùng .png
const LOAD_PARALLEL = 3;    // số sheet giải nén cùng lúc

function tryImg(src){
  const load = s => new Promise(r=>{ const im=new Image(); im.decoding='async'; im.onload=()=>r(im); im.onerror=()=>r(null); im.src=s; });
  return (PREFER_WEBP && /\.png$/i.test(src)) ? load(src.replace(/\.png$/i,'.webp')).then(im => im || load(src)) : load(src);
}
async function runPool(tasks, n, onEach){
  let i = 0;
  await Promise.all(Array.from({length:Math.min(n,tasks.length)}, async () => {
    while(i < tasks.length){ const t = tasks[i++]; try{ await t(); }catch(e){ console.warn('[ASSETS]', e); } if(onEach) onEach(); await new Promise(r=>setTimeout(r,0)); }
  }));
}

const _bg = {};
const bgSrc = id => (IMGS['bg_'+id] && IMGS['bg_'+id].src) || '';
const setBgVar = s => document.documentElement.style.setProperty('--bgurl', 'url("'+s+'")');
function loadBg(id){
  return _bg[id] || (_bg[id] = tryImg(MAPS.find(m=>m.id===id).bg).then(im=>{
    if(im){
      IMGS['bg_'+id] = im;
      if(id === (typeof ACTIVE_MAP !== 'undefined' ? ACTIVE_MAP : MAPS[0].id)) setBgVar(im.src);
      if(typeof MENU !== 'undefined' && MENU.open && MENU.tab === 'map') renderDeco();
    }
    return im;
  }));
}

function tryImg(src){
  const load = s => new Promise(r=>{ const im=new Image(); im.onload=()=>r(im); im.onerror=()=>r(null); im.src=s; });
  return load(src.replace(/\.png$/i,'.webp')).then(im => im || load(src));
}

// ---------- SPRITE SHEET (1 ảnh ghép nhiều khung, tự nhận lưới + tự đếm khung) ----------
// Trong PET_ANIM mỗi thú khai báo: walkSheet / idleSheet / sleepSheet / attackSheet
//   dạng ngắn: 'assets/voltreaver/walk.png'  -> game TỰ NHẬN số cột / hàng / số khung (6x6, 5x3, 8x1 ... đều được)
//   dạng đầy đủ (khi cần ép tay): {src:'...', cols:5, rows:3, frames:13}  (ghi cột nào / hàng nào thì dùng cái đó, còn lại tự nhận)
// Cách tự nhận: tìm số cột/hàng lớn nhất sao cho các đường chia ô đều rơi vào khoảng TRONG SUỐT giữa các nhân vật.
//   Sheet phải có lề trong suốt giữa các khung; chỉ làm được khi chạy qua http/https (Live Server...). Mở file:// thì trình duyệt chặn
//   đọc điểm ảnh -> dùng cols/rows/frames ghi tay (không ghi thì lấy SHEET_DEFAULT).
// Số khung = số ô tính đến ô cuối cùng có hình (ô trống ở cuối bị bỏ). Ô chiếm chỗ nhưng trống ở giữa vẫn giữ.
function detectGrid(im){
  const s = Math.min(1, 1200/Math.max(im.naturalWidth, im.naturalHeight)), w = Math.max(1,Math.round(im.naturalWidth*s)), h = Math.max(1,Math.round(im.naturalHeight*s));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.drawImage(im,0,0,w,h);
  const d = g.getImageData(0,0,w,h).data;                      // file:// -> ném lỗi, nơi gọi sẽ bắt
  const colSum = new Uint32Array(w), rowSum = new Uint32Array(h);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) if(d[(y*w+x)*4+3] > 24){ colSum[x]++; rowSum[y]++; }
  const pick = (sum, len, other) => {
    const tol = Math.max(2, Math.round(other*0.004)); let best = 1;
    for(let n=2; n<=48; n++){
      let ok = true;
      for(let k=1; k<n && ok; k++){ const b = Math.round(k*len/n); for(let o=-1;o<=1;o++){ if(sum[Math.min(len-1,Math.max(0,b+o))] > tol){ ok = false; break; } } }
      for(let k=0; k<n && ok; k++){ const a = Math.round(k*len/n), z = Math.round((k+1)*len/n); let any = false; for(let i=a;i<z;i++) if(sum[i] > tol){ any = true; break; } if(!any) ok = false; }   // mỗi cột/hàng ô đều phải có hình
      if(ok) best = n;
    }
    return best;
  };
  return {cols: pick(colSum,w,h), rows: pick(rowSum,h,w)};
}
let _sheetWarned = false;
async function loadSheet(spec){
  const o = typeof spec === 'string' ? {src:spec} : spec;
  const max = o.max || SHEET_DEFAULT.max;
  const im = await tryImg(o.src);
  if(!im) return null;
  let cols = o.cols, rows = o.rows;
  if(!(cols && rows)){
    try{ const g = detectGrid(im); cols = cols || g.cols; rows = rows || g.rows; }
    catch(e){
      cols = cols || SHEET_DEFAULT.cols; rows = rows || SHEET_DEFAULT.rows;
      if(!_sheetWarned){ _sheetWarned = true; console.warn('[PET_ANIM] Không tự nhận được lưới sprite sheet (đang mở file://, trình duyệt chặn đọc ảnh). Chạy qua http/https (Live Server) hoặc ghi {src, cols, rows, frames} cho từng sheet. Tạm dùng lưới '+cols+'x'+rows+'.'); }
    }
  }
  const W = im.naturalWidth, H = im.naturalHeight, cw = W/cols, ch = H/rows;
  const k = Math.min(1, max/Math.max(cw,ch)), tw = Math.max(1,Math.round(cw*k)), th = Math.max(1,Math.round(ch*k));
  const frames = [];
  for(let n=0; n<cols*rows; n++){
    const c = n % cols, r = (n/cols)|0, sx = Math.round(c*cw), sy = Math.round(r*ch);
    const cv2 = document.createElement('canvas'); cv2.width = tw; cv2.height = th;
    cv2.getContext('2d').drawImage(im, sx, sy, Math.round((c+1)*cw)-sx, Math.round((r+1)*ch)-sy, 0, 0, tw, th);
    cv2.complete = true; cv2.naturalWidth = tw; cv2.naturalHeight = th;   // cho giống thẻ <img> để phần còn lại của game dùng chung
    frames.push(cv2);
  }
  let count = o.frames || frames.length;
  if(!o.frames){   // tự bỏ các ô trống cuối sheet
    try{
      const empty = f => { const d = f.getContext('2d').getImageData(0,0,f.width,f.height).data; for(let i=3;i<d.length;i+=4) if(d[i]>8) return false; return true; };
      while(count > 1 && empty(frames[count-1])) count--;
    }catch(e){}
  }
  return frames.slice(0, count);
}

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
    attackFireFrame: sv(c.attackSheet,'fireFrame') ?? c.attackFireFrame
  };
}
const refreshPetMenu = () => { if(typeof MENU !== 'undefined' && MENU.open && MENU.tab === 'pets') renderDeco(); };

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
function ensureMap(id){
  const names = petsOnMap(id);
  return Promise.all([
    loadBg(id),
    runPool(names.map(n => () => loadPetWalk(n).then(()=>loadPetLook(n)).then(()=>loadPetSkills(n))), LOAD_PARALLEL)
  ]);
}

// ---------- MÀN HÌNH CHỜ + KHỞI ĐỘNG ----------
function makeLoader(){
  const d = document.createElement('div'); d.id = 'loading';
  d.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#0f1d0a;color:#e6f7c8;font:600 18px Fredoka,sans-serif;transition:opacity .4s';
  d.innerHTML = '<div style="font-size:30px;font-weight:700">🐾 Khu Vườn Thú Cưng</div><div id="ld-txt">Đang tải…</div>'
    + '<div style="width:min(70vw,420px);height:14px;border-radius:99px;background:#ffffff22;overflow:hidden"><div id="ld-bar" style="height:100%;width:0;background:linear-gradient(90deg,#7bd34a,#ffd54a);transition:width .25s"></div></div>'
    + '<div id="ld-pct" style="opacity:.8;font-size:14px">0%</div>';
  document.body.appendChild(d); return d;
}
async function bootAssets(){
  try{ loadGame(); }catch(e){}
  const first = MAPS[0].id;
  const names = PET_DEF.filter((d,i)=>{
    const s = (state.petsData && state.petsData[i]) || {};
    let m = s.map !== undefined ? s.map : (PETS_START_PLACED ? MAPS[0].id : null);
    if(m && !MAPDATA[m]) m = MAPS[0].id;
    return m === first;
  }).map(d=>d.name);
  const L = makeLoader(), bar = L.querySelector('#ld-bar'), txt = L.querySelector('#ld-txt'), pct = L.querySelector('#ld-pct');
  const jobs = [ {label:'Đang tải bản đồ…', run:()=>loadBg(first)}, ...names.map(n=>({label:'Đang tải '+n+'…', run:()=>loadPetWalk(n)})) ];
  let done = 0; const upd = () => { const p = Math.round(done/jobs.length*100); bar.style.width = p+'%'; pct.textContent = p+'%'; };
  await runPool(jobs.map(j => async () => { txt.textContent = j.label; await j.run(); }), LOAD_PARALLEL, () => { done++; upd(); });
  txt.textContent = 'Sẵn sàng!'; bar.style.width = '100%'; pct.textContent = '100%';
  L.style.opacity = '0'; setTimeout(()=>L.remove(), 450);
}
function startBackgroundLoad(){
  const T = [], cur = petsOnMap(ACTIVE_MAP);
  cur.forEach(n => T.push(() => loadPetLook(n)));
  cur.forEach(n => T.push(() => loadPetSkills(n)));
  MAPS.forEach(m => { if(m.id === ACTIVE_MAP) return; T.push(() => loadBg(m.id)); petsOnMap(m.id).forEach(n => T.push(() => loadPetWalk(n).then(()=>loadPetLook(n)))); });
  PETS.filter(p=>!p.map).forEach(p => T.push(() => loadPetWalk(p.def.name).then(()=>loadPetLook(p.def.name))));
  PETS.forEach(p => T.push(() => loadPetSkills(p.def.name)));
  return runPool(T, 2);
}