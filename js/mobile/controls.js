/* ==================================================================
   MOBILE – ĐIỀU KHIỂN CẢM ỨNG
   Nút ⚔️ tấn công + cần di chuyển ảo (joystick) trong trận. Hiện ở MỌI thiết bị (cảm ứng và máy tính, chuột cũng kéo / bấm được); phím WASD / Enter vẫn dùng song song.
   ================================================================== */

(function(){
  const mk = (tag, id, html) => { const d = document.createElement(tag); d.id = id; if(html) d.innerHTML = html; document.body.appendChild(d); return d; };

  {
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
