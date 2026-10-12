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
loadImg('bg', 'assets/background/grass.png');   // nền cỏ mới (không có đường/vật phẩm, để người chơi tự decor)
loadImg('pets', 'pets-transparent.png');
loadImg('firefox', 'assets/pet/firefox.png');   // ảnh tĩnh dự phòng
loadImg('firedragon', 'assets/pet/firedragon.png');
loadImg('swiftfox', 'assets/pet/swiftfox.png');
loadImg('waterdragon', 'assets/pet/waterdragon.png');
loadImg('flowerbeetle', 'assets/pet/flowerbeetle.png');
loadImg('shibav2', 'assets/pet/shibav2.png');
for (let i = 1; i <= 19; i++) {
  if (i <= 8) {
    loadImg(`shibav3_1_attack_${i}`, `assets/shibav3_1/attack/fireball/sprite_${i}.png`);
  } else if (i <= 13) {
    loadImg(`shiba_fireball_${i - 8}`, `assets/shibav3_1/attack/fireball/sprite_${i}.png`);
  } else {
    loadImg(`shiba_explosion_${i - 13}`, `assets/shibav3_1/attack/fireball/sprite_${i}.png`);
  }
}
// Cáo Lửa: tự dò khung hình trong assets/firefox/ (sprite_1.png, sprite_2.png, ... hoặc 1.png, 2.png, ... hoặc firefox_1.png ...)
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
  console.warn('[PET_ANIM] "'+petName+'": không tìm thấy ảnh trong thư mục '+dir+' (cần '+dir+'/sprite_1.png, sprite_2.png, ... liên tiếp từ 1) – dùng ảnh tĩnh.');
  return 0;
}

//Attack shiba
Object.entries(PET_ANIM).forEach(([name, c]) => {
  const prefix = c.folder.split('/').pop();
  probeAnim(name, prefix, c.folder, ['sprite_#.png', '#.png'], { stride: c.stride || 1, speedMul: c.speed || 1 });

  if (c.attackFolder) {
    const atkPrefix = name.toLowerCase() + '_attack';
    // Đếm và nạp tối đa 7 frame đầu cho động tác nhân vật
    probeAnim(name, atkPrefix, c.attackFolder, ['sprite_#.png', '#.png'], {}).then(frameCount => {
      const def = PET_DEF.find(d => d.name === name);
      if (def) def.attackAnimFrames = Math.min(frameCount, 7); // Chỉ lấy 7 frame đầu
    });
  }
});
