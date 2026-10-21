/* ==================================================================
   ASSETS – KHỞI ĐỘNG
   Màn hình chờ + nạp phần tối thiểu để vào game (bootAssets), nạp ngầm phần còn lại (startBackgroundLoad).
   ================================================================== */

// ---------- MÀN HÌNH CHỜ + KHỞI ĐỘNG ----------
function makeLoader(){
  const d = document.createElement('div'); d.id = 'loading';
  d.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#0f1d0a;color:#e6f7c8;font:600 18px Fredoka,sans-serif;transition:opacity .4s';
  d.innerHTML = '<div style="font-size:30px;font-weight:700">🐾 Khu Vườn Thú Cưng</div><div id="ld-txt">Đang tải…</div>'
    + '<div style="width:min(70vw,420px);height:14px;border-radius:99px;background:#ffffff22;overflow:hidden"><div id="ld-bar" style="height:100%;width:0;background:linear-gradient(90deg,#7bd34a,#ffd54a);transition:width .25s"></div></div>'
    + '<div id="ld-pct" style="opacity:.8;font-size:14px">0%</div>';
  document.body.appendChild(d); return d;
}
async function bootAssets(){
  try{ loadGame(); }catch(e){}
  const first = MAPS[0].id;
  const names = PET_DEF.filter((d,i)=>{
    const s = (typeof savedPet === 'function' && savedPet(d)) || {};
    let m = s.map !== undefined ? s.map : (PETS_START_PLACED ? MAPS[0].id : null);
    if(m && !mapById(m)) m = MAPS[0].id;
    return m === first;
  }).map(d=>d.name);
  const L = makeLoader(), bar = L.querySelector('#ld-bar'), txt = L.querySelector('#ld-txt'), pct = L.querySelector('#ld-pct');
  const jobs = [ {label:'Đang tải bản đồ…', run:()=>loadBg(first)}, ...names.map(n=>({label:'Đang tải '+n+'…', run:()=>loadPetWalk(n)})) ];
  let done = 0; const upd = () => { const p = Math.round(done/jobs.length*100); bar.style.width = p+'%'; pct.textContent = p+'%'; };
  await runPool(jobs.map(j => async () => { txt.textContent = j.label; await j.run(); }), LOAD_PARALLEL, () => { done++; upd(); });
  txt.textContent = 'Sẵn sàng!'; bar.style.width = '100%'; pct.textContent = '100%';
  L.style.opacity = '0'; setTimeout(()=>L.remove(), 450);
}
function startBackgroundLoad(){
  const T = [], cur = petsOnMap(ACTIVE_MAP);
  cur.forEach(n => T.push(() => loadPetLook(n)));
  cur.forEach(n => T.push(() => loadPetSkills(n)));
  MAPS.forEach(m => { if(m.id === ACTIVE_MAP) return; T.push(() => loadBg(m.id)); petsOnMap(m.id).forEach(n => T.push(() => loadPetWalk(n).then(()=>loadPetLook(n)))); });
  PETS.filter(p=>p.map).forEach(p => T.push(() => loadPetSkills(p.def.name)));
  return runPool(T, 2);
}
