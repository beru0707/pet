/* ==================================================================
   BATTLE – CHUẨN BỊ
   Đặt pet vào map chiến đấu: thẻ pet, kéo thả, thu hồi, tối đa số pet.
   ================================================================== */

// ============ VÀO TRẬN / CHUẨN BỊ ============
const btPlaced = () => PETS.filter(p => p.map === BT.map);
function btReady(p){ return p._ready || (p._ready = loadPetWalk(p.def.name).then(()=>loadPetLook(p.def.name)).then(()=>loadPetSkills(p.def.name))); }
function btPlace(p, x, y){
  if(BT.phase !== 'prep') return;
  if(!p.map && btPlaced().length >= BATTLE_CFG.maxPets){ toast('Tối đa ' + BATTLE_CFG.maxPets + ' pet'); return; }
  placePetAt(p, x, y, BT.map); btReady(p).then(btRenderBar); btRenderBar();
}
function btRenderBar(){
  if(BT.phase !== 'prep' || BT.drag) return;
  const list = $b('bt-list'); list.innerHTML = '';
  PETS.forEach((p,i)=>{
    const c = document.createElement('div'); c.className = 'bt-card' + (p.map === BT.map ? ' on' : ''); c.dataset.i = i;
    c.appendChild(thumbNode(p.def)); const b = document.createElement('b'); b.textContent = p.def.name; c.appendChild(b);
    list.appendChild(c);
  });
  const n = btPlaced().length;
  $b('bt-sub').textContent = 'Kéo thẻ pet vào map · bấm thẻ để thả / thu hồi (' + n + '/' + BATTLE_CFG.maxPets + ')';
  $b('bt-go').disabled = n === 0;
}
setInterval(()=>{ if(BT.phase === 'prep') btRenderBar(); }, 1200);

// kéo thẻ pet thả vào map (giống tab Pet của menu)
$b('bt-list').addEventListener('pointerdown', e=>{
  const c = e.target.closest('.bt-card'); if(!c || BT.phase !== 'prep') return;
  BT.drag = {i:+c.dataset.i, x0:e.clientX, y0:e.clientY, ghost:null, moved:false};
  window.addEventListener('pointermove', btDragMove); window.addEventListener('pointerup', btDragEnd); window.addEventListener('pointercancel', btDragEnd);
});
function btDragMove(e){
  const d = BT.drag; if(!d) return;
  if(!d.moved && Math.hypot(e.clientX-d.x0, e.clientY-d.y0) > 6){ d.moved = true; d.ghost = thumbNode(PETS[d.i].def, 'drag-ghost'); document.body.appendChild(d.ghost); }
  if(d.ghost){ d.ghost.style.left = e.clientX+'px'; d.ghost.style.top = e.clientY+'px'; }
}
function btDragEnd(e){
  window.removeEventListener('pointermove', btDragMove); window.removeEventListener('pointerup', btDragEnd); window.removeEventListener('pointercancel', btDragEnd);
  const d = BT.drag; BT.drag = null; if(!d) return;
  if(d.ghost) d.ghost.remove();
  const p = PETS[d.i];
  if(d.moved){
    if(e.type === 'pointerup' && document.elementFromPoint(e.clientX, e.clientY) === cv){ const pos = scaleXY(e); btPlace(p, pos.x, pos.y); }
    btRenderBar(); return;
  }
  if(p.map === BT.map){ p.map = null; btRenderBar(); }                       // bấm thẻ đã thả = thu hồi
  else { const sp = spawnPosOn(BT.map); btPlace(p, sp.x, sp.y); }
}
function spawnPosOn(m){ const o = SIM_MAP; SIM_MAP = m; const s = spawnPos(); SIM_MAP = o; return s; }
