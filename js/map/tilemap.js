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
  flat:      ['Miscs', 'Small rocks', 'Shadows'],   // vật nhỏ (bụi cỏ, đá, nấm, xương...): luôn vẽ ở nền, dưới pet, kể cả khi nằm chung ô với cây / nhà
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
  const [under, gu] = mk(), [overT, gT] = mk(), [overB, gB] = mk();   // overT: cây · overB: nhà / tháp (mỗi loại xếp lớp riêng)
  const front = new Set(TM_CFG.front), ground = new Set(TM_CFG.ground), block = new Set(TM_CFG.block), pass = new Set(TM_CFG.walkOver);
  const N = W*H, fg = new Uint8Array(N), gr = new Uint8Array(N), so = new Uint8Array(N), ps = new Uint8Array(N), rk = new Uint8Array(N), tg = new Uint8Array(N), fp = new Uint8Array(N), bid = new Int16Array(N).fill(-1), hi = new Uint8Array(N), cn = new Uint8Array(N);
  const topGrass = new Set(TM_CFG.topGrass), highL = new Set(TM_CFG.high), conn = new Set(TM_CFG.connector), flat = new Set(TM_CFG.flat), foot = new Set(TM_CFG.footprint);
  // ô có cây (quét trước vì Buildings được xử lý trước Trees front)
  const trCell = new Uint8Array(N);
  j.layers.forEach(L => { if(front.has(L.name) && !foot.has(L.name)) for(const t of L.tiles) if(t.x >= 0 && t.y >= 0 && t.x < W && t.y < H) trCell[t.y*W + t.x] = 1; });
  let firstFront = j.layers.length;
  j.layers.forEach((L, i) => { if(front.has(L.name)) firstFront = Math.min(firstFront, i); });
  // JSON: layer đầu danh sách nằm TRÊN CÙNG -> vẽ từ cuối lên đầu
  for(let li = j.layers.length - 1; li >= 0; li--){
    const L = j.layers[li], isBld = foot.has(L.name), isTree = front.has(L.name) && !isBld, above = li < firstFront;   // above: layer nằm trên Trees front (vd. Miscs)
    for(const t of L.tiles){
      const id = +t.id, k = t.y*W + t.x;
      if(t.x < 0 || t.y < 0 || t.x >= W || t.y >= H || !(id >= 0)) continue;
      // layer nằm trên cây (Miscs) chỉ đè lên cây / nhà ở đúng ô có cây / nhà
      const g = flat.has(L.name) ? gu : isTree ? gT : isBld ? (trCell[k] ? gu : gB) :   // ô vừa có cây vừa có nhà: nhà vẽ ở nền (dưới pet), cây ở lớp trên pet
         (above && fg[k]) ? gT : (above && fp[k]) ? gB : gu;
      g.drawImage(img, (id % cols)*ts, Math.floor(id / cols)*ts, ts, ts, t.x*ts, t.y*ts, ts, ts);
      if(isTree) fg[k] = 1;
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
  // Va chạm của cây: chỉ chặn gốc (hàng ô dưới cùng). Cây rộng 3 ô trở lên chỉ chặn ô giữa (thân), tán hai bên và phần trên vẫn đi vòng ra sau được.
  for(let y = 0; y < H; y++){
    let x = 0;
    while(x < W){
      const isB = (xx) => trCell[y*W + xx] && (y === H - 1 || !trCell[(y+1)*W + xx]);
      if(!isB(x)){ x++; continue; }
      let x1 = x; while(x1 + 1 < W && isB(x1 + 1)) x1++;
      const n = x1 - x + 1, a = n <= 2 ? x : x + Math.floor((n - 1)/2), b = n <= 2 ? x1 : x + Math.floor(n/2);
      for(let q = a; q <= b; q++) so[y*W + q] = 1;
      x = x1 + 1;
    }
  }
  T.under = under; T.overT = overT; T.overB = overB;
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
  // gom các ô liền nhau theo cột thành 1 "khối"; khối được xếp theo đáy của nó. Cây và công trình có khối riêng,
  // nên cây đứng trước lâu đài vẫn che pet đứng sau cây và không che pet đứng trước lâu đài.
  T.runs = [];
  for(let x = 0; x < W; x++){
    for(const b of [0, 1]){
      const A = b ? fp : fg; let y = 0;
      while(y < H){
        if(!A[y*W + x]){ y++; continue; }
        const y0 = y; y++;
        while(y < H && A[y*W + x] && !(b && !same((y-1)*W + x, y*W + x))) y++;   // công trình: tách khi sang công trình khác
        T.runs.push({x, y0, y1:y - 1, b});
      }
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

// ---------- TÌM ĐƯỜNG: bấm điểm đến -> pet tự đi vòng vật cản tới điểm đi được gần nhất ----------
function tmHeapPush(h, c, i){ h.push([c, i]); let k = h.length - 1; while(k > 0){ const q = (k - 1) >> 1; if(h[q][0] <= h[k][0]) break; [h[q], h[k]] = [h[k], h[q]]; k = q; } }
function tmHeapPop(h){
  const top = h[0], last = h.pop();
  if(h.length){ h[0] = last; let k = 0; for(;;){ let a = 2*k + 1, b = a + 1, m = k; if(a < h.length && h[a][0] < h[m][0]) m = a; if(b < h.length && h[b][0] < h[m][0]) m = b; if(m === k) break; [h[m], h[k]] = [h[k], h[m]]; k = m; } }
  return top;
}
// đoạn thẳng a -> b có đi được không (mẫu mỗi 8 px, kiểm cả hai bên thân pet như movement.js)
function tmLOS(T, a, b){
  const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d/8));
  for(let i = 0; i <= n; i++){
    const x = a.x + (b.x - a.x)*i/n, y = a.y + (b.y - a.y)*i/n;
    if(!tmWalkable(T, x, y) || !tmWalkable(T, x - 15, y) || !tmWalkable(T, x + 15, y)) return false;
  }
  return true;
}
// trả về mảng điểm cần đi qua (có thể rỗng nếu đã ở sát đích), hoặc null nếu không có đường
function tmFindPath(T, sx, sy, tx, ty){
  const W = T.mw, H = T.mh, ts = T.ts, N = W*H;
  const sgx = Math.floor(sx/ts), sgy = Math.floor(sy/ts);
  if(sgx < 0 || sgy < 0 || sgx >= W || sgy >= H) return null;
  const sk = sgy*W + sgx, dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), heap = [];
  dist[sk] = 0; tmHeapPush(heap, 0, sk);
  const ok = (X, Y) => X >= 0 && Y >= 0 && X < W && Y < H && T.walk[Y*W + X] === 1;
  while(heap.length){
    const [c, k] = tmHeapPop(heap); if(c > dist[k]) continue;
    const x = k % W, y = (k / W) | 0;
    for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++){
      if(!dx && !dy) continue;
      const X = x + dx, Y = y + dy; if(!ok(X, Y)) continue;
      if(dx && dy && (!ok(x + dx, y) || !ok(x, y + dy))) continue;   // không cắt góc vật cản
      const nk = Y*W + X, nd = c + (dx && dy ? 1.414 : 1);
      if(nd < dist[nk]){ dist[nk] = nd; prev[nk] = k; tmHeapPush(heap, nd, nk); }
    }
  }
  // ô đích: chính ô được bấm nếu tới được, không thì ô tới được gần điểm bấm nhất
  const tgx = Math.floor(tx/ts), tgy = Math.floor(ty/ts);
  let goal = -1, exact = false;
  if(tgx >= 0 && tgy >= 0 && tgx < W && tgy < H && dist[tgy*W + tgx] < Infinity){ goal = tgy*W + tgx; exact = true; }
  else {
    let best = Infinity;
    for(let k = 0; k < N; k++){
      if(dist[k] === Infinity) continue;
      const d = Math.hypot(((k % W) + .5)*ts - tx, (((k / W) | 0) + .5)*ts - ty);
      if(d < best - 1e-6 || (Math.abs(d - best) <= 1e-6 && dist[k] < dist[goal])){ best = d; goal = k; }
    }
  }
  if(goal < 0) return null;
  const cells = []; for(let k = goal; k !== sk && k >= 0; k = prev[k]) cells.push(k);
  cells.reverse();
  const pts = [{x:sx, y:sy}, ...cells.map(k => ({x:((k % W) + .5)*ts, y:(((k / W) | 0) + .5)*ts}))];
  const out = []; let i = 0;   // rút gọn đường: bỏ các điểm giữa nếu đi thẳng được
  while(i < pts.length - 1){ let j = pts.length - 1; while(j > i + 1 && !tmLOS(T, pts[i], pts[j])) j--; out.push(pts[j]); i = j; }
  if(exact){
    const prevP = out.length > 1 ? out[out.length - 2] : pts[0], tp = {x:tx, y:ty};
    if(tmLOS(T, prevP, tp)){ if(out.length) out[out.length - 1] = tp; else out.push(tp); }
  }
  return out;
}
function tmSteerBefore(T, p){
  if(p._autoGo || p.isAttacking){ p._path = null; p._wp = null; p._dest = null; return; }
  const tg = p.target;
  if(tg && tg !== p._wp){   // lệnh đi mới (bấm chuột): tìm đường
    const path = tmFindPath(T, p.x, p.y, tg.x, tg.y);
    p._dest = {x:tg.x, y:tg.y};
    if(!path || !path.length){ p.target = null; p._path = null; p._wp = null; p._dest = null; return; }
    p._path = path;
  }
  if(p._path && p._path.length){ p._wp = p._path[0]; p.target = p._wp; } else p._wp = null;
}
function tmSteerAfter(p){
  if(!p._wp || p.target === p._wp) return;   // vẫn đang đi tới điểm trung gian
  const near = Math.hypot(p._wp.x - p.x, p._wp.y - p.y) < 14;
  if(p.target === null && near && p._path && p._path.length > 1){ p._path.shift(); return; }   // tới điểm trung gian: sang điểm kế
  p._path = null; p._wp = null; p._dest = null;   // tới đích cuối, hoặc bị hủy (phím di chuyển, kẹt...)
}
const _updatePet = updatePet;
updatePet = function(p, t, dt){
  const T = tmGet(p.map);
  if(T){ if(!tmWalkable(T, p.x, p.y)) tmSnap(T, p); TM_CUR = p.map; tmSteerBefore(T, p); }
  try{ return _updatePet(p, t, dt); } finally { TM_CUR = null; if(T) tmSteerAfter(p); }
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
  cx.drawImage(r.b ? T.overB : T.overT, r.x*ts, r.y0*ts, ts, h, r.x*ts, r.y0*ts, ts, h);
}
const _drawMapScene = drawMapScene;
drawMapScene = function(mid, t){
  const T = tmGet(mid); if(!T) return _drawMapScene(mid, t);   // map thường / tilemap chưa nạp xong: vẽ ảnh nền như cũ
  const cam = VIEW.overview ? {x:0, y:0} : CAM;
  cx.save(); cx.fillStyle = '#10200a'; cx.fillRect(0, 0, CW, CH); cx.imageSmoothingEnabled = false;
  cx.drawImage(T.under, cam.x, cam.y, CW, CH, 0, 0, CW, CH);
  if(TM_CFG.petOnTop){ cx.drawImage(T.overB, cam.x, cam.y, CW, CH, 0, 0, CW, CH); cx.drawImage(T.overT, cam.x, cam.y, CW, CH, 0, 0, CW, CH); }   // cây, nhà vẽ liền vào nền; pet vẽ sau nên nằm trên
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
  // vòng tròn đánh dấu hiện ở ĐÍCH cuối, không phải điểm trung gian của đường đi
  const sw = PETS.filter(p => p._wp && p.target === p._wp && p._dest);
  sw.forEach(p => { p._wpSave = p.target; p.target = p._dest; });
  drawTargetMarkers(mid, t);
  sw.forEach(p => { p.target = p._wpSave; });
  drawProjectiles(mid); drawExplosions(mid);
  cx.restore();
};

// nạp sớm mọi tilemap (nhẹ); khi chưa xong thì map vẫn hiện ảnh nền bg
MAPS.forEach(m => { if(m.tilemap) loadTilemap(m.id); });
