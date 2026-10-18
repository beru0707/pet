/* ==================================================================
   DECOR – THAO TÁC KÉO THẢ TRÊN MAP
   Bấm / kéo chuột trên canvas ở chế độ trang trí: vẽ đường, đặt vật phẩm, kéo vật phẩm.
   ================================================================== */

function decorDown(e){
  const p=scaleXY(e); try{ cv.setPointerCapture(e.pointerId); }catch(_){}
  if(DECOR.tab==='path'){ DECOR.painting=true; DECOR.erase = DECOR.brush.type===-1; paintAt(p.x,p.y,DECOR.erase); DECOR.last=p; }
  else if(DECOR.tab==='item'){
    if(!DECOR.sel) { toast('Chọn một vật phẩm bên dưới trước nhé'); return; }
    const d=DECOR.defs[DECOR.sel]; if(!d) return;
    const it={id:'i'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),key:DECOR.sel,x:p.x,y:p.y,s:1,f:0};
    DECOR.items.push(it); DECOR.selId=it.id; DECOR.dragItem={it,dx:0,dy:0,placed:true};
  } else {
    const it=hitItem(p.x,p.y);
    DECOR.selId = it ? it.id : null;
    if(it) DECOR.dragItem={it,dx:it.x-p.x,dy:it.y-p.y};
    renderDeco();
  }
}
cv.addEventListener('pointermove', e=>{
  if(!DECOR.active) return; const p=scaleXY(e);
  if(DECOR.painting){ paintLine(DECOR.last,p,DECOR.erase); DECOR.last=p; }
  else if(DECOR.dragItem){ const d=DECOR.dragItem; d.it.x=Math.max(10,Math.min(CW-10,p.x+d.dx)); d.it.y=Math.max(10,Math.min(CH-4,p.y+d.dy)); }
});
function decorUp(){
  if(!DECOR.active) return;
  if(DECOR.painting){ DECOR.painting=false; DECOR.last=null; saveDecor(); }
  if(DECOR.dragItem){ DECOR.dragItem=null; ejectPets(); saveDecor(); renderDeco(); }
}
cv.addEventListener('pointerup', decorUp); cv.addEventListener('pointercancel', decorUp);
