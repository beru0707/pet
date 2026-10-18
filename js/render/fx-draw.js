/* ==================================================================
   RENDER – HIỆU ỨNG
   Vòng đánh dấu điểm đến, quả cầu lửa đang bay, vụ nổ.
   ================================================================== */

// vòng tròn đánh dấu điểm đến của thú đang chọn
function drawTargetMarkers(mid, t){
  PETS.forEach(p=>{
    if(!p.target || p.map!==mid) return;
    const k=(t*2)%1;
    cx.save(); cx.strokeStyle='rgba(255,230,90,'+(0.9-k*0.6)+')'; cx.lineWidth=4;
    cx.beginPath(); cx.ellipse(p.target.x,p.target.y,14+k*16,(14+k*16)*.4,0,0,Math.PI*2); cx.stroke();
    cx.fillStyle='rgba(255,230,90,.9)'; cx.beginPath(); cx.ellipse(p.target.x,p.target.y,5,2.5,0,0,Math.PI*2); cx.fill(); cx.restore();
  });
}

// quả cầu lửa đang bay
function drawProjectiles(mid){
  if (typeof PROJECTILES !== 'undefined') {
    PROJECTILES.forEach(p => {
      if(p.map !== mid) return;
      cx.save();
      cx.translate(p.x, p.y);
      cx.rotate(p.rotation);

      const img = p.def.fireballFrames && p.def.fireballFrames[p.animFrame];
      if (img && img.complete && img.naturalWidth) {
        const w = 80 * (p.def.fireballScale || 1);
        const h = w * (img.naturalHeight / img.naturalWidth);
        cx.drawImage(img, -w / 2, -h / 2, w, h);
      }
      cx.restore();
    });
  }
}

// vụ nổ khi va chạm
function drawExplosions(mid){
  if (typeof EXPLOSIONS !== 'undefined') {
    EXPLOSIONS.forEach(ex => {
      if(ex.map !== mid) return;
      cx.save();
      cx.translate(ex.x, ex.y);

      const img = ex.def.explosionFrames[ex.frame - 1];
      if (img && img.complete && img.naturalWidth) {
        const w = 140 * (ex.def.explosionScale || 1); 
        const h = w * (img.naturalHeight / img.naturalWidth);
        cx.drawImage(img, -w / 2, -h / 2, w, h);
      }
      cx.restore();
    });
  }
}
