/* ==================================================================
   PETS – VÙNG ĐI ĐƯỢC + KHỞI TẠO
   Kiểm tra điểm có đi được không, chỗ xuất hiện, tạo danh sách PETS từ PET_DEF, cỡ thú.
   ================================================================== */

function inPoly(px, py, poly) {
  let inside = false;
  for (let i=0, j=poly.length-1; i<poly.length; j=i++) {
    const [xi,yi]=poly[i], [xj,yj]=poly[j];
    if (((yi>py)!==(yj>py)) && (px < (xj-xi)*(py-yi)/(yj-yi)+xi)) inside=!inside;
  }
  return inside;
}
function walkable(x, y) {
  if (!inPoly(x, y, WALK_POLY)) return false;
  for (const z of FORBIDDEN) {
    if (z.type==='rect') { if (x>=z.x && x<=z.x+z.w && y>=z.y && y<=z.y+z.h) return false; }
    else { if ((x-z.cx)**2+(y-z.cy)**2 < z.r*z.r) return false; }
  }
  return !blockedByItem(x, y);
}
let PETS = [];
function spawnPos(){
  for(let i=0;i<300;i++){
    const x = 200+Math.random()*(CW-436), y = 300+Math.random()*600;
    if(walkable(x,y)) return {x,y};
  }
  return {x:CW/2,y:CH/2};
}

function initPets(){
  PETS = PET_DEF.map((def, idx) => {
    const saved = state.petsData[idx] || {};
    // map của thú: dữ liệu cũ chưa có -> theo PETS_START_PLACED; null = đang nằm trong danh sách (chưa thả)
    let map = saved.map !== undefined ? saved.map : (PETS_START_PLACED ? MAPS[0].id : null);
    if(map && !MAPDATA[map]) map = MAPS[0].id;
    SIM_MAP = map;
    const sp = (saved.x && saved.y) ? {x:saved.x, y:saved.y} : spawnPos();
    SIM_MAP = null;
    return {
      def, map, x:sp.x, y:sp.y, vx:0, vy:0, phase:Math.random()*7, nextTurn:0, idleUntil:0, facingLeft:false,
      hunger:saved.hunger??100, happy:saved.happy??100, energy:saved.energy??100, selected:false,
      animFrame:0, animTime:0   // dùng cho animation đa frame
    };
  });
}
function pSize(y){ return PET_BASE_SIZE; }
