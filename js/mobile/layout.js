/* ==================================================================
   MOBILE – BỐ CỤC
   Lời nhắc xoay ngang, nút toàn màn hình (khóa ngang nếu được), gắn class bt-on / bt-fight lên <body> để CSS ẩn / hiện nút.
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
    document.body.classList.toggle('ov-on', !!(typeof VIEW !== 'undefined' && VIEW.overview));   // xem toàn bộ map: ẩn cần di chuyển
    // cần di chuyển bị ẩn (đang chọn pet / chuẩn bị trận...) thì nhả cần
    const joyOn = ph === 'off' ? !(typeof VIEW !== 'undefined' && VIEW.overview) : ph === 'fight';
    if(!joyOn && typeof JOY !== 'undefined' && JOY.active){ JOY.active = false; JOY.x = JOY.y = 0; }
  }, 150);
})();
