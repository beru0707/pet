/* ==================================================================
   ASSETS
   Nạp ảnh, tự dò khung hình animation của từng thú (theo PET_ANIM)
   ================================================================== */

// ASSETS
const IMGS = {};
let toLoad = 0, loaded_ = 0;
function loadImg(key, src){
  toLoad++;
  const img = new Image();
  img.onload = img.onerror = () => { loaded_++; if(loaded_===toLoad) onAllLoaded(); };
  img.src = src; IMGS[key] = img;
}
// Ảnh nền của từng map (khóa 'bg_<id>'); map đầu tiên cũng làm nền mờ hai bên màn hình
MAPS.forEach(m => loadImg('bg_'+m.id, m.bg));
document.documentElement.style.setProperty('--bgurl', 'url('+MAPS[0].bg+')');
for (let i = 1; i <= 19; i++) {
  if (i <= 8) {
    loadImg(`shibav3_1_attack_${i}`, `assets/shibav3_1/attack/fireball/sprite_${i}.png`);
  } else if (i <= 13) {
    loadImg(`shiba_fireball_${i - 8}`, `assets/shibav3_1/attack/fireball/sprite_${i}.png`);
  } else {
    loadImg(`shiba_explosion_${i - 13}`, `assets/shibav3_1/attack/fireball/sprite_${i}.png`);
  }
}
// Tự dò khung hình trong thư mục của từng thú (assets/firefox/ ...) (sprite_1.png, sprite_2.png, ... hoặc 1.png, 2.png, ... hoặc firefox_1.png ...)
function tryImg(src){ return new Promise(r=>{ const im=new Image(); im.onload=()=>r(im); im.onerror=()=>r(null); im.src=src; }); }
async function probeAnim(petName, imgPrefix, dir, names, opt){
  if(!PET_DEF.some(d=>d.name===petName)){ console.warn('[PET_ANIM] Không có thú tên "'+petName+'" trong PET_DEF – kiểm tra lại chính tả (tên phải giống hệt).'); return 0; }
  const pats=names.map(n=>i=>`${dir}/${n.replace('#',i)}`);
  for(const pat of pats){
    const first=await tryImg(pat(1)); if(!first) continue;
    const frames=[first];
    for(let i=2;i<=60;i++){ const im=await tryImg(pat(i)); if(!im) break; frames.push(im); }
    frames.forEach((im,i)=>IMGS[imgPrefix+'_'+(i+1)]=im);
    const def=PET_DEF.find(d=>d.name===petName); if(def){ def.animFrames=frames.length; def.imgKey=imgPrefix+'_anim'; def.walker=true; Object.assign(def,opt||{}); }
    return frames.length;
  }
  console.warn('[PET_ANIM] "'+petName+'": không tìm thấy ảnh trong thư mục '+dir+' (cần '+dir+'/sprite_1.png, sprite_2.png, ... liên tiếp từ 1) – thú này sẽ không hiện.');
  return 0;
}

// Nạp khung tấn công: chỉ lưu ảnh + số khung, KHÔNG đổi ảnh đi bộ của thú
async function loadAttackFrames(petName, dir){
  const def = PET_DEF.find(d=>d.name===petName); if(!def) return;
  const key = petName.toLowerCase()+'_attack';          // render.js đọc IMGS[key+'_'+số]
  for(const n of ['sprite_#.png','#.png']){
    const first = await tryImg(`${dir}/${n.replace('#',1)}`); if(!first) continue;
    let count = 1; IMGS[key+'_1'] = first;
    for(let i=2;i<=60;i++){ const im = await tryImg(`${dir}/${n.replace('#',i)}`); if(!im) break; IMGS[key+'_'+i] = im; count++; }
    def.attackAnimFrames = Math.min(count, 7);          // chỉ lấy 7 khung đầu cho động tác nhân vật
    return;
  }
  console.warn('[PET_ANIM] "'+petName+'": không tìm thấy khung tấn công trong '+dir);
}

// Ảnh ĐỨNG YÊN: mặc định assets/pet/<tên thư mục>.png (voltreaver.png, snowbunny.png, wukongv2.png ...)
// Ảnh NGỦ     : mặc định assets/<tên thư mục>/sleep/<tên thư mục>_sleep.png (vd assets/voltreaver/sleep/voltreaver_sleep.png)
// Đổi trong PET_ANIM:  idle:'đường dẫn'  sleep:'đường dẫn'  (idle:false / sleep:false để tắt)
// Thiếu ảnh ngủ -> dùng ảnh đứng yên; thiếu cả hai -> dùng khung 1 của ảnh đi bộ.
function loadStillImages(petName, c){
  const def = PET_DEF.find(d=>d.name===petName); if(!def) return;
  const stem = c.folder.replace(/^assets\//,'').replace(/\/walk$/,'').replace(/\//g,'_');
  if(c.idle!==false) tryImg(c.idle || 'assets/pet/'+stem+'.png').then(im=>{ if(im) def.idleImg = im; else if(c.idle) console.warn('[PET_ANIM] "'+petName+'": không thấy ảnh đứng yên '+c.idle); });
  if(c.sleep!==false) tryImg(c.sleep || 'assets/'+stem+'/sleep/'+stem+'_sleep.png').then(im=>{ if(im) def.sleepImg = im; else if(c.sleep) console.warn('[PET_ANIM] "'+petName+'": không thấy ảnh ngủ '+c.sleep); });
}

Object.entries(PET_ANIM).forEach(([name, c]) => {
  // tên khóa ảnh = đường dẫn thư mục (assets/shibav3_1/walk -> shibav3_1_walk) nên không bao giờ trùng giữa các thú
  const prefix = c.folder.replace(/^assets\//,'').replace(/\//g,'_');
  probeAnim(name, prefix, c.folder, ['sprite_#.png','#.png'], { stride: c.stride || 1, speedMul: c.speed || 1, idleFit: c.idleFit, sleepFit: c.sleepFit, idleScale: c.idleScale, sleepScale: c.sleepScale, attackFit: c.attackFit, attackScale: c.attackScale });
  if (c.attackFolder) loadAttackFrames(name, c.attackFolder);
  loadStillImages(name, c);
});
