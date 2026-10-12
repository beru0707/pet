/* ==================================================================
   UI
   Bảng thông tin thú, nút chăm sóc, HUD, thông báo
   ================================================================== */

// UI
let selPet = null;
function openPetPanel(p){
  selPet = p; document.getElementById('pet-panel').classList.remove('hidden');
  document.getElementById('pp-name').textContent = p.def.name;

  const oc = document.createElement('canvas'); oc.width=120; oc.height=100;
  // Lấy ảnh đúng: frame 1 nếu là animation, ảnh đơn nếu không
  let previewImg = null;
  if(p.def.animFrames){
    previewImg = p.def.idleImg || IMGS[p.def.imgKey.replace('_anim','_') + 1];
  } else if(p.def.imgKey){
    previewImg = IMGS[p.def.imgKey];
  }

  if (previewImg?.complete && previewImg.naturalWidth) {
    const r = previewImg.naturalWidth / previewImg.naturalHeight;
    let mw=120, mh=100;
    if(r > 1.2) mh = 120/r; else mw = 100*r;
    oc.getContext('2d').drawImage(previewImg, (120-mw)/2, (100-mh)/2, mw, mh);
  } else if(IMGS.pets?.complete && IMGS.pets.naturalWidth) {
    const r = p.def.sw / p.def.sh;
    let mw=120, mh=100;
    if(r > 1.2) mh = 120/r; else mw = 100*r;
    oc.getContext('2d').drawImage(IMGS.pets, p.def.srcX, p.def.srcY, p.def.sw, p.def.sh, (120-mw)/2, (100-mh)/2, mw, mh);
  }
  document.getElementById('pp-img').src = oc.toDataURL();
  refreshPanel();
}
function closePetPanel(){ if(selPet){ selPet.selected=false; selPet.target=null; } selPet = null; document.getElementById('pet-panel').classList.add('hidden'); }
function dostash(){   // cất thú về danh sách (khỏi map)
  if(!selPet) return; const p = selPet; closePetPanel();
  p.map = null; p.target = null; p.vx = 0; p.vy = 0; saveGame();
  if(typeof MENU !== 'undefined' && MENU.open) renderDeco();
  toast(p.def.name + ' đã về danh sách');
}
function refreshPanel(){
  if(!selPet)return;
  document.getElementById('b-hun').style.width = selPet.hunger+'%';
  document.getElementById('b-hap').style.width = selPet.happy+'%';
  document.getElementById('b-ene').style.width = selPet.energy+'%';
}
function dofeed(){
  if(state.coins<10){ toast('Cần 10 🪙'); return; }
  state.coins-=10; selPet.hunger=Math.min(100,selPet.hunger+30); toast('Đã cho ăn! 🍖'); refreshPanel(); updateHUD(); saveGame();
}
function doplay(){
  if(selPet.energy<10){ toast('Quá mệt! 😴'); return; }
  selPet.happy=Math.min(100,selPet.happy+20); selPet.energy=Math.max(0,selPet.energy-15);
  state.xp+=5; if(state.xp>=100*state.lv){state.xp=0; state.lv++;}
  toast('Chơi rất vui! ❤️'); refreshPanel(); updateHUD(); saveGame();
}
function dosleep(){ selPet.sleepUntil=performance.now()/1000+8; selPet.target=null; selPet.idleUntil=performance.now()/1000+8; selPet.vx=0; selPet.vy=0; toast('Đang ngủ... 💤'); saveGame(); }

function updateHUD(){ document.getElementById('h-coins').textContent=state.coins; document.getElementById('h-lv').textContent=state.lv; }
let _t; function toast(m){ const e=document.getElementById('toast'); e.textContent=m; e.classList.add('show'); clearTimeout(_t); _t=setTimeout(()=>e.classList.remove('show'),2200); }
