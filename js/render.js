/* ==================================================================
   RENDER
   Vẽ cảnh: nền, đường, vật phẩm, thú (sắp theo trục y)
   ================================================================== */

function drawScene(t){
  { const B=IMGS.bg;
    if(B?.complete && B.naturalWidth){ const k=Math.max(CW/B.naturalWidth,CH/B.naturalHeight),w=B.naturalWidth*k,h=B.naturalHeight*k; cx.drawImage(B,(CW-w)/2,(CH-h)/2,w,h); }
    else { cx.fillStyle='#86bf3b'; cx.fillRect(0,0,CW,CH); } }
  drawPathLayer();
  
  const drawList = [...PETS.map(p=>({y:p.y,pet:p})), ...DECOR.items.map(it=>({y:it.y,item:it}))].sort((a,b)=>a.y-b.y);
  drawList.forEach(o => {
    if(o.item){ drawItem(o.item); return; }
    const p = o.pet;
    const sz=pSize(p.y);
    const mv=Math.abs(p.vx)>3||Math.abs(p.vy)>3;
    const bob=mv?Math.abs(Math.sin(t*8+p.phase))*-6:Math.sin(t*2.5+p.phase)*-2;
    const br=1+Math.sin(t*2.5+p.phase)*.015;
    
    const src = IMGS.pets;
    // Lấy ảnh đúng: animation frame hoặc ảnh đơn
    let customImg = null;
    if (p.isAttacking) {
      // Ưu tiên lấy ảnh từ thư mục attack
      const atkKey = p.def.name.toLowerCase() + '_attack_';
      customImg = IMGS[atkKey + (p.attackFrame + 1)];
    } else if (p.def.animFrames) {
      // Lấy ảnh đi bộ bình thường
      customImg = IMGS[p.def.imgKey.replace('_anim','_') + (p.animFrame + 1)];
    } else if (p.def.imgKey) {
      customImg = IMGS[p.def.imgKey];
    }

    // ĐỒNG BỘ KÍCH THƯỚC: Tính tỷ lệ nguyên gốc của ảnh để không bị bóp méo
    let ratio = 1;
    if(customImg?.complete && customImg.naturalWidth) ratio = customImg.naturalWidth / customImg.naturalHeight;
    else ratio = p.def.sw / p.def.sh;

    const rd = p.def.walker ? (v=>v) : Math.round;
    const petScale = p.def.scale ?? 1.0;
    // Pet có animation thật thì dùng nhún nhẹ hơn (animation đã có chuyển động chân)
    const bobScale = p.def.walker ? 0 : (p.def.animFrames ? 0.4 : 1.0);
    const dh = sz * br * petScale;
    const dw = dh * ratio;
    const actualBob = bob * bobScale;


    if(p.selected){
      cx.save(); cx.strokeStyle='#fbbf24'; cx.lineWidth=4;
      cx.beginPath(); cx.ellipse(p.x,p.y+2,dw*.46,dh*.14,0,0,Math.PI*2); cx.stroke(); cx.restore();
    }
    softShadow(p.x + dw*.07, p.y+3, dw*.42, dh*.11, 0.36 * (1 + actualBob/60));

    cx.save();

    // Draw pet image
    if(p.facingLeft){
      cx.translate(rd(p.x-dw/2+dw),rd(p.y-dh+actualBob)); cx.scale(-1,1);
      if(customImg?.complete && customImg.naturalWidth) cx.drawImage(customImg,0,0,dw,dh);
      else if(src?.complete && src.naturalWidth) cx.drawImage(src,p.def.srcX,p.def.srcY,p.def.sw,p.def.sh,0,0,dw,dh);
    } else {
      if(customImg?.complete && customImg.naturalWidth) cx.drawImage(customImg,rd(p.x-dw/2),rd(p.y-dh+actualBob),dw,dh);
      else if(src?.complete && src.naturalWidth) cx.drawImage(src,p.def.srcX,p.def.srcY,p.def.sw,p.def.sh,Math.round(p.x-dw/2),Math.round(p.y-dh+actualBob),dw,dh);
    }
    cx.restore();

    // (đã xoá tên dưới chân)
    cx.font='24px serif'; cx.textAlign='center'; cx.fillStyle='#fff';
    if(p.hunger<50) { cx.font='24px serif'; cx.fillText('🍖', p.x+dw*.35, p.y-dh+bob-10); }
    else if(p.happy<50) { cx.font='24px serif'; cx.fillText('😢', p.x+dw*.35, p.y-dh+bob-10); }
  });
  // vòng tròn đánh dấu điểm đến của thú đang chọn
  PETS.forEach(p=>{
    if(!p.target) return;
    const k=(t*2)%1;
    cx.save(); cx.strokeStyle='rgba(255,230,90,'+(0.9-k*0.6)+')'; cx.lineWidth=4;
    cx.beginPath(); cx.ellipse(p.target.x,p.target.y,14+k*16,(14+k*16)*.4,0,0,Math.PI*2); cx.stroke();
    cx.fillStyle='rgba(255,230,90,.9)'; cx.beginPath(); cx.ellipse(p.target.x,p.target.y,5,2.5,0,0,Math.PI*2); cx.fill(); cx.restore();
  });
  
  //Quả cầu lửa
  // 1. Vẽ quả cầu lửa đang bay (sprite 1-5)
  if (typeof PROJECTILES !== 'undefined') {
    PROJECTILES.forEach(p => {
      cx.save();
      cx.translate(p.x, p.y);
      cx.rotate(p.rotation);

      const img = IMGS[`shiba_fireball_${p.animFrame + 1}`];
      if (img && img.complete && img.naturalWidth) {
        const w = 80;
        const h = w * (img.naturalHeight / img.naturalWidth);
        cx.drawImage(img, -w / 2, -h / 2, w, h);
      }
      cx.restore();
    });
  }

  // 2. Vẽ hiệu ứng vụ nổ khi va chạm (sprite 6-11)
  if (typeof EXPLOSIONS !== 'undefined') {
    EXPLOSIONS.forEach(ex => {
      cx.save();
      cx.translate(ex.x, ex.y);

      const img = IMGS[`shiba_explosion_${ex.frame}`];
      if (img && img.complete && img.naturalWidth) {
        const w = 140; // Kích thước vụ nổ
        const h = w * (img.naturalHeight / img.naturalWidth);
        cx.drawImage(img, -w / 2, -h / 2, w, h);
      }
      cx.restore();
    });
  }
}
