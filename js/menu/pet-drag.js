/* ==================================================================
   MENU – KÉO THẺ PET THẢ VÀO MAP
   Kéo thẻ pet từ danh sách thả lên map, hoặc bấm thẻ để chọn / thả.
   ================================================================== */

// ---- thẻ pet: kéo thả vào map, hoặc bấm ----
let _drag = null;
document.getElementById('d-body').addEventListener('pointerdown', e=>{
  const c = e.target.closest('.pcard'); if(!c) return;
  _drag = { i:+c.dataset.i, x0:e.clientX, y0:e.clientY, ghost:null, moved:false };
  window.addEventListener('pointermove', dragMove); window.addEventListener('pointerup', dragEnd); window.addEventListener('pointercancel', dragEnd);
});
function dragMove(e){
  if(!_drag) return;
  if(!_drag.moved && Math.hypot(e.clientX-_drag.x0, e.clientY-_drag.y0) > 6){
    _drag.moved = true;
    const g = thumbNode(PETS[_drag.i].def, 'drag-ghost');
    document.body.appendChild(g); _drag.ghost = g;
  }
  if(_drag.ghost){ _drag.ghost.style.left = e.clientX+'px'; _drag.ghost.style.top = e.clientY+'px'; }
}
function dragEnd(e){
  window.removeEventListener('pointermove', dragMove); window.removeEventListener('pointerup', dragEnd); window.removeEventListener('pointercancel', dragEnd);
  const d = _drag; _drag = null; if(!d) return;
  if(d.ghost) d.ghost.remove();
  const p = PETS[d.i]; if(!p) return;
  if(d.moved){
    if(e.type === 'pointerup' && document.elementFromPoint(e.clientX, e.clientY) === cv){   // thả lên map
      let pos = scaleXY(e), mid = ACTIVE_MAP;
      if(VIEW.overview){   // thả lên một ô: pet vào map của ô đó đúng vị trí tương ứng, vẫn giữ chế độ xem toàn bộ
        const tl = tileAt(pos); if(!tl) return;
        pos = toMapXY(pos, tl); mid = tl.id;
      }
      placePetAt(p, pos.x, pos.y, mid); toast(p.def.name + ' đã vào ' + mapById(mid).name); renderDeco();
    }
    return;
  }
  // chỉ bấm (không kéo)
  if(VIEW.overview){ toast('Kéo thẻ pet thả vào một ô map'); return; }
  if(p.map === ACTIVE_MAP){ PETS.forEach(q=>q.selected=false); p.selected = true; p.target = null; openPetPanel(p); }
  else { SIM_MAP = ACTIVE_MAP; const sp = spawnPos(); SIM_MAP = null; placePetAt(p, sp.x, sp.y); toast(p.def.name + ' đã vào ' + mapById(ACTIVE_MAP).name); renderDeco(); }
}
