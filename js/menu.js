/* ==================================================================
   MENU
   Nút góc phải trên: mở thanh chức năng gồm 3 tab
     🎨 Trang trí  |  🐾 Danh sách pet (kéo thẻ thả vào map)  |  🗺️ Map (chọn map đang xem)
   ================================================================== */

const MENU = { open:false, tab:'deco' };

function setMenuTab(tab){
  MENU.tab = tab;
  const wasDeco = DECOR.active;
    DECOR.active = MENU.open && tab === 'deco';          // chỉ tab Trang trí mới khóa việc chọn/điều khiển thú
  if(wasDeco && !DECOR.active){ DECOR.dragItem = null; DECOR.painting = false; DECOR.selId = null; saveDecor(); }
  if(DECOR.active){ PETS.forEach(p=>p.selected=false); closePetPanel(); toast('Chế độ trang trí – kéo chuột để vẽ đường / đặt vật phẩm'); }
  cv.style.cursor = DECOR.active ? 'crosshair' : 'pointer';
  document.getElementById('deco').classList.toggle('hidden', !MENU.open);
  document.getElementById('wrap').classList.toggle('menu-open', MENU.open);   // bảng thông tin thú dời lên để không bị thanh menu che
  document.getElementById('d-sub').style.display = tab === 'deco' ? '' : 'none';
  document.querySelectorAll('#m-tabs [data-m]').forEach(x=>x.classList.toggle('on', x.dataset.m === tab));
  if(MENU.open) renderDeco();
}
function setDecor(on){ MENU.open = !!on; setMenuTab(MENU.tab); }   // giữ tên cũ: mở/đóng menu
document.getElementById('m-tabs').addEventListener('click', e=>{
  const t = e.target.closest('[data-m]'); if(t) setMenuTab(t.dataset.m);
});

// ---- nội dung 2 tab mới ----
// nút ảnh nhỏ của pet: <img> (ảnh thường) hoặc <canvas> (khung cắt từ sprite sheet)
function thumbNode(def, cls){
  const src = petThumbSrc(def); let n;
  if(src instanceof HTMLCanvasElement){ n = document.createElement('canvas'); n.width = src.width; n.height = src.height; n.getContext('2d').drawImage(src,0,0); }
  else { n = document.createElement('img'); n.src = src ? src.src : ''; n.draggable = false; n.alt = ''; }
  if(cls) n.className = cls; return n;
}
function petThumbSrc(def){
  const walk = def.imgKey ? IMGS[def.imgKey.replace('_anim','_') + 1] : null;
  const im = def.idleImg || walk;                       // ảnh đứng yên (nếu có), không thì khung đi bộ đầu tiên
  return im || '';
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function renderMenuBody(){
  const b = document.getElementById('d-body'); let h = '';
  if(MENU.tab === 'pets'){
    h += `<span class="dlabel">Kéo thẻ vào map để thả thú · bấm thẻ để chọn / thả vào map này</span>`;
    h += PETS.map((p,i)=>{
      const where = !p.map ? 'Chưa thả' : p.map === ACTIVE_MAP ? '📍 Map này' : '📍 ' + esc(mapById(p.map).name);
      return `<div class="pcard ${p.map===ACTIVE_MAP?'here':''} ${p.map?'':'free'}" data-i="${i}"><span class="pth"></span><b>${esc(p.def.name)}</b><small>${where}</small></div>`;
    }).join('');
  } else {
    MAPS.forEach(m=>loadBg(m.id));
    const cols = MAPS.length<=1?1:MAPS.length<=4?2:3;
    h += `<div class="mcard all ${VIEW.overview?'on':''}" data-all="1"><div class="mthumb mosaic" style="grid-template-columns:repeat(${cols},1fr)">${MAPS.map(m=>`<i style="background-image:url('${esc(bgSrc(m.id))}')"></i>`).join('')}</div><b>🌐 Xem toàn bộ map</b><small>${PETS.filter(p=>p.map).length} pet đang chạy${VIEW.overview?' · đang xem':''}</small></div>`;
    h += MAPS.map(m=>{
      const n = PETS.filter(p=>p.map===m.id).length;
      return `<div class="mcard ${!VIEW.overview&&m.id===ACTIVE_MAP?'on':''}" data-map="${esc(m.id)}"><div class="mthumb" style="background-image:url('${esc(bgSrc(m.id))}')"></div><b>${esc(m.name)}</b><small>${n} pet${!VIEW.overview&&m.id===ACTIVE_MAP?' · đang xem':''}</small></div>`;
    }).join('');
  }
  b.innerHTML = h;
  b.querySelectorAll('.pcard').forEach(c=>{ const p = PETS[+c.dataset.i]; if(p) c.querySelector('.pth').replaceWith(thumbNode(p.def)); });
}

// ---- bấm thẻ map: đổi map đang xem ----
document.getElementById('d-body').addEventListener('click', e=>{
  const c = e.target.closest('.mcard'); if(!c) return;
  if(c.dataset.all){ setOverview(!VIEW.overview); renderDeco(); return; }
  VIEW.overview = false; setActiveMap(c.dataset.map); renderDeco();
});

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
