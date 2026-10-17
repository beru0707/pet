/* ==================================================================
   MOBILE
   Lời nhắc xoay ngang · nút toàn màn hình (khóa ngang nếu được) · nút TẤN CÔNG cảm ứng trong trận
   ================================================================== */
(function(){
  const touch = matchMedia('(pointer:coarse)').matches;
  const el = document.documentElement;
  const reqFS = el.requestFullscreen || el.webkitRequestFullscreen;
  const inFS = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
  async function goFS(){
    try{
      if(inFS()){ (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
      if(reqFS) await reqFS.call(el);
      if(screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');   // Android Chrome: chỉ khóa được khi đang toàn màn hình
    }catch(e){}
  }
  const mk = (tag, id, html) => { const d = document.createElement(tag); d.id = id; if(html) d.innerHTML = html; document.body.appendChild(d); return d; };

  // lời nhắc xoay ngang (CSS chỉ hiện khi máy cảm ứng đang để dọc)
  mk('div', 'rot', '<div class="rot-ph">📱</div><div>Xoay ngang điện thoại để chơi</div>'
    + (reqFS ? '<button id="rot-fs">⛶ Toàn màn hình</button>' : '') + '<button class="sec" id="rot-skip">Vẫn chơi chế độ dọc</button>');
  const fs1 = document.getElementById('rot-fs'); if(fs1) fs1.onclick = goFS;
  document.getElementById('rot-skip').onclick = () => document.body.classList.add('rot-skip');
  matchMedia('(orientation:landscape)').addEventListener('change', e => { if(e.matches) document.body.classList.remove('rot-skip'); });

  // nút toàn màn hình nhỏ ở góc dưới trái
  if(touch && reqFS){
    const b = mk('button', 'fs-btn', '⛶'); b.classList.add('can'); b.onclick = goFS;
    const sync = () => document.body.classList.toggle('is-fs', inFS());
    document.addEventListener('fullscreenchange', sync); document.addEventListener('webkitfullscreenchange', sync);
  }

  // nút tấn công: thay phím Enter trên điện thoại. Có pet đang chọn -> pet đó đánh; chưa chọn ai -> mọi pet trong trận đánh
  if(touch){
    const a = mk('button', 'bt-atk', '⚔️');
    const fire = e => {
      e.preventDefault();
      if(typeof BT === 'undefined' || BT.phase !== 'fight') return;
      const mine = PETS.filter(p => p.map === BT.map && !p.bdead && p.def.attackAnimFrames);
      const sel = mine.filter(p => p.selected);
      (sel.length ? sel : mine).forEach(p => triggerAttack(p));
    };
    a.addEventListener('pointerdown', fire);
    setInterval(() => document.body.classList.toggle('bt-fight', typeof BT !== 'undefined' && BT.phase === 'fight'), 200);
  }
})();
