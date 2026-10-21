/* ==================================================================
   ASSETS – SPRITE SHEET
   Cắt sprite sheet thành từng khung (loadSheet). Lưới mặc định SHEET_DEFAULT (6×6); sheet khác lưới thì khai cols/rows trong config/pets.js.
   ================================================================== */

// ---------- SPRITE SHEET (1 ảnh ghép nhiều khung) ----------
// Trong PET_ANIM mỗi thú khai báo: walkSheet / idleSheet / sleepSheet / attackSheet

async function loadSheet(spec){
  const o = typeof spec === 'string' ? {src:spec} : spec;
  const max = o.max || SHEET_DEFAULT.max;
  const im = await tryImg(o.src);
  if(!im) return null;
  let cols = o.cols || SHEET_DEFAULT.cols, rows = o.rows || SHEET_DEFAULT.rows; 
  const W = im.naturalWidth, H = im.naturalHeight, cw = W/cols, ch = H/rows;
  const k = Math.min(1, max/Math.max(cw,ch)), tw = Math.max(1,Math.round(cw*k)), th = Math.max(1,Math.round(ch*k));
  const frames = [];
  for(let n=0; n<cols*rows; n++){
    const c = n % cols, r = (n/cols)|0, sx = Math.round(c*cw), sy = Math.round(r*ch);
    const cv2 = document.createElement('canvas'); cv2.width = tw; cv2.height = th;
    cv2.getContext('2d').drawImage(im, sx, sy, Math.round((c+1)*cw)-sx, Math.round((r+1)*ch)-sy, 0, 0, tw, th);
    cv2.complete = true; cv2.naturalWidth = tw; cv2.naturalHeight = th;   // cho giống thẻ <img> để phần còn lại của game dùng chung
    frames.push(cv2);
  }
  let count = o.frames || frames.length;
  if(!o.frames){   // tự bỏ các ô trống cuối sheet
    try{
      const empty = f => { const d = f.getContext('2d').getImageData(0,0,f.width,f.height).data; for(let i=3;i<d.length;i+=4) if(d[i]>8) return false; return true; };
      while(count > 1 && empty(frames[count-1])) count--;
    }catch(e){}
  }
  return frames.slice(0, count);
}
