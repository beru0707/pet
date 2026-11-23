/* ==================================================================
   RENDER – VẼ MỘT CON THÚ
   Chọn đúng khung (đi / đứng / tấn công), cân kích thước theo vùng nhìn thấy (imgBox), bóng, vầng sáng khi chọn.
   ================================================================== */

// Vùng NHÌN THẤY (không trong suốt) của ảnh. Dùng để cân kích thước ảnh đứng yên với ảnh đi bộ
// (mỗi file PNG có lề trong suốt khác nhau nên cùng 'scale' vẫn ra nhân vật to nhỏ khác nhau).
// Chỉ đọc được khi mở game qua http(s)/Live Server; mở file:// trình duyệt chặn -> tự bỏ qua (dùng idleScale thủ công).
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
  const br=1;   // không nhún kích thước
  
  // Hoạt ảnh phụ (chết > bị đánh > nhảy > chạy): chọn trạng thái dựa trên mốc thời gian
  const EX = p.def.ex, FPS_EX = 12;
  let exKey = null, exFrame = 0, exLift = 0;
  if (EX && !p.def.dWalk) {
    const at = (k, t0, fps) => { const n = EX[k] ? EX[k].frames.length : 0, i = (t - t0) * (fps || FPS_EX); return (n && i >= 0 && i < n) ? Math.floor(i) : -1; };
    if (p.bdead && EX.dead) { exKey = 'dead'; exFrame = Math.min(EX.dead.frames.length - 1, Math.max(0, Math.floor((t - (p.deadAt || 0)) * FPS_EX))); }
    else if (!p.isAttacking && p.hurtAt !== undefined && (exFrame = at(p.hurtKind || 'hurt', p.hurtAt)) >= 0) exKey = p.hurtKind || 'hurt';
    else if (p.jumpAt !== undefined && EX.jumpup && EX.jumpfall) {
      const nu = EX.jumpup.frames.length, nf = EX.jumpfall.frames.length, i = Math.floor((t - p.jumpAt) * FPS_EX);
      if (i >= 0 && i < nu + nf) {
        const ph = (t - p.jumpAt) * FPS_EX / (nu + nf);   // 0..1: độ cao theo vòng cung
        exLift = Math.sin(Math.PI * ph) * .18;
        if (p.isAttacking && EX.jumpthrow) { exKey = 'jumpthrow'; exFrame = Math.min(p.attackFrame, EX.jumpthrow.frames.length - 1); }
        else if (i < nu) { exKey = 'jumpup'; exFrame = i; } else { exKey = 'jumpfall'; exFrame = i - nu; }
      }
    }
    if (!exKey && EX.run && p.moving && !p.isAttacking && Math.hypot(p.vx, p.vy) > 70) { exKey = 'run'; exFrame = -1; }
  }

  // Đổi trạng thái: nhớ giờ vào trạng thái mới để hoạt ảnh đứng yên chạy từ khung 1
  const stNow = exKey ? 'x_' + exKey : p.isAttacking ? 'attack' : p.moving ? 'walk' : 'idle';
  if (p._stPrev !== stNow) {
    p._stPrev = stNow; p._stT0 = t;
  }
  const lt = t - (p._stT0 || 0);   // thời gian kể từ khi vào trạng thái hiện tại

  const src = IMGS.pets;
  // Lấy ảnh đúng: animation frame hoặc ảnh đơn
  let customImg = null, fitImg = null, fitMode = null, userK = 1;
  if (p.isAttacking) {
    // Ưu tiên lấy ảnh từ thư mục attack
    const kind = p.atkKind || 'attack', atkKey = p.def.name.toLowerCase() + '_' + kind + '_';
    customImg = IMGS[atkKey + (p.attackFrame + 1)];
    fitImg = IMGS[atkKey + '1']; fitMode = p.def[kind+'Fit'] || 'height'; userK = p.def[kind+'Scale'] || 1;   // cân theo khung 1 để các khung không bị lúc to lúc nhỏ
  } else if (p.def.animFrames) {
    const walkKey = p.def.imgKey.replace('_anim','_');
    if (p.moving) {                                                                       // đang đi: khung đi bộ
      customImg = IMGS[walkKey + (p.animFrame + 1)];
    } else {                                                                                     // đứng yên
      const IF = p.def.idleFrames;
      if (IF && IF.length > 1) {                                                                 // animation chớp mắt (thư mục idle)
        customImg = IF[Math.floor(lt * (p.def.idleFps || 12)) % IF.length]; fitImg = IF[0];
      } else customImg = p.def.idleImg || IMGS[walkKey + 1];
      if (customImg !== IMGS[walkKey + 1]) { fitMode = p.def.idleFit || 'none'; userK = p.def.idleScale || 1; }
    }
  } else if (p.def.imgKey) {
    customImg = IMGS[p.def.imgKey];
  }

  // Nhân vật 4 hướng: chọn khung theo p.dir (front/back/left/right), không lật ảnh
  if (p.def.dWalk) {
    const dr = p.dir || 'front';
    fitImg = null; fitMode = null; userK = 1;
    if (p.isAttacking) { const A = p.def.dAttack && p.def.dAttack[dr]; customImg = A ? A[Math.min(p.attackFrame, A.length-1)] : null; }
    else if (p.moving) { const W = p.def.dWalk[dr]; customImg = W ? W[p.animFrame % W.length] : null; }
    else { const I = p.def.dIdle && p.def.dIdle[dr]; customImg = I ? I[Math.floor(lt * (p.def.idleFps || 12)) % I.length] : null; }
  }

  let exDX = 0, exDY = 0;
  if (exKey) {
    const e = EX[exKey], n = e.frames.length;
    customImg = e.frames[exFrame >= 0 ? exFrame : Math.floor(lt * 14) % n];
    fitImg = null; fitMode = null; userK = e.scale; exDX = e.dx; exDY = e.dy;
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

  // Kích thước CỐ ĐỊNH: chiều cao khung = dh * scale của sheet (không tự đo vùng nhìn thấy để phóng to / thu nhỏ). Chân đặt ở đáy khung, giữa theo chiều ngang.
  let drawH = dh * userK, drawW = drawH * ratio;
  let offL = -drawW/2, offT = -drawH;

  const st = p.isAttacking ? (p.atkKind || 'attack') : !p.moving ? 'idle' : null;   // trạng thái đang vẽ
  if (customImg && st) { offL += (p.def[st+'DX'] || 0) * drawH; offT += (p.def[st+'DY'] || 0) * drawH; }

  if (exKey) { offL += exDX * drawH; offT += (exDY - exLift) * drawH; }

  //Scale 
  const ws = (p.moving && !p.isAttacking && p.def.walkScale) || 1;
  if (ws !== 1) { drawH *= ws; drawW *= ws; offL = -drawW/2; offT = -drawH; }


  cx.save();
  const paint = () => {   // vẽ ảnh thú (lật theo hướng nhìn)
    if(!(customImg?.complete && customImg.naturalWidth)) return;
    if((!!p.facingLeft !== !!p.def.spriteLeft) && !p.def.dWalk){ cx.save(); cx.translate(rd(p.x-offL),rd(p.y+offT+actualBob)); cx.scale(-1,1); cx.drawImage(customImg,0,0,drawW,drawH); cx.restore(); }
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
}
