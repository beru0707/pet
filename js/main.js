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
  const t = ts * .001, dt = Math.min(.05, t - lastT); lastT = t;
  // MỌI map đều chạy liên tục: thú ở map không đang xem vẫn đi lại; thú chưa thả (map=null) thì đứng trong danh sách
  PETS.forEach(p => { if(p.map && !p.dragging) updatePet(p, t, dt); });

  if (typeof updateProjectiles === 'function') 
    updateProjectiles(dt);
  if (typeof updateBattle === 'function') 
      updateBattle(t, dt);
  
  drawScene(t);
  requestAnimationFrame(frame);
}

bootAssets().catch(e=>console.error('[boot]',e)).then(()=>{
  loadGame(); initPets(); updateHUD(); requestAnimationFrame(frame);
  startBackgroundLoad();
});