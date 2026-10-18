/* ==================================================================
   RENDER – VẼ MỘT CON THÚ
   Chọn đúng khung (đi / đứng / ngủ / tấn công), cân kích thước theo vùng nhìn thấy (imgBox), bóng, vầng sáng khi chọn, biểu tượng đói / buồn / ngủ.
   ================================================================== */

// Vùng NHÌN THẤY (không trong suốt) của ảnh. Dùng để cân kích thước ảnh đứng yên/ngủ với ảnh đi bộ
// (mỗi file PNG có lề trong suốt khác nhau nên cùng 'scale' vẫn ra nhân vật to nhỏ khác nhau).
// Chỉ đọc được khi mở game qua http(s)/Live Server; mở file:// trình duyệt chặn -> tự bỏ qua (dùng idleScale/sleepScale thủ công).
function imgBox(img){
  if(!img || !img.complete || !img.naturalWidth) return null;
  if(img._bb !== undefined) return img._bb || null;
  try{
    const s = Math.min(1, 256/Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1,Math.round(img.naturalWidth*s)), h = Math.max(1,Math.round(img.naturalHeight*s));
    const c = document.createElement('canvas'); c.width=w; c.height=h;
    const g = c.getContext('2d'); g.drawImage(img,0,0,w,h);
    const d = g.getImageData(0,0,w,h).data; let x0=w,y0=h,x1=-1,y1=-1;
    for(let y=0;y<h;y++) for(let x=0;x<w;x++) if(d[(y*w+x)*4+3]>16){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
    if(x1<0){ img._bb=false; return null; }
    img._bb = {x0:x0/s, x1:(x1+1)/s, y0:y0/s, y1:(y1+1)/s}; img._bb.w=img._bb.x1-img._bb.x0; img._bb.h=img._bb.y1-img._bb.y0;
    return img._bb;
  }catch(e){ img._bb=false; return null; }
}

// Vẽ 1 con thú p tại thời điểm t (gọi từ drawMapScene)
function drawPet(p, t){
  const sz=pSize(p.y);
  const mv=Math.abs(p.vx)>3||Math.abs(p.vy)>3;
  const bob=mv?Math.abs(Math.sin(t*8+p.phase))*-6:Math.sin(t*2.5+p.phase)*-2;
  const br=1+Math.sin(t*2.5+p.phase)*.015;
  
  const src = IMGS.pets;
  // Lấy ảnh đúng: animation frame hoặc ảnh đơn
  let customImg = null, fitImg = null, fitMode = null, userK = 1;
  if (p.isAttacking) {
    // Ưu tiên lấy ảnh từ thư mục attack
    const atkKey = p.def.name.toLowerCase() + '_attack_';
    customImg = IMGS[atkKey + (p.attackFrame + 1)];
    fitImg = IMGS[atkKey + '1']; fitMode = p.def.attackFit || 'height'; userK = p.def.attackScale || 1;   // cân theo khung 1 để các khung không bị lúc to lúc nhỏ
  } else if (p.def.animFrames) {
    const walkKey = p.def.imgKey.replace('_anim','_');
    if (p.sleeping) {                                                                            // đang ngủ
      const SF = p.def.sleepFrames;
      if (SF && SF.length > 1) { customImg = SF[Math.floor(t * (p.def.sleepFps || 6) + p.phase * 7) % SF.length]; fitImg = SF[0]; }
      else customImg = p.def.sleepImg || p.def.idleImg || IMGS[walkKey + 1];
      if (customImg !== IMGS[walkKey + 1]) { fitMode = p.def.sleepFit || 'none'; userK = p.def.sleepScale || 1; }
    } else if (p.moving) {                                                                       // đang đi: khung đi bộ
      customImg = IMGS[walkKey + (p.animFrame + 1)];
    } else {                                                                                     // đứng yên
      const IF = p.def.idleFrames;
      if (IF && IF.length > 1) {                                                                 // animation chớp mắt (thư mục idle)
        customImg = IF[Math.floor(t * (p.def.idleFps || 12) + p.phase * 7) % IF.length]; fitImg = IF[0];
      } else customImg = p.def.idleImg || IMGS[walkKey + 1];
      if (customImg !== IMGS[walkKey + 1]) { fitMode = p.def.idleFit || 'none'; userK = p.def.idleScale || 1; }
    }
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

  // Kích thước + vị trí thực khi vẽ: mặc định = ảnh đi bộ; riêng ảnh đứng yên/ngủ được cân theo vùng nhìn thấy của nhân vật
  let drawH = dh, drawW = dw, offL = -dw/2, offT = -dh;
  if (fitMode && customImg) {
    const fi = fitImg || customImg;                                           // ảnh dùng để đo (ảnh đứng yên/ngủ: chính nó; tấn công: khung 1)
    const ref = IMGS[p.def.imgKey.replace('_anim','_') + 1], bb = imgBox(fi), rb = imgBox(ref);
    let kpx = dh * userK / (fi.naturalHeight || 1);                           // số pixel màn hình cho mỗi pixel ảnh gốc
    if (bb && rb && fitMode !== 'none') {
      const vis = fitMode === 'width' ? (rb.w/ref.naturalHeight)/(bb.w/fi.naturalHeight)
                                      : (rb.h/ref.naturalHeight)/(bb.h/fi.naturalHeight);
      kpx = dh * vis * userK / fi.naturalHeight;
      const k0 = dh/ref.naturalHeight;
      offT = -(ref.naturalHeight - rb.y1) * k0 - bb.y1 * kpx;                 // chân nhân vật cùng vạch với lúc đi
      offL = ((rb.x0+rb.x1)/2 - ref.naturalWidth/2) * k0 - ((bb.x0+bb.x1)/2) * kpx;   // cùng tâm ngang với lúc đi
    }
    drawH = kpx * customImg.naturalHeight; drawW = kpx * customImg.naturalWidth;
    if (!(bb && rb && fitMode !== 'none')) { offL = -drawW/2; offT = -drawH; }
  }

  //Scale 
  const ws = (p.moving && !p.sleeping && !p.isAttacking && p.def.walkScale) || 1;
  if (ws !== 1) { drawH *= ws; drawW *= ws; offL = -drawW/2; offT = -drawH; }

  softShadow(p.x + dw*ws*.07, p.y+3, dw*ws*.42, dh*ws*.11, 0.36 * (1 + actualBob/60));

  cx.save();
  const paint = () => {   // vẽ ảnh thú (lật theo hướng nhìn)
    if(!(customImg?.complete && customImg.naturalWidth)) return;
    if(p.facingLeft){ cx.save(); cx.translate(rd(p.x-offL),rd(p.y+offT+actualBob)); cx.scale(-1,1); cx.drawImage(customImg,0,0,drawW,drawH); cx.restore(); }
    else cx.drawImage(customImg,rd(p.x+offL),rd(p.y+offT+actualBob),drawW,drawH);
  };
  if(p.selected){   // vầng sáng ôm theo hình thú: viền trắng-vàng sát + 2 lớp quầng vàng, chồng nhiều lần cho đậm
    const k = cx.getTransform().a, pulse = 1 + .2*Math.sin(t*4);
    const L = [ ['rgba(255,252,200,1)', 3,  2],    // viền sát, gần như trắng
                ['rgba(255,226,80,1)',  12, 3],    // quầng trong, vàng đậm
                ['rgba(255,190,20,1)',  34*pulse, 3] ];   // quầng ngoài, rộng và nhấp nhô
    L.forEach(([c,b,n]) => { cx.shadowColor = c; cx.shadowBlur = b*k; for(let i=0;i<n;i++) paint(); });
  } else paint();
  cx.restore();

  // (đã xoá tên dưới chân)
  cx.font='24px serif'; cx.textAlign='center'; cx.fillStyle='#fff';
  if(p.sleeping) { cx.font='26px serif'; cx.fillText('💤', p.x+dw*.32, p.y-dh+bob-6); }
  else if(p.hunger<50) { cx.font='24px serif'; cx.fillText('🍖', p.x+dw*.35, p.y-dh+bob-10); }
  else if(p.happy<50) { cx.font='24px serif'; cx.fillText('😢', p.x+dw*.35, p.y-dh+bob-10); }
}
