/* ==================================================================
   MAIN
   Vòng lặp game và khởi động
   ================================================================== */

// LOOP
setInterval(()=>{
  PETS.forEach(p=>{ p.hunger=Math.max(0,p.hunger-1.2); p.happy=Math.max(0,p.happy-0.8); p.energy=Math.max(0,p.energy-0.5); });
  state.coins += 3; updateHUD(); refreshPanel(); saveGame();
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
  // MỌI map đều chạy liên tục: thú ở map không đang xem vẫn đi lại; thú chưa thả (map=null) thì đứng trong danh sách
  PETS.forEach(p => { if(p.map && !p.dragging) updatePet(p, t, dt); });

  if (typeof updateProjectiles === 'function') 
    updateProjectiles(dt);
  if (typeof updateBattle === 'function') 
      updateBattle(t, dt);
}

bootAssets().catch(e=>console.error('[boot]',e)).then(()=>{
  loadGame(); initPets(); updateHUD(); requestAnimationFrame(frame);
  startBackgroundLoad();
});