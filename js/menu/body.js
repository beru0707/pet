/* ==================================================================
   MENU – NỘI DUNG KHUNG: DANH SÁCH PET / DANH SÁCH MAP / CÀI ĐẶT
   Lưới thẻ bên trái (có bộ lọc), chi tiết + nút hành động bên phải.
   Ảnh thu nhỏ của thú (thumbNode) cũng được phần trận dùng.
   ================================================================== */

// nút ảnh nhỏ của pet: <img> (ảnh thường) hoặc <canvas> (khung cắt từ sprite sheet)
function thumbNode(def, cls){
  const src = petThumbSrc(def); let n;
  if(src instanceof HTMLCanvasElement){
    n = document.createElement('canvas');
    const bb = typeof imgBox === 'function' ? imgBox(src) : null;   // cắt lề trong suốt quanh nhân vật cho ảnh nhỏ to và nằm giữa ô
    if(bb){ n.width = Math.ceil(bb.w); n.height = Math.ceil(bb.h); n.getContext('2d').drawImage(src, bb.x0, bb.y0, bb.w, bb.h, 0, 0, n.width, n.height); }
    else { n.width = src.width; n.height = src.height; n.getContext('2d').drawImage(src,0,0); }
  }
  else { n = document.createElement('img'); n.src = src ? src.src : ''; n.draggable = false; n.alt = ''; }
  if(cls) n.className = cls; return n;
}
function petThumbSrc(def){
  const walk = def.imgKey ? IMGS[def.imgKey.replace('_anim','_') + 1] : null;
  const im = def.idleImg || walk;                       // ảnh đứng yên (nếu có), không thì khung đi bộ đầu tiên
  return im || '';
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

const gFilters = (list, cur, key) => `<div class="gm-filters">${list.map(([k,t]) => `<button class="gf ${cur===k?'on':''}" data-f="${key}:${k}">${t}</button>`).join('')}</div>`;
const gBtn = (cls, act, txt, sub, dis) => `<button class="gm-btn ${cls}" data-act="${act}" ${dis?'disabled':''}>${txt}${sub?`<small>${esc(sub)}</small>`:''}</button>`;

// ---------------- PET ----------------
function petsView(){
  const list = PETS.map((p,i) => ({p,i})).filter(({p}) => MENU.fp === 'all' || (MENU.fp === 'placed') === !!p.map);
  if(MENU.pet == null || !PETS[MENU.pet]) MENU.pet = list.length ? list[0].i : (PETS.length ? 0 : null);
  const placed = PETS.filter(p => p.map).length;
  const cards = list.map(({p,i}) => `<div class="gcard ${p.map?'placed':''} ${MENU.pet===i?'sel':''}" data-pet="${i}"><span class="gbadge ${p.map?'ok':'off'}">${p.map?'ĐANG THẢ':'TRONG KHO'}</span><div class="gth"><span class="pth"></span></div><b>${esc(p.def.name)}</b></div>`).join('')
    || '<div class="gempty">Không có pet nào</div>';
  let detail = '<div class="gempty">Chưa có pet</div>';
  const p = PETS[MENU.pet];
  if(p){
    const bs = Object.assign({}, PET_BATTLE_DEFAULT, PET_BATTLE[p.def.name] || {}), sp = +((p.def.speedMul || 1).toFixed(2));
    const here = p.map === ACTIVE_MAP && !VIEW.overview;
    const place = !p.map ? 'Đang ở trong kho' : p.map === ACTIVE_MAP ? 'Đang thả ở map này (' + esc(mapById(p.map).name) + ')' : 'Đang thả ở ' + esc(mapById(p.map).name);
    detail = `<div class="gprev"><span class="pth big"></span></div>
      <div class="gname">${esc(p.def.name.toUpperCase())}</div>
      <div class="gchips"><span class="gchip">❤️ HP ${bs.hp}</span><span class="gchip">⚔️ ATK ${bs.dmg}</span><span class="gchip">👟 Tốc độ ×${sp}</span></div>
      <div class="gdesc">📍 ${place}</div>
      <div class="gact">${gBtn('red','recall','THU HỒI','',!p.map)}${here ? gBtn('green','select','CHỌN PET','Điều khiển') : gBtn('green','place','THẢ VÀO MAP', mapById(ACTIVE_MAP).name)}</div>`;
  }
  return `<div class="gm-panel gm-list">${gFilters([['all','TẤT CẢ'],['placed','ĐANG THẢ'],['stash','TRONG KHO']], MENU.fp, 'fp')}<div class="gm-grid">${cards}</div><div class="gm-foot">Đang thả: ${placed}/${PETS.length}</div></div><div class="gm-panel gm-detail">${detail}</div>`;
}

// ---------------- MAP ----------------
const ALL_MAPS = '__all';
function mapsView(){
  MAPS.forEach(m => loadBg(m.id));
  const cnt = id => PETS.filter(p => p.map === id).length;
  const items = [];
  if(MENU.fm === 'all') items.push(ALL_MAPS);
  MAPS.forEach(m => { const n = cnt(m.id); if(MENU.fm === 'all' || (MENU.fm === 'pets') === (n > 0)) items.push(m.id); });
  if(MENU.map == null || (MENU.map !== ALL_MAPS && !mapById(MENU.map))) MENU.map = VIEW.overview ? ALL_MAPS : ACTIVE_MAP;
  const cols = MAPS.length <= 1 ? 1 : MAPS.length <= 4 ? 2 : 3;
  const mosaic = `<div class="mosaic" style="grid-template-columns:repeat(${cols},1fr)">${MAPS.map(m => `<i style="background-image:url('${esc(bgSrc(m.id))}')"></i>`).join('')}</div>`;
  const cards = items.map(id => {
    if(id === ALL_MAPS) return `<div class="gcard ${MENU.map===ALL_MAPS?'sel':''} ${VIEW.overview?'placed':''}" data-map="${ALL_MAPS}"><span class="gbadge ${VIEW.overview?'ok':'off'}">${VIEW.overview?'ĐANG XEM':'TOÀN CẢNH'}</span><div class="gth gmap">${mosaic}</div><b>Xem toàn bộ</b><small>${PETS.filter(p=>p.map).length} pet</small></div>`;
    const m = mapById(id), on = !VIEW.overview && id === ACTIVE_MAP;
    return `<div class="gcard ${MENU.map===id?'sel':''} ${on?'placed':''}" data-map="${esc(id)}"><span class="gbadge ${on?'ok':'off'}">${on?'ĐANG XEM':'ĐÃ MỞ'}</span><div class="gth gmap"><i style="background-image:url('${esc(bgSrc(id))}')"></i></div><b>${esc(m.name)}</b><small>${cnt(id)} pet</small></div>`;
  }).join('') || '<div class="gempty">Không có map nào</div>';

  let detail;
  if(MENU.map === ALL_MAPS){
    detail = `<div class="gprev gmap">${mosaic}</div><div class="gname">XEM TOÀN BỘ MAP</div>
      <div class="gdesc">🐾 Pet đang thả: ${PETS.filter(p=>p.map).length}<br>Xem mọi map cùng lúc, bấm nhãn tên map để vào map đó.</div>
      <div class="gact">${gBtn('green','overview', VIEW.overview ? 'ĐANG XEM' : 'XEM TOÀN CẢNH', '', VIEW.overview)}</div>`;
  } else {
    const m = mapById(MENU.map), mine = PETS.filter(p => p.map === m.id), on = !VIEW.overview && m.id === ACTIVE_MAP;
    const isBattle = m.id === btMapId();
    const foes = [...new Set(BATTLE_CFG.waves.map(w => (ENEMY_TYPES[w.type] || {}).name || w.type))].join(', ');
    detail = `<div class="gprev gmap"><i style="background-image:url('${esc(bgSrc(m.id))}')"></i></div><div class="gname">${esc(m.name.toUpperCase())}</div>
      <div class="gdesc">🧭 Trạng thái: <b>${on ? 'Đang xem' : 'Sẵn sàng'}</b><br>🐾 Pet đang thả: <b>${mine.length}</b> <span class="gmini" data-mini="${esc(m.id)}"></span><br>👾 Quái vật: <b>${isBattle ? esc(foes) : 'Chưa có'}</b></div>
      <div class="gact">${isBattle ? gBtn('red','battle','VÀO TRẬN') : ''}${gBtn('green','viewmap','XEM MAP')}</div>`;
  }
  return `<div class="gm-panel gm-list">${gFilters([['all','TẤT CẢ'],['pets','CÓ PET'],['empty','TRỐNG']], MENU.fm, 'fm')}<div class="gm-grid">${cards}</div><div class="gm-foot">Số map: ${MAPS.length}</div></div><div class="gm-panel gm-detail">${detail}</div>`;
}

// ---------------- CÀI ĐẶT ----------------
function settingsView(){
  const canFS = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  return `<div class="gm-panel gm-list gm-set"><div class="grow"><span>Toàn màn hình</span>${canFS ? gBtn('green sm','fs','BẬT / TẮT') : '<small>Thiết bị không hỗ trợ</small>'}</div></div>
    <div class="gm-panel gm-detail"><div class="gname">ĐIỀU KHIỂN</div><div class="gdesc" style="margin-top:.6em">⌨️ WASD / mũi tên: đi · Enter: đánh · phím 1: skill 1 · Space: nhảy<br>🖱️ Bấm pet để chọn, bấm chỗ trống để pet đi tới đó.</div></div>`;
}

function renderMenu(){
  const b = document.getElementById('gm-body');
  b.className = 'gm-body';
  b.innerHTML = MENU.tab === 'pets' ? petsView() : MENU.tab === 'maps' ? mapsView() : settingsView();
  if(MENU.tab === 'pets'){
    b.querySelectorAll('.gcard[data-pet]').forEach(c => { const p = PETS[+c.dataset.pet]; if(p) c.querySelector('.pth').replaceWith(thumbNode(p.def)); });
    const big = b.querySelector('.gprev .pth'); if(big && PETS[MENU.pet]) big.replaceWith(thumbNode(PETS[MENU.pet].def));
  } else if(MENU.tab === 'maps'){
    const mini = b.querySelector('.gmini'); if(mini) PETS.filter(p => p.map === mini.dataset.mini).slice(0,6).forEach(p => mini.appendChild(thumbNode(p.def)));
  }
}

// ---------------- bấm trong khung ----------------
document.getElementById('gm-body').addEventListener('click', e => {
  const f = e.target.closest('[data-f]');
  if(f){ const [k,v] = f.dataset.f.split(':'); MENU[k] = v; renderMenu(); return; }
  const pc = e.target.closest('[data-pet]'); if(pc){ MENU.pet = +pc.dataset.pet; renderMenu(); return; }
  const mc = e.target.closest('[data-map]'); if(mc){ MENU.map = mc.dataset.map; renderMenu(); return; }
  const a = e.target.closest('[data-act]'); if(!a || a.disabled) return;
  a.blur();
  const p = PETS[MENU.pet];
  switch(a.dataset.act){
    case 'recall':   // thu hồi pet về kho (khỏi map)
      if(!p) return;
      Object.assign(p, {map:null, selected:false, target:null, vx:0, vy:0}); if(p.tvx !== undefined){ p.tvx = 0; p.tvy = 0; }
      saveGame(); toast(p.def.name + ' đã về kho'); renderMenu(); break;
    case 'place': {  // thả pet vào map đang xem
      if(!p) return;
      const sp = spawnPos(); placePetAt(p, sp.x, sp.y); toast(p.def.name + ' đã vào ' + mapById(ACTIVE_MAP).name); renderMenu(); break; }
    case 'select':   // chọn pet đang ở map này để điều khiển
      if(!p) return;
      PETS.forEach(q => q.selected = false); p.selected = true; p.target = null; setMenuOpen(false); break;
    case 'viewmap':
      VIEW.overview = false; setActiveMap(MENU.map); setMenuOpen(false); break;
    case 'overview':
      setOverview(true); setMenuOpen(false); break;
    case 'battle':
      btOpen(); break;   // btOpen tự đóng menu
    case 'fs':
      if(window.toggleFullscreen) window.toggleFullscreen(); break;
  }
});
