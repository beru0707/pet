/* ==================================================================
   ASSETS – SPRITE SHEET
   Cắt sprite sheet thành từng khung (loadSheet). Lưới mặc định SHEET_DEFAULT (6×6); sheet khác lưới thì khai cols/rows trong config/pets.js.
   ================================================================== */

// ---------- SPRITE SHEET (1 ảnh ghép nhiều khung) ----------
// Trong PET_ANIM mỗi thú khai báo: walkSheet / idleSheet / attackSheet

const _yield = () => new Promise(r => setTimeout(r, 0));

async function loadSheet(spec){
  const o = typeof spec === 'string' ? {src:spec} : spec;
  const max = o.max || SHEET_DEFAULT.max;
  const im = await tryImg(o.src);
  if(!im) return null;
  let cols = o.cols || SHEET_DEFAULT.cols, rows = o.rows || SHEET_DEFAULT.rows;
  const W = im.naturalWidth, H = im.naturalHeight, cw = W/cols, ch = H/rows;
  const k = Math.min(1, max/Math.max(cw,ch)), tw = Math.max(1,Math.round(cw*k)), th = Math.max(1,Math.round(ch*k));
  const total = cols*rows;
  const cut = n => {   // cắt khung số n ra 1 canvas riêng
    const c = n % cols, r = (n/cols)|0, sx = Math.round(c*cw), sy = Math.round(r*ch);
    const cv2 = document.createElement('canvas'); cv2.width = tw; cv2.height = th;
    cv2.getContext('2d').drawImage(im, sx, sy, Math.round((c+1)*cw)-sx, Math.round((r+1)*ch)-sy, 0, 0, tw, th);
    cv2.complete = true; cv2.naturalWidth = tw; cv2.naturalHeight = th;   // cho giống thẻ <img> để phần còn lại của game dùng chung
    return cv2;
  };
  let count = Math.min(o.frames || total, total);
  const frames = [];
  if(!o.frames){   // tự bỏ các ô trống cuối sheet: chỉ cắt thử từ ô cuối ngược lên tới ô có hình, không cắt cả lưới rồi vứt
    const empty = f => { try{ const d = f.getContext('2d').getImageData(0,0,f.width,f.height).data; for(let i=3;i<d.length;i+=4) if(d[i]>8) return false; return true; }catch(e){ return false; } };
    let last = null;
    while(count > 1){ last = cut(count-1); if(!empty(last)) break; count--; last = null; }
    for(let n=0; n<count-(last?1:0); n++){
      frames.push(cut(n));
      if(window.GAME_RUNNING && n % 9 === 8) await _yield();   // đang chơi: nhường luồng giữa các lần cắt để không giật
    }
    if(last) frames.push(last); else if(count === 1 && !frames.length) frames.push(cut(0));
  } else {
    for(let n=0; n<count; n++){
      frames.push(cut(n));
      if(window.GAME_RUNNING && n % 9 === 8) await _yield();
    }
  }
  return frames;
}
