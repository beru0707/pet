/* ==================================================================
   RENDER – CẢNH
   Vẽ 1 map (nền, thú xếp theo trục y, hiệu ứng) và chế độ xem toàn bộ map.
   ================================================================== */

function drawMapScene(mid,t){
  { const B=IMGS['bg_'+mid];
    if(B?.complete && B.naturalWidth){ const k=Math.max(CW/B.naturalWidth,CH/B.naturalHeight),w=B.naturalWidth*k,h=B.naturalHeight*k; cx.drawImage(B,(CW-w)/2,(CH-h)/2,w,h); }
    else { cx.fillStyle='#86bf3b'; cx.fillRect(0,0,CW,CH); } }
  PETS.filter(p=>p.map===mid).sort((a,b)=>a.y-b.y).forEach(p => drawPet(p, t));
  drawTargetMarkers(mid, t);
  drawProjectiles(mid);
  drawExplosions(mid);
}

// ---- Xem toàn bộ map: mọi map vẽ cùng lúc dạng lưới thu nhỏ (thú vẫn chạy thật) ----
function drawScene(t){
  if(VIEW.overview) drawOverview(t); else drawMapScene(ACTIVE_MAP, t);
}
function drawOverview(t){
  const n = MAPS.length, cols = n<=1 ? 1 : n<=4 ? 2 : 3, rows = Math.ceil(n/cols), gap = 28, pad = 28;
  cx.fillStyle = '#10200a'; cx.fillRect(0,0,CW,CH);
  const aw = (CW - pad*2 - gap*(cols-1)) / cols, ah = (CH - pad*2 - gap*(rows-1)) / rows;
  const k = Math.min(aw/CW, ah/CH), tw = CW*k, th = CH*k;
  const gx = (CW - (tw*cols + gap*(cols-1))) / 2, gy = (CH - (th*rows + gap*(rows-1))) / 2;
  VIEW.tiles = [];
  MAPS.forEach((m,i)=>{
    const c = i % cols, r = (i/cols)|0, x = gx + c*(tw+gap), y = gy + r*(th+gap);
    cx.save(); cx.beginPath(); cx.rect(x,y,tw,th); cx.clip();
    cx.translate(x,y); cx.scale(k,k); drawMapScene(m.id,t);
    cx.restore();
    const cur = m.id === ACTIVE_MAP, cnt = PETS.filter(p=>p.map===m.id).length;
    cx.lineWidth = cur ? 6 : 3; cx.strokeStyle = cur ? '#ffd54a' : '#ffffff66'; cx.strokeRect(x,y,tw,th);
    const lab = m.name + ' · ' + cnt + ' pet';
    cx.font = '600 30px Fredoka, sans-serif'; cx.textAlign = 'left'; cx.textBaseline = 'alphabetic';
    const w = cx.measureText(lab).width + 24;
    cx.fillStyle = '#000a'; cx.fillRect(x+10, y+10, w, 44);
    cx.fillStyle = '#fff'; cx.fillText(lab, x+22, y+43);
    VIEW.tiles.push({id:m.id, x, y, w:tw, h:th, lw:w+10});
  });
}
