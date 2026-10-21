/* ==================================================================
   INPUT – BÀN PHÍM
   WASD / mũi tên đi, Enter tấn công. keyDir() trả hướng đi hiện tại (mobile/controls.js bọc lại để thêm cần ảo).
   ================================================================== */

// ---- Điều khiển bằng bàn phím: thú đang được chọn đi theo WASD / phím mũi tên ----
const KEYS = {};
const MOVE_KEYS = {KeyW:'u',ArrowUp:'u',KeyS:'d',ArrowDown:'d',KeyA:'l',ArrowLeft:'l',KeyD:'r',ArrowRight:'r'};
window.addEventListener('keyup', e=>{ const k = MOVE_KEYS[e.code]; if(k) KEYS[k]=false; });
window.addEventListener('blur', ()=>{ for(const k in KEYS) KEYS[k]=false; });
function keyDir(){ return {x:(KEYS.r?1:0)-(KEYS.l?1:0), y:(KEYS.d?1:0)-(KEYS.u?1:0)}; }

window.addEventListener('keydown', e => {
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;

  if (e.code === 'Enter' || e.code === 'NumpadEnter') {
    const selectedPet = PETS.find(p => p.selected);

    if (selectedPet && selectedPet.def.attackAnimFrames) {
      e.preventDefault();
      triggerAttack(selectedPet);
    }
    return;
  }

  const k = MOVE_KEYS[e.code]; if(!k) return;
  if(PETS.some(p=>p.selected)){ e.preventDefault(); KEYS[k]=true; }
});
