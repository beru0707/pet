/* ==================================================================
   MAIN
   Vòng lặp game và khởi động
   ================================================================== */

// LOOP
setInterval(()=>{
  state.coins += 3; updateHUD(); saveGame();
}, 5000);

let lastT=0;
function frame(ts){
  // Thời gian game = thời gian thật + OFS (OFS tăng khi chạy nhanh x2/x4, giảm khi tạm dừng). Chia nhỏ khung để x4 không bị lỡ va chạm.
  const rt = ts * .001, rdt = Math.min(.05, rt - lastT); lastT = rt;
  const sp = typeof btSpeed === 'function' ? btSpeed() : 1, dt = rdt * sp;
  OFS += dt - rdt; const t = rt + OFS;
  const n = Math.max(1, Math.ceil(sp)), sdt = dt / n;
  for(let i = 1; i <= n; i++){ const ti = t - dt + sdt * i; stepGame(ti, sdt); }
  drawScene(t);
  requestAnimationFrame(frame);
}
let OFS = 0;
function stepGame(t, dt){
  window.GAME_T = t;   // giờ game hiện tại (phím nhảy / sự kiện bị đánh dùng làm mốc bắt đầu hoạt ảnh)
  // MỌI map đều chạy liên tục: thú ở map không đang xem vẫn đi lại; thú chưa thả (map=null) thì đứng trong danh sách
  PETS.forEach(p => { if(p.map && !p.dragging) updatePet(p, t, dt); });

  if (typeof updateProjectiles === 'function') 
    updateProjectiles(dt);
  if (typeof updateBattle === 'function') 
      updateBattle(t, dt);
}

bootAssets().catch(e=>console.error('[boot]',e)).then(()=>{
  loadGame(); initPets(); updateHUD(); requestAnimationFrame(frame);
  window.GAME_RUNNING = true;   // từ đây loadSheet nhường luồng giữa các lần cắt để game không giật
  setTimeout(startBackgroundLoad, 1500);   // cho vài giây đầu chạy mượt rồi mới nạp ngầm phần còn lại
});