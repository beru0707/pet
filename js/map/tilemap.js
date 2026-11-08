/* ==================================================================
   MAP DẠNG Ô (TILEMAP) – đọc JSON xuất từ Sprite Fusion
   - Ghép sẵn map vào canvas ẩn, mỗi khung chỉ cắt phần camera nhìn thấy.
   - Camera bám theo pet đang chọn (hoặc trọng tâm đội trong trận).
   - Va chạm theo ô (walkable) cho map có tilemap; map thường vẫn dùng cách cũ.
   - Cây "Trees front" được xếp lớp theo trục y cùng với pet / địch.
   Nạp file này SAU scene.js, maps.js, battle/*.js và TRƯỚC main.js.
   Cách bật cho 1 map: thêm tilemap + tileset vào dòng của map trong MAPS (config/world.js):
     {id:'grass', name:'Đồng cỏ', bg:'assets/background/grass.webp',
      tilemap:'assets/maps/grass.json', tileset:'assets/maps/spritesheet.png'}
   (bg vẫn giữ, dùng làm ảnh thu nhỏ trong menu và làm nền tạm lúc đang nạp)
   ================================================================== */

const TILEMAPS = {};                       // id map -> dữ liệu đã dựng
const CAM = {x:0, y:0, fx:0, fy:0};        // x,y đã làm tròn (dùng để vẽ); fx,fy là số thực

// Quy tắc va chạm: KHÔNG dùng cờ "collider" của Sprite Fusion vì layer Rocks có cả phần ruột
// (id 169) nằm dưới cỏ và layer Bridge cũng bị đánh dấu collider.
const TM_CFG = {
  petOnTop:  false,                                // true: pet luôn trên cùng. false: đứng SAU cây / nhà thì bị che, đứng TRƯỚC thì nằm trên cùng (xếp theo trục y)
  front:     ['Trees front', 'Buildings'],         // layer vẽ đè lên pet khi pet đứng sau (xếp theo y)
  ground:    ['Sand', 'Grass'],                    // có ô ở đây mới đi được (chỗ không có = nước)
  block:     ['Cliff'],                            // chặn hẳn
  footprint: ['Buildings'],                        // chỉ chặn hàng ô DƯỚI CÙNG của mỗi cột (chân nhà / tháp); phần trên đi vòng ra sau được
  rocksSolid: id => String(id) !== '169',          // Rocks: viền / vách (169 = ruột bờ đất, không chặn)
  topGrass:  ['Grass'],                            // ô viền Rocks mà có cỏ ở cùng ô thì vẫn đi được (phần cỏ nhìn thấy)
  high:      ['Grass', 'Bridge - horizontal', 'Bridge - vertical'],  // mặt bằng CAO (bậc cỏ, cầu): không đi thẳng xuống cát được
  connector: ['Stairs'],                           // đường rocks / cầu thang: chỗ duy nhất đổi giữa mặt cao và cát
  walkOver:  ['Stairs', 'Bridge - horizontal', 'Bridge - vertical'],  // luôn đi được, kể cả đè lên vách
};

// ---------- dựng map ----------
function tmBuild(T, j, img){
  const ts = j.tileSize, W = j.mapWidth, H = j.mapHeight, cols = Math.floor(img.naturalWidth / ts);
  T.ts = ts; T.mw = W; T.mh = H; T.w = W*ts; T.h = H*ts;
  const mk = () => { const c = document.createElement('canvas'); c.width = T.w; c.height = T.h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };
  const [under, gu] = mk(), [over, go] = mk();
  const front = new Set(TM_CFG.front), ground = new Set(TM_CFG.ground), block = new Set(TM_CFG.block), pass = new Set(TM_CFG.walkOver);
  const N = W*H, fg = new Uint8Array(N), gr = new Uint8Array(N), so = new Uint8Array(N), ps = new Uint8Array(N), rk = new Uint8Array(N), tg = new Uint8Array(N), fp = new Uint8Array(N), bid = new Int16Array(N).fill(-1), hi = new Uint8Array(N), cn = new Uint8Array(N);
  const topGrass = new Set(TM_CFG.topGrass), highL = new Set(TM_CFG.high), conn = new Set(TM_CFG.connector), foot = new Set(TM_CFG.footprint);
  let firstFront = j.layers.length;
  j.layers.forEach((L, i) => { if(front.has(L.name)) firstFront = Math.min(firstFront, i); });
  // JSON: layer đầu danh sách nằm TRÊN CÙNG -> vẽ từ cuối lên đầu
  for(let li = j.layers.length - 1; li >= 0; li--){
    const L = j.layers[li], isFront = front.has(L.name), above = li < firstFront;   // above: layer nằm trên Trees front (vd. Miscs)
    for(const t of L.tiles){
      const id = +t.id, k = t.y*W + t.x;
      if(t.x < 0 || t.y < 0 || t.x >= W || t.y >= H || !(id >= 0)) continue;
      const onTop = isFront || (above && fg[k]);   // layer nằm trên cây chỉ đè lên cây ở đúng ô có cây
      (onTop ? go : gu).drawImage(img, (id % cols)*ts, Math.floor(id / cols)*ts, ts, ts, t.x*ts, t.y*ts, ts, ts);
      if(isFront) fg[k] = 1;
      if(ground.has(L.name)) gr[k] = 1;
      if(block.has(L.name)) so[k] = 1;
      if(L.name === 'Rocks' && TM_CFG.rocksSolid(t.id)) rk[k] = 1;
      if(topGrass.has(L.name)) tg[k] = 1;
      if(highL.has(L.name)) hi[k] = 1;
      if(conn.has(L.name)) cn[k] = 1;
      if(foot.has(L.name)){ fp[k] = 1; bid[k] = id; }
      if(pass.has(L.name)) ps[k] = 1;
    }
  }
  // Hai ô công trình chồng dọc thuộc CÙNG 1 công trình khi id ô dưới lớn hơn id ô trên 2..8 (Sprite Fusion đánh id theo hàng, bước = bề ngang).
  // Nhà xây sát ngay dưới lâu đài (id chỉ lệch 1) là công trình KHÁC -> có chân và khối xếp lớp riêng.
  const same = (a, b) => { const d = bid[b] - bid[a]; return d >= 2 && d <= 8; };
  for(let k = 0; k < N; k++) if(fp[k] && (k + W >= N || !fp[k + W] || !same(k, k + W))) so[k] = 1;   // chân công trình: ô dưới cùng của mỗi cột
  T.under = under; T.over = over;
  T.walk = new Uint8Array(N);
  for(let k = 0; k < N; k++) T.walk[k] = (ps[k] || (gr[k] && !so[k] && (!rk[k] || tg[k]))) ? 1 : 0;
  // Phân tầng: ô CAO (có cỏ / cầu) và ô cát thấp. Ô cát nằm sát (8 hướng) ô cao thì chặn -> không đi thẳng lên / xuống được.
  // Ngoại lệ: ô cát sát cầu thang (connector) vẫn đi được, nên chỉ lên / xuống bằng đường rocks.
  const w0 = T.walk.slice();
  for(let y = 0; y < H; y++) for(let x = 0; x < W; x++){
    const k = y*W + x;
    if(!w0[k] || hi[k] || cn[k] || ps[k]) continue;
    let nearHigh = false, nearConn = false;
    for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++){
      const X = x + dx, Y = y + dy; if(X < 0 || Y < 0 || X >= W || Y >= H) continue;
      const n = Y*W + X; if(hi[n]) nearHigh = true; if(cn[n]) nearConn = true;
    }
    if(nearHigh && !nearConn) T.walk[k] = 0;
  }
  // cây: gom các ô liền nhau theo cột thành 1 "khối"; khối được xếp theo đáy của nó
  T.runs = [];
  for(let x = 0; x < W; x++){
    let y = 0;
    while(y < H){
      if(fg[y*W + x]){
        const y0 = y; y++;
        while(y < H && fg[y*W + x] && !(fp[(y-1)*W + x] !== fp[y*W + x] || (fp[y*W + x] && !same((y-1)*W + x, y*W + x)))) y++;   // tách khi đổi giữa cây và công trình, hoặc sang công trình khác
        T.runs.push({x, y0, y1:y - 1, b:fp[y0*W + x]});
      }
      else y++;
    }
  }
}
function loadTilemap(id){
  const m = mapById(id); if(!m || !m.tilemap) return Promise.resolve(null);
  if(TILEMAPS[id]) return TILEMAPS[id].promise;
  const T = TILEMAPS[id] = {ready:false};
  return T.promise = Promise.all([fetch(m.tilemap).then(r => r.json()), tryImg(m.tileset)]).then(([j, img]) => {
    if(!img) throw new Error('không đọc được tileset ' + m.tileset);
    tmBuild(T, j, img); T.ready = true;
    if(id === ACTIVE_MAP) camSnap();
    return T;
  }).catch(e => { console.error('[tilemap]', id, e); return null; });
}
const tmGet = id => { const T = id && TILEMAPS[id]; return (T && T.ready) ? T : null; };
// kích thước thế giới của 1 map (map thường = CW x CH)
const WB = id => { const T = tmGet(id); return T ? {w:T.w, h:T.h} : {w:CW, h:CH}; };

// ---------- va chạm ----------
function tmWalkable(T, x, y){
  const gx = Math.floor(x / T.ts), gy = Math.floor(y / T.ts);
  if(gx < 0 || gy < 0 || gx >= T.mw || gy >= T.mh) return false;
  return T.walk[gy*T.mw + gx] === 1;
}
function tmSnap(T, p){   // pet đang đứng chỗ không đi được (vd. vị trí lưu từ map cũ) -> đưa tới ô đi được gần nhất
  const gx = Math.floor(p.x / T.ts), gy = Math.floor(p.y / T.ts);
  for(let r = 1; r < 60; r++) for(let dy = -r; dy <= r; dy++) for(let dx = -r; dx <= r; dx++){
    if(Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const X = gx + dx, Y = gy + dy;
    if(X < 0 || Y < 0 || X >= T.mw || Y >= T.mh || !T.walk[Y*T.mw + X]) continue;
    p.x = (X + .5)*T.ts; p.y = (Y + .5)*T.ts; p.vx = p.vy = 0; p.target = null;
    if(p.tvx !== undefined){ p.tvx = 0; p.tvy = 0; }
    return;
  }
}
// bọc walkable: movement.js gọi walkable(x,y) không kèm map -> biết map nào nhờ bọc updatePet
let TM_CUR = null;
const _walkable = walkable;
walkable = function(x, y){ const T = tmGet(TM_CUR || ACTIVE_MAP); return T ? tmWalkable(T, x, y) : _walkable(x, y); };
const _updatePet = updatePet;
updatePet = function(p, t, dt){
  const T = tmGet(p.map);
  if(T){ if(!tmWalkable(T, p.x, p.y)) tmSnap(T, p); TM_CUR = p.map; }
  try{ return _updatePet(p, t, dt); } finally { TM_CUR = null; }
};

// ---------- tọa độ chuột: màn hình -> thế giới (trừ chế độ xem toàn bộ, ở đó giữ tọa độ màn hình) ----------
const _scaleXY = scaleXY;
scaleXY = function(e){ const p = _scaleXY(e); if(!VIEW.overview){ p.x += CAM.x; p.y += CAM.y; } return p; };

// ---------- camera ----------
function camTarget(){
  const ps = PETS.filter(p => p.map === ACTIVE_MAP && !p.bdead), sel = ps.find(p => p.selected);
  if(sel) return {x:sel.x, y:sel.y - 60};
  if(typeof BT !== 'undefined' && BT.phase === 'fight' && ps.length)
    return {x:ps.reduce((a, p) => a + p.x, 0)/ps.length, y:ps.reduce((a, p) => a + p.y, 0)/ps.length - 60};
  return null;
}
function camGoal(){
  const b = WB(ACTIVE_MAP), mx = Math.max(0, b.w - CW), my = Math.max(0, b.h - CH), tg = camTarget();
  const cl = (v, a, z) => Math.max(a, Math.min(z, v));
  return tg ? {x:cl(tg.x - CW/2, 0, mx), y:cl(tg.y - CH/2, 0, my)} : {x:cl(CAM.fx, 0, mx), y:cl(CAM.fy, 0, my)};
}
function camSnap(){ const g = camGoal(); CAM.fx = g.x; CAM.fy = g.y; CAM.x = Math.round(g.x); CAM.y = Math.round(g.y); }
let _camT = 0;
function camUpdate(){
  const now = performance.now(), dt = Math.min(.1, (now - _camT)/1000); _camT = now;
  if(VIEW.overview) return;
  const g = camGoal(), k = 1 - Math.exp(-dt*6);
  CAM.fx += (g.x - CAM.fx)*k; CAM.fy += (g.y - CAM.fy)*k;
  CAM.x = Math.round(CAM.fx); CAM.y = Math.round(CAM.fy);
}
const _drawScene = drawScene;
drawScene = function(t){ camUpdate(); _drawScene(t); };
const _setActiveMap = setActiveMap;
setActiveMap = function(id){ const r = _setActiveMap(id); camSnap(); return r; };

// ---------- vẽ ----------
function tmDrawRun(T, r){
  const ts = T.ts, h = (r.y1 - r.y0 + 1)*ts;
  cx.drawImage(T.over, r.x*ts, r.y0*ts, ts, h, r.x*ts, r.y0*ts, ts, h);
}
const _drawMapScene = drawMapScene;
drawMapScene = function(mid, t){
  const T = tmGet(mid); if(!T) return _drawMapScene(mid, t);   // map thường / tilemap chưa nạp xong: vẽ ảnh nền như cũ
  const cam = VIEW.overview ? {x:0, y:0} : CAM;
  cx.save(); cx.fillStyle = '#10200a'; cx.fillRect(0, 0, CW, CH); cx.imageSmoothingEnabled = false;
  cx.drawImage(T.under, cam.x, cam.y, CW, CH, 0, 0, CW, CH);
  if(TM_CFG.petOnTop) cx.drawImage(T.over, cam.x, cam.y, CW, CH, 0, 0, CW, CH);   // cây, nhà vẽ liền vào nền; pet vẽ sau nên nằm trên
  cx.restore();
  cx.save(); cx.translate(-cam.x, -cam.y);
  const items = PETS.filter(p => p.map === mid).map(p => ({y:p.y, pet:p}));
  if(typeof BT !== 'undefined' && mid === BT.map && (BT.phase === 'fight' || BT.phase === 'result') && typeof btDrawEnemy === 'function')
    BT.enemies.forEach(e => items.push({y:e.y, enemy:e}));
  if(!TM_CFG.petOnTop) T.runs.forEach(r => {   // chỉ đưa vào các khối cây đang nằm trong khung nhìn
    if(r.x*T.ts + T.ts < cam.x || r.x*T.ts > cam.x + CW || (r.y1 + 1)*T.ts < cam.y || r.y0*T.ts > cam.y + CH) return;
    // đáy khối: pet có chân ở dưới mốc này (đứng trước) thì vẽ sau = trên cùng. Cây: giữa hàng gốc; công trình: sát mép dưới
    items.push({y:r.b ? (r.y1 + 1)*T.ts - 16 : (r.y1 + .5)*T.ts, run:r});
  });
  cx.imageSmoothingEnabled = false;
  items.sort((a, b) => a.y - b.y).forEach(it => it.pet ? drawPet(it.pet, t) : it.enemy ? btDrawEnemy(it.enemy, t) : tmDrawRun(T, it.run));
  cx.imageSmoothingEnabled = true;
  drawTargetMarkers(mid, t); drawProjectiles(mid); drawExplosions(mid);
  cx.restore();
};

// nạp sớm mọi tilemap (nhẹ); khi chưa xong thì map vẫn hiện ảnh nền bg
MAPS.forEach(m => { if(m.tilemap) loadTilemap(m.id); });
