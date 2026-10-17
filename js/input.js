/* ==================================================================
   INPUT
   Phím WASD / mũi tên và bấm chuột chọn thú
   ================================================================== */

// ---- Điều khiển bằng bàn phím: thú đang được chọn đi theo WASD / phím mũi tên ----
const KEYS = {};
const MOVE_KEYS = {KeyW:'u',ArrowUp:'u',KeyS:'d',ArrowDown:'d',KeyA:'l',ArrowLeft:'l',KeyD:'r',ArrowRight:'r'};
window.addEventListener('keyup', e=>{ const k = MOVE_KEYS[e.code]; if(k) KEYS[k]=false; });
window.addEventListener('blur', ()=>{ for(const k in KEYS) KEYS[k]=false; });
function keyDir(){ return {x:(KEYS.r?1:0)-(KEYS.l?1:0), y:(KEYS.d?1:0)-(KEYS.u?1:0)}; }
// INTERACTION
let clickMarker = null;   // vòng tròn báo điểm vừa bấm
function tileAt(pos){ return VIEW.tiles.find(q=>pos.x>=q.x && pos.x<=q.x+q.w && pos.y>=q.y && pos.y<=q.y+q.h); }
const toMapXY = (pos,tl)=>({ x:Math.max(100,Math.min(CW-100,(pos.x-tl.x)/tl.w*CW)), y:Math.max(180,Math.min(950,(pos.y-tl.y)/tl.h*CH)) });
const inLabel=(pos,tl)=>pos.x<=tl.x+tl.lw && pos.y<=tl.y+54 && pos.x>=tl.x && pos.y>=tl.y;
let _ovDrag = null;   // kéo pet giữa các map trong chế độ xem toàn bộ
function ovMove(e){
  const d=_ovDrag; if(!d) return; const pos=scaleXY(e);
  if(!d.moved && Math.hypot(pos.x-d.p0.x,pos.y-d.p0.y)<10) return;
  d.moved=true; d.pet.dragging=true; cv.style.cursor='grabbing';
  const tl=tileAt(pos); if(!tl) return;
  const m=toMapXY(pos,tl); Object.assign(d.pet,{map:tl.id,x:m.x,y:m.y,vx:0,vy:0,target:null});
}
function ovUp(e){
  window.removeEventListener('pointermove',ovMove); window.removeEventListener('pointerup',ovUp); window.removeEventListener('pointercancel',ovUp);
  const d=_ovDrag; _ovDrag=null; if(!d) return; cv.style.cursor='pointer';
  const p=d.pet; p.dragging=false;
  if(!d.moved){ PETS.forEach(q=>q.selected=false); p.selected=true; p.target=null; openPetPanel(p); return; }   // chỉ bấm: chọn pet (điều khiển như bình thường)
  const tl=e.type==='pointerup' ? tileAt(scaleXY(e)) : null;
  if(!tl){ Object.assign(p,d.orig); return; }   // thả ngoài ô: trả về chỗ cũ
  const m=toMapXY(scaleXY(e),tl); placePetAt(p,m.x,m.y,tl.id);
  toast(p.def.name+' đã chuyển sang '+mapById(tl.id).name); if(MENU.open) renderDeco();
}
cv.addEventListener('pointerdown', e => {
  e.preventDefault();
  const pos = scaleXY(e);
  if(VIEW.overview){   // xem toàn bộ map: kéo pet sang map khác, hoặc bấm ô để vào map đó
    const tl = tileAt(pos); if(!tl) return;
    const mp = toMapXY(pos,tl); let hit=null, minD=999;
    PETS.forEach(p=>{ if(p.map!==tl.id) return; const d=Math.hypot(mp.x-p.x,mp.y-p.y); if(d<pSize(p.y)*0.7 && d<minD){ minD=d; hit=p; } });
    if(hit){ _ovDrag={pet:hit,tile:tl,p0:pos,moved:false,orig:{map:hit.map,x:hit.x,y:hit.y,vx:0,vy:0}};
      window.addEventListener('pointermove',ovMove); window.addEventListener('pointerup',ovUp); window.addEventListener('pointercancel',ovUp); }
    else if(inLabel(pos,tl)){ VIEW.overview=false; setActiveMap(tl.id); if(MENU.open) renderDeco(); }   // bấm vào nhãn tên map: vào map đó
    else{
      const cur = PETS.find(q=>q.selected);
      if(cur && cur.map===tl.id){   // đang chọn pet ở ô này: bấm chỗ trống -> pet đi tới đó
        cur.target = {x:mp.x, y:mp.y}; cur.idleUntil = 0; cur.nextTurn = 0;
      } else { PETS.forEach(q=>q.selected=false); closePetPanel(); }
    }
    return;
  }
  if(DECOR.active){ decorDown(e); return; }
  let hit=null, minD=999;
  PETS.forEach(p=>{
    if(p.map!==ACTIVE_MAP) return;
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

window.addEventListener('keydown', e => {
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;

  if (e.code === 'Enter' || e.code === 'NumpadEnter') {
    const selectedPet = PETS.find(p => p.selected);
    
    //kich hoat
    if (selectedPet && selectedPet.def.attackAnimFrames && (!DECOR.active || VIEW.overview)) {
      e.preventDefault();
      triggerAttack(selectedPet);
    }
    return;
  }

  const k = MOVE_KEYS[e.code]; if(!k) return;
  if(PETS.some(p=>p.selected) && (!DECOR.active || VIEW.overview)){ e.preventDefault(); KEYS[k]=true; }
});
