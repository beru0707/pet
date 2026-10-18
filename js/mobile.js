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

  // trạng thái trận -> class trên <body> (CSS dùng để ẩn nút Chức năng, hiện cần di chuyển / nút tấn công)
  setInterval(() => {
    const ph = typeof BT !== 'undefined' ? BT.phase : 'off';
    document.body.classList.toggle('bt-on', ph !== 'off');
    document.body.classList.toggle('bt-fight', ph === 'fight');
    if(ph !== 'fight' && typeof JOY !== 'undefined' && JOY.active){ JOY.active = false; JOY.x = JOY.y = 0; }
  }, 150);

  if(touch){
    // nút tấn công: thay phím Enter. Có pet đang chọn -> pet đó đánh; chưa chọn ai -> mọi pet có attackSheet trong trận đánh
    const a = mk('button', 'bt-atk', '⚔️');
    a.addEventListener('pointerdown', e => {
      e.preventDefault();
      if(typeof BT === 'undefined' || BT.phase !== 'fight') return;
      const mine = PETS.filter(p => p.map === BT.map && !p.bdead && p.def.attackAnimFrames);
      const sel = mine.filter(p => p.selected);
      (sel.length ? sel : mine).forEach(p => triggerAttack(p));
    });

    // cần di chuyển ảo: điều khiển pet đang chọn (chưa chọn thì tự chọn pet đầu tiên còn sống). Thay cho phím WASD
    window.JOY = {active:false, x:0, y:0};
    const keyDir0 = keyDir;
    window.keyDir = () => JOY.active ? {x:JOY.x, y:JOY.y} : keyDir0();
    const joy = mk('div', 'joy', '<div id="joy-knob"></div>'), knob = joy.firstChild;
    let pid = null;
    const drive = e => {
      const r = joy.getBoundingClientRect(), R = r.width/2*.7;
      let dx = e.clientX - (r.left + r.width/2), dy = e.clientY - (r.top + r.height/2);
      const d = Math.hypot(dx, dy); if(d > R){ dx *= R/d; dy *= R/d; }
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      const on = Math.hypot(dx, dy) / R >= .25;                       // vùng chết ở giữa
      JOY.x = on ? dx/R : 0; JOY.y = on ? dy/R : 0; JOY.active = on;
    };
    const stop = () => { pid = null; JOY.active = false; JOY.x = JOY.y = 0; knob.style.transform = ''; };
    joy.addEventListener('pointerdown', e => {
      e.preventDefault(); pid = e.pointerId; joy.setPointerCapture(pid);
      if(typeof BT !== 'undefined' && BT.phase === 'fight'){
        const mine = PETS.filter(p => p.map === BT.map && !p.bdead);
        if(mine.length && !mine.some(p => p.selected)) mine[0].selected = true;
      }
      drive(e);
    });
    joy.addEventListener('pointermove', e => { if(e.pointerId === pid) drive(e); });
    joy.addEventListener('pointerup', stop); joy.addEventListener('pointercancel', stop);
  }
})();
