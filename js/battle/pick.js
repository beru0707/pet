/* ==================================================================
   BATTLE – CHỌN PET TRƯỚC TRẬN
   Màn hình chọn: hàng ô trên cùng (pet đã chọn) + lưới tất cả pet bên dưới. Bấm thẻ để chọn / bỏ chọn, "Bắt đầu" -> thả pet vào map chuẩn bị.
   ================================================================== */

function btPickShow(){
  BT.chosen = [];
  $b('bt-pick').style.display = 'block';
  btPickRender();
}
function btPickRender(){
  const max = BATTLE_CFG.maxPets, sl = $b('bt-slots'); sl.innerHTML = '';
  for(let i = 0; i < max; i++){
    const p = BT.chosen[i], d = document.createElement('div'); d.className = 'pk-slot' + (p ? ' full' : '');
    if(p){ d.appendChild(thumbNode(p.def)); d.dataset.i = i; d.title = 'Bấm để bỏ ' + p.def.name; }
    sl.appendChild(d);
  }
  const g = $b('bt-grid'); g.innerHTML = '';
  PETS.forEach((p, i) => {
    const c = document.createElement('div'); c.className = 'pk-card' + (BT.chosen.includes(p) ? ' on' : ''); c.dataset.i = i;
    c.appendChild(thumbNode(p.def)); const b = document.createElement('b'); b.textContent = p.def.name; c.appendChild(b);
    g.appendChild(c);
  });
  $b('pk-count').textContent = BT.chosen.length + '/' + max;
}
$b('bt-grid').addEventListener('click', e => {
  const c = e.target.closest('.pk-card'); if(!c || BT.phase !== 'pick') return;
  const p = PETS[+c.dataset.i], k = BT.chosen.indexOf(p);
  if(k >= 0) BT.chosen.splice(k, 1);
  else if(BT.chosen.length >= BATTLE_CFG.maxPets){ toast('Tối đa ' + BATTLE_CFG.maxPets + ' pet'); return; }
  else BT.chosen.push(p);
  btPickRender();
});
$b('bt-slots').addEventListener('click', e => {
  const s = e.target.closest('.pk-slot.full'); if(!s || BT.phase !== 'pick') return;
  BT.chosen.splice(+s.dataset.i, 1); btPickRender();
});
function btPickGo(){
  if(BT.phase !== 'pick') return;
  if(!BT.chosen.length){ toast('Hãy chọn ít nhất 1 pet'); return; }
  $b('bt-pick').style.display = 'none';
  BT.phase = 'prep';
  BT.chosen.forEach(p => { const sp = spawnPos(); btPlace(p, sp.x, sp.y); });   // thả pet đã chọn vào map, còn kéo chỉnh vị trí được
  $b('bt-bar').style.display = 'flex';
  btRenderBar();
}
$b('pk-start').addEventListener('click', btPickGo);
$b('pk-cancel').addEventListener('click', () => { if(BT.phase === 'pick') btExit(); });
