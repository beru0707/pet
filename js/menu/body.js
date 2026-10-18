/* ==================================================================
   MENU – NỘI DUNG TAB PET / MAP
   Thẻ pet, thẻ map, ảnh thu nhỏ của thú (thumbNode), bấm thẻ map để đổi map.
   ================================================================== */

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
