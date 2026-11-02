/* ==================================================================
   MAPS
   Map đang xem, đổi map, thả thú vào map.
   Mọi map đều chạy liên tục: thú ở map không xem vẫn đi lại bình thường.
   ================================================================== */

let ACTIVE_MAP = MAPS[0].id;        // map đang hiển thị
const VIEW = { overview:false, tiles:[] };   // overview = đang xem toàn bộ map cùng lúc
function setOverview(on){
  on = !!on; if(VIEW.overview === on) return;
  VIEW.overview = on;
  if(on){
    PETS.forEach(p => { p.selected = false; p.target = null; }); closePetPanel();
    for(const k in KEYS) KEYS[k] = false;
    toast('Chọn pet để điều khiển · bấm nhãn tên map để vào map');
    MAPS.forEach(m => ensureMap(m.id));
  }
}
const mapById = id => MAPS.find(m => m.id === id);

function setActiveMap(id){
  if(!mapById(id) || id === ACTIVE_MAP) return;
  PETS.forEach(p => { p.selected = false; p.target = null; });
  closePetPanel();
  for(const k in KEYS) KEYS[k] = false;
  ACTIVE_MAP = id; state.activeMap = id; saveGame();   // nhớ map đang xem
  if(bgSrc(id)) setBgVar(bgSrc(id));
  ensureMap(id);
  toast('Map: ' + mapById(id).name);
}

// Đặt thú vào map mid tại (x,y); nếu chỗ đó đi không được thì tìm chỗ đi được gần nhất
function placePetAt(p, x, y, mid = ACTIVE_MAP){
  x = Math.max(100, Math.min(CW-100, x)); y = Math.max(180, Math.min(950, y));
  let best = walkable(x,y) ? {x,y} : null;
  for(let r=24; r<=480 && !best; r+=24)
    for(let a=0; a<16; a++){
      const nx = x + Math.cos(a*Math.PI/8)*r, ny = y + Math.sin(a*Math.PI/8)*r*.6;
      if(nx>=100 && nx<=CW-100 && ny>=180 && ny<=950 && walkable(nx,ny)){ best = {x:nx,y:ny}; break; }
    }
  if(!best) best = spawnPos();
  Object.assign(p, { map:mid, x:best.x, y:best.y, vx:0, vy:0, target:null, sleepUntil:0, idleUntil:0, nextTurn:0 });
  if(p.tvx !== undefined){ p.tvx = 0; p.tvy = 0; }
  ensurePet(p);   // thú vừa thả có thể chưa nạp ảnh
  saveGame();
}
