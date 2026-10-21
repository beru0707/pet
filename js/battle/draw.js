/* ==================================================================
   BATTLE – VẼ
   Thanh máu kiểu khung đá, vẽ địch / thanh máu pet / chữ bay trên canvas phủ #bt-ov (không đụng render/*).
   ================================================================== */

// ============ VẼ (canvas phủ lên canvas game) ============
// Thanh máu kiểu khung đá + khe tối + các ô màu chia vạch. kind: 'pet' (xanh lá) | 'enemy' (đỏ -> cam)
const BAR_COLS = { pet:['#1c6e2c','#2f9e3f','#55c84a','#9be45a'], enemy:['#9b1c2c','#cf3a2e','#e8742a','#f6a53a'] };
function btBar(x, y, w, frac, kind){
  const h = Math.round(w*.2), r = h*.3, x0 = x - w/2, N = 8;
  frac = Math.max(0, Math.min(1, frac));
  const rr = (a,b,c,d,e) => { oc.beginPath(); if(oc.roundRect) oc.roundRect(a,b,c,d,e); else oc.rect(a,b,c,d); };
  oc.save();
  oc.fillStyle = '#4a3322'; rr(x0-2.5, y-2.5, w+5, h+5, r+2); oc.fill();                 // viền gỗ ngoài
  oc.fillStyle = '#80848b'; rr(x0, y, w, h, r); oc.fill();                                // khung đá
  oc.strokeStyle = '#2b2c31'; oc.lineWidth = 1.2; oc.stroke();
  oc.fillStyle = 'rgba(255,255,255,.22)'; oc.fillRect(x0+r, y+1, w-2*r, 1.5);            // vệt sáng mép trên
  const m = Math.max(2, h*.22), ix = x0+m, iy = y+m, iw = w-2*m, ih = h-2*m;
  oc.fillStyle = '#14141a'; rr(ix, iy, iw, ih, r*.6); oc.fill();                          // khe tối
  if(frac > 0){
    oc.save(); rr(ix, iy, iw*frac, ih, r*.6); oc.clip();
    const C = BAR_COLS[kind] || BAR_COLS.pet;
    const gx = oc.createLinearGradient(ix, 0, ix+iw, 0);                                   // màu chạy liền từ đầu đến cuối thanh
    C.forEach((c,i) => gx.addColorStop(i/(C.length-1), c));
    oc.fillStyle = gx; oc.fillRect(ix, iy, iw, ih);
    const gy = oc.createLinearGradient(0, iy, 0, iy+ih);                                   // bóng sáng trên, tối dưới
    gy.addColorStop(0, 'rgba(255,255,255,.28)'); gy.addColorStop(.5, 'rgba(255,255,255,0)'); gy.addColorStop(1, 'rgba(0,0,0,.25)');
    oc.fillStyle = gy; oc.fillRect(ix, iy, iw, ih);
    oc.restore();
  }
  oc.restore();
}
function btDraw(t){
  const r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.round(r.width*dpr), h = Math.round(r.height*dpr);
  if(OV.width !== w || OV.height !== h){ OV.width = w; OV.height = h; }
  Object.assign(OV.style, {display:'block', left:r.left+'px', top:r.top+'px', width:r.width+'px', height:r.height+'px'});
  const k = w / CW;
  oc.setTransform(1,0,0,1,0,0); oc.clearRect(0,0,w,h); oc.setTransform(k,0,0,k,0,0);
  if(BT.phase !== 'fight' && BT.phase !== 'result') return;
  // địch (xa -> gần)
  [...BT.enemies].sort((a,b) => a.y - b.y).forEach(e => {
    const T = e.T, A = T.anim[e.st] || T.anim.travel, fr = BT.frames[e.type] && BT.frames[e.type][A.sheet];
    oc.save(); oc.globalAlpha = Math.min(1, e.born*2) * (e.die ? Math.max(0, e.die/.6) : 1);
    oc.translate(e.x, e.y); if(e.face < 0) oc.scale(-1, 1);
    if(e.flash > 0) oc.filter = 'brightness(2.4)';
    if(fr && fr.length){
      const idx = A.seq[Math.min(A.seq.length-1, Math.floor(e.tm * A.fps) % (e.st === 'travel' ? A.seq.length : 1e9))];
      const f = fr[Math.min(fr.length-1, idx)], hh = T.h * (A.scale ?? 1), ww = hh * f.width / f.height;
      oc.drawImage(f, -ww/2, -hh*T.anchor, ww, hh);
    } else {   // hình tạm khi chưa có sprite
      const pulse = 1 + Math.sin(t*6 + e.seed)*.06;
      oc.fillStyle = '#c93b4a'; oc.beginPath(); oc.ellipse(0, -40, 46*pulse, 40*pulse, 0, 0, 7); oc.fill();
      oc.fillStyle = '#fff'; oc.beginPath(); oc.arc(14, -48, 8, 0, 7); oc.fill();
    }
    oc.restore();
    if(!e.die) btBar(e.x, e.y - (e.st === 'travel' ? 70 : T.h*.8), 90, e.hp/e.max, 'enemy');
  });
  // pet: thanh máu 
  PETS.forEach(p => {
    if(p.map !== BT.map || p.bdead || !p.bmax) return;
    const by = p.y - (p.def.barDY ?? BATTLE_CFG.barDY) * (p.def.scale || 1);
    btBar(p.x, by, 84, p.bhp/p.bmax, 'pet');
  });
  // chữ bay
  oc.textAlign = 'center'; oc.font = '700 26px Fredoka, sans-serif'; oc.lineWidth = 5; oc.strokeStyle = 'rgba(0,0,0,.75)';
  BT.fx.forEach(f => { oc.globalAlpha = Math.min(1, f.life/f.max*1.6); oc.strokeText(f.txt, f.x, f.y); oc.fillStyle = f.col; oc.fillText(f.txt, f.x, f.y); });
  oc.globalAlpha = 1;
}
