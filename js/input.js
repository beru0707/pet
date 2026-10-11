/* ==================================================================
   INPUT
   Phím WASD / mũi tên và bấm chuột chọn thú
   ================================================================== */

// ---- Điều khiển bằng bàn phím: thú đang được chọn đi theo WASD / phím mũi tên ----
const KEYS = {};
const MOVE_KEYS = {KeyW:'u',ArrowUp:'u',KeyS:'d',ArrowDown:'d',KeyA:'l',ArrowLeft:'l',KeyD:'r',ArrowRight:'r'};
window.addEventListener('keydown', e=>{
  const k = MOVE_KEYS[e.code]; if(!k) return;
  if(/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||'')) return;
  if(PETS.some(p=>p.selected) && !DECOR.active){ e.preventDefault(); KEYS[k]=true; }
});
window.addEventListener('keyup', e=>{ const k = MOVE_KEYS[e.code]; if(k) KEYS[k]=false; });
window.addEventListener('blur', ()=>{ for(const k in KEYS) KEYS[k]=false; });
function keyDir(){ return {x:(KEYS.r?1:0)-(KEYS.l?1:0), y:(KEYS.d?1:0)-(KEYS.u?1:0)}; }
// INTERACTION
let clickMarker = null;   // vòng tròn báo điểm vừa bấm
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  if(DECOR.active){ decorDown(e); return; }
  const pos = scaleXY(e);
  let hit=null, minD=999;
  PETS.forEach(p=>{
    const d=Math.hypot(pos.x-p.x,pos.y-p.y);
    if(d < pSize(p.y)*0.6 && d < minD){ minD=d; hit=p; }
  });
  const cur = PETS.find(p=>p.selected);
  if(hit){
    PETS.forEach(p=>p.selected=false); hit.selected=true; hit.target=null; openPetPanel(hit);
  } else if(cur){
    // đang chọn 1 thú, bấm vào chỗ trống -> thú đi tới đó (giữ nguyên lựa chọn)
    cur.target = {x: Math.max(100,Math.min(CW-100,pos.x)), y: Math.max(180,Math.min(950,pos.y))};
    cur.idleUntil = 0; cur.nextTurn = 0;
    clickMarker = {x:cur.target.x, y:cur.target.y, t:performance.now()};
  } else { closePetPanel(); }
});
