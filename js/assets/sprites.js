/* ==================================================================
   ASSETS – SPRITE SHEET
   Tự nhận lưới cột / hàng của sprite sheet (detectGrid) và cắt thành từng khung (loadSheet).
   ================================================================== */

// ---------- SPRITE SHEET (1 ảnh ghép nhiều khung, tự nhận lưới + tự đếm khung) ----------
// Trong PET_ANIM mỗi thú khai báo: walkSheet / idleSheet / sleepSheet / attackSheet
//   dạng ngắn: 'assets/voltreaver/walk.png'  -> game TỰ NHẬN số cột / hàng / số khung (6x6, 5x3, 8x1 ... đều được)
//   dạng đầy đủ (khi cần ép tay): {src:'...', cols:5, rows:3, frames:13}  (ghi cột nào / hàng nào thì dùng cái đó, còn lại tự nhận)
// Cách tự nhận: tìm số cột/hàng lớn nhất sao cho các đường chia ô đều rơi vào khoảng TRONG SUỐT giữa các nhân vật.
//   Sheet phải có lề trong suốt giữa các khung; chỉ làm được khi chạy qua http/https (Live Server...). Mở file:// thì trình duyệt chặn
//   đọc điểm ảnh -> dùng cols/rows/frames ghi tay (không ghi thì lấy SHEET_DEFAULT).
// Số khung = số ô tính đến ô cuối cùng có hình (ô trống ở cuối bị bỏ). Ô chiếm chỗ nhưng trống ở giữa vẫn giữ.
function detectGrid(im){
  const s = Math.min(1, 1200/Math.max(im.naturalWidth, im.naturalHeight)), w = Math.max(1,Math.round(im.naturalWidth*s)), h = Math.max(1,Math.round(im.naturalHeight*s));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.drawImage(im,0,0,w,h);
  const d = g.getImageData(0,0,w,h).data;                      // file:// -> ném lỗi, nơi gọi sẽ bắt
  const colSum = new Uint32Array(w), rowSum = new Uint32Array(h);
  for(let y=0;y<h;y++) for(let x=0;x<w;x++) if(d[(y*w+x)*4+3] > 24){ colSum[x]++; rowSum[y]++; }
  const pick = (sum, len, other) => {
    const tol = Math.max(2, Math.round(other*0.004)); let best = 1;
    for(let n=2; n<=48; n++){
      let ok = true;
      for(let k=1; k<n && ok; k++){ const b = Math.round(k*len/n); for(let o=-1;o<=1;o++){ if(sum[Math.min(len-1,Math.max(0,b+o))] > tol){ ok = false; break; } } }
      for(let k=0; k<n && ok; k++){ const a = Math.round(k*len/n), z = Math.round((k+1)*len/n); let any = false; for(let i=a;i<z;i++) if(sum[i] > tol){ any = true; break; } if(!any) ok = false; }   // mỗi cột/hàng ô đều phải có hình
      if(ok) best = n;
    }
    return best;
  };
  return {cols: pick(colSum,w,h), rows: pick(rowSum,h,w)};
}
let _sheetWarned = false;
async function loadSheet(spec){
  const o = typeof spec === 'string' ? {src:spec} : spec;
  const max = o.max || SHEET_DEFAULT.max;
  const im = await tryImg(o.src);
  if(!im) return null;
  let cols = o.cols, rows = o.rows;
  if(!(cols && rows)){
    try{ const g = detectGrid(im); cols = cols || g.cols; rows = rows || g.rows; }
    catch(e){
      cols = cols || SHEET_DEFAULT.cols; rows = rows || SHEET_DEFAULT.rows;
      if(!_sheetWarned){ _sheetWarned = true; console.warn('[PET_ANIM] Không tự nhận được lưới sprite sheet (đang mở file://, trình duyệt chặn đọc ảnh). Chạy qua http/https (Live Server) hoặc ghi {src, cols, rows, frames} cho từng sheet. Tạm dùng lưới '+cols+'x'+rows+'.'); }
    }
  }
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
