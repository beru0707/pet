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
  order:     ['Sand', 'Cliff', 'Rocks', 'Grass', 'Stairs'],   // thứ tự lớp, dưới -> trên. Lớp CAO NHẤT có mặt trong ô quyết định ô đó là gì
  walkTop:   ['Sand', 'Grass', 'Stairs'],          // lớp trên cùng thuộc nhóm này thì đi được (Cliff / Rocks hoặc không có lớp nào = chặn)
  raise:     ['Rocks', 'Cliff'],                   // Grass chồng lên các lớp này = MẶT CAO: không đi qua lại với cát được (chỉ qua cầu thang). Grass chỉ nằm trên Sand = đi qua lại tự do
  trees:     ['Trees front', 'Trees back'],        // các layer chứa cây. Layer ĐẦU = cây phía trước (vẽ đè công trình); layer sau = cây phía sau (công trình đè lên cây)
  treeIds:   [[30, 57], [106, 120]],              // các dải id ô cây trong tileset (mỗi loại cây 1 dải). Mỗi cây là khối 3x3: ô góc trái trên có id 30 (ô đệm) và ô bên phải là ô cây khác 30. Mọi loại cây, ở mọi layer cây, đều xếp lớp theo trục y như nhau
  flat:      ['Miscs', 'Small rocks', 'Shadows'],   // vật nhỏ (bụi cỏ, đá, nấm, xương...): luôn vẽ ở nền, dưới pet, kể cả khi nằm chung ô với cây / nhà
  footprint: ['Buildings'],                        // chỉ chặn hàng ô DƯỚI CÙNG của mỗi cột (chân nhà / tháp); phần trên đi vòng ra sau được
  bridge:    ['Bridge - horizontal', 'Bridge - vertical'],  // cầu: pet đi TRÊN cầu (bước lên từ đầu cầu, mặt cao) hoặc đi DƯỚI cầu trên cát; cầu vẽ đè lên pet đang đi dưới
  connector: ['Stairs'],                           // đường rocks / cầu thang: chỗ duy nhất đổi giữa mặt cao và cát
  stairWall: true,                                // chỉ 1 ĐƯỜNG THẲNG chặn ở mép hai bên cầu thang (giữa cầu thang và cỏ): tâm pet không băng ngang qua đường này được; ô cỏ hai bên vẫn đi được bình thường
  stairWallPad: 0,                                // px: nới đường chặn thành dải rộng chừng này ở hai bên (tâm pet cách mép cầu thang ít nhất chừng này). 0 = đúng 1 đường thẳng dài bằng mép viền của 1 ô (64px), không có dải
  stairWallY: [.25, 1],                              // đoạn của đường chặn theo chiều dọc ô cầu thang: [đầu, cuối] tính theo tỉ lệ chiều cao ô. [0,1] = đủ 1 mép ô (64px); [0,.5] = nửa trên; [.5,1] = nửa dưới; [.25,.75] = đoạn giữa
  walkOver:  ['Stairs'],                           // luôn đi được, kể cả đè lên vách
};

// ---------- dựng map ----------
function tmBuild(T, j, img){
  const ts = j.tileSize, W = j.mapWidth, H = j.mapHeight, cols = Math.floor(img.naturalWidth / ts);
  T.ts = ts; T.mw = W; T.mh = H; T.w = W*ts; T.h = H*ts;
  const mk = () => { const c = document.createElement('canvas'); c.width = T.w; c.height = T.h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };
  const [under, gu] = mk(), [overT, gT] = mk(), [overTB, gTB] = mk(), [overTBu, gTBu] = mk(), [overTBs, gTBs] = mk(), [overB, gB] = mk(), [overBr, gBr] = mk();   // overBr: riêng các ô cầu   // overT: cây · overB: nhà / tháp (mỗi loại xếp lớp riêng)
  const front = new Set(TM_CFG.front), pass = new Set(TM_CFG.walkOver);
  const N = W*H, fg = new Uint8Array(N), top = new Int8Array(N).fill(-1), pr = new Uint8Array(N), so = new Uint8Array(N), ps = new Uint8Array(N), fp = new Uint8Array(N), bid = new Int16Array(N).fill(-1), hi = new Uint8Array(N), cn = new Uint8Array(N), br = new Uint8Array(N);
  const ord = new Map(TM_CFG.order.map((n, i) => [n, i])), walkTop = new Set(TM_CFG.walkTop.map(n => ord.get(n)));
  const raiseMask = TM_CFG.raise.reduce((a, n) => a | (ord.has(n) ? 1 << ord.get(n) : 0), 0), grassIdx = ord.get('Grass');
  const bridgeL = new Set(TM_CFG.bridge), conn = new Set(TM_CFG.connector), flat = new Set(TM_CFG.flat), foot = new Set(TM_CFG.footprint);
  // ô có cây (quét trước vì Buildings được xử lý trước Trees front)
  const trCell = new Uint8Array(N);
  j.layers.forEach(L => { if(L.name === TM_CFG.trees[0]) for(const t of L.tiles) if(t.x >= 0 && t.y >= 0 && t.x < W && t.y < H) trCell[t.y*W + t.x] = 1; });
  // nhận diện từng cái cây (khối 3x3) theo id ô, riêng cho từng layer cây
  const treeLayers = new Set(TM_CFG.trees), tFront = TM_CFG.trees[0], tCorner = TM_CFG.treeIds[0][0], isTreeId = v => TM_CFG.treeIds.some(q => v >= q[0] && v <= q[1]);
  const bldCell = new Uint8Array(N), inst = {}; T.trees = []; const tbu = [];   // tbu: ô cây phía sau nằm dưới công trình
  j.layers.forEach(L => { if(foot.has(L.name)) for(const t of L.tiles) if(t.x >= 0 && t.y >= 0 && t.x < W && t.y < H) bldCell[t.y*W + t.x] = 1; });
  j.layers.forEach(L => {
    if(!treeLayers.has(L.name)) return;
    const gm = new Map(); for(const t of L.tiles) if(t.x >= 0 && t.y >= 0 && t.x < W && t.y < H) gm.set(t.y*W + t.x, +t.id);
    const ins = new Int16Array(N).fill(-1);
    for(const [k, i] of gm){
      const x = k % W, y = (k / W) | 0, rt = gm.get(k + 1);
      if(i !== tCorner || x >= W - 1 || rt === undefined || rt === tCorner || !isTreeId(rt)) continue;
      const n = T.trees.length; T.trees.push({ox:x, oy:y, layer:L.name});
      for(let dy = 0; dy < 3; dy++) for(let dx = 0; dx < 3; dx++){ const X = x + dx, Y = y + dy; if(X < W && Y < H && gm.has(Y*W + X) && ins[Y*W + X] < 0) ins[Y*W + X] = n; }
    }
    inst[L.name] = ins;
  });
  const tr0 = T.trees.slice();   // thứ tự gốc (ti là chỉ số trong mảng này)
  T.trees.sort((a, b) => (a.layer === tFront) - (b.layer === tFront));   // cây phía sau vẽ trước
  let firstFront = j.layers.length;
  j.layers.forEach((L, i) => { if(front.has(L.name)) firstFront = Math.min(firstFront, i); });
  // JSON: layer đầu danh sách nằm TRÊN CÙNG -> vẽ từ cuối lên đầu
  for(let li = j.layers.length - 1; li >= 0; li--){
    const L = j.layers[li], isBld = foot.has(L.name), isTree = treeLayers.has(L.name), isFrontTree = L.name === tFront, above = li < firstFront;   // above: layer nằm trên Trees front (vd. Miscs)
    for(const t of L.tiles){
      const id = +t.id, k = t.y*W + t.x;
      if(t.x < 0 || t.y < 0 || t.x >= W || t.y >= H || !(id >= 0)) continue;
      // layer nằm trên cây (Miscs) chỉ đè lên cây / nhà ở đúng ô có cây / nhà
      const ti = isTree && inst[L.name] ? inst[L.name][k] : -1;   // thuộc cây nào (-1: ô lẻ, vd. phần lều / lâu đài nằm trong layer cây)
      const g = flat.has(L.name) ? gu : isTree ? (ti >= 0 ? (isFrontTree ? gT : (bldCell[k] ? (tbu.push([k, ti]), gTBu) : gTB)) : (isFrontTree ? gT : gu)) : isBld ? (trCell[k] ? gu : gB) :   // ô vừa có cây vừa có nhà: nhà vẽ ở nền (dưới pet), cây ở lớp trên pet
         (above && fg[k]) ? gT : (above && fp[k]) ? gB : gu;
      g.drawImage(img, (id % cols)*ts, Math.floor(id / cols)*ts, ts, ts, t.x*ts, t.y*ts, ts, ts);
      if(isTree && ti >= 0 && g !== gu) fg[k] = 1;
      const oi = ord.get(L.name); if(oi !== undefined){ if(oi > top[k]) top[k] = oi; pr[k] |= 1 << oi; }
      if(bridgeL.has(L.name)){ br[k] = 1; gBr.drawImage(img, (id % cols)*ts, Math.floor(id / cols)*ts, ts, ts, t.x*ts, t.y*ts, ts, ts); }
      if(conn.has(L.name)) cn[k] = 1;
      if(foot.has(L.name)){ fp[k] = 1; bid[k] = id; }
      if(pass.has(L.name)) ps[k] = 1;
    }
  }
  // mặt CAO: lớp Grass trên cùng và chồng lên Rocks / Cliff
  for(let k = 0; k < N; k++) if(grassIdx !== undefined && top[k] === grassIdx && (pr[k] & raiseMask)) hi[k] = 1;
  // Hai ô công trình chồng dọc thuộc CÙNG 1 công trình khi id ô dưới lớn hơn id ô trên 2..8 (Sprite Fusion đánh id theo hàng, bước = bề ngang).
  // Nhà xây sát ngay dưới lâu đài (id chỉ lệch 1) là công trình KHÁC -> có chân và khối xếp lớp riêng.
  const same = (a, b) => { const d = bid[b] - bid[a]; return d >= 2 && d <= 8; };
  for(let k = 0; k < N; k++) if(fp[k] && (k + W >= N || !fp[k + W] || !same(k, k + W))) so[k] = 1;   // chân công trình: ô dưới cùng của mỗi cột
  // Va chạm của cây: mỗi cây chỉ chặn đúng ô GỐC (giữa hàng dưới cùng của khối 3x3); tán hai bên và phần trên đi vòng ra sau được
  for(const tr of T.trees){ const X = tr.ox + 1, Y = tr.oy + 2; if(X < W && Y < H) so[Y*W + X] = 1; }
  // đường chặn thẳng đứng ở mép hai bên cầu thang: {x, y0, y1} (px)
  T.cn = cn; T.walls = []; T.bands = [];
  if(TM_CFG.stairWall) for(let k = 0; k < N; k++) if(cn[k]){
    const x = k % W, y = (k / W) | 0;
    const pd = TM_CFG.stairWallPad || 0, wy = TM_CFG.stairWallY || [0, 1];
    if(x > 0 && !cn[k - 1]){ T.walls.push({x:x*ts, y0:y*ts + wy[0]*ts, y1:y*ts + wy[1]*ts}); if(pd) T.bands.push([x*ts - pd, y*ts, x*ts, (y + 1)*ts, x*ts - pd]); }
    if(x < W - 1 && !cn[k + 1]){ T.walls.push({x:(x + 1)*ts, y0:y*ts + wy[0]*ts, y1:y*ts + wy[1]*ts}); if(pd) T.bands.push([(x + 1)*ts, y*ts, (x + 1)*ts + pd, (y + 1)*ts, (x + 1)*ts + pd]); }
  }
  T.under = under; T.overT = overT; T.overTB = overTB; T.overTBu = overTBu; T.overTBs = overTBs; T.overB = overB;
  T.walk = new Uint8Array(N);
  for(let k = 0; k < N; k++) T.walk[k] = (ps[k] || (walkTop.has(top[k]) && !so[k])) ? 1 : 0;
  // Phân tầng mặt cao / thấp: không còn vùng đệm. Ô cát sát mặt cao vẫn đi được; chỉ chặn bước CHUYỂN giữa hai tầng (tmLevelBlocked) trừ cầu thang.
  // gom các ô liền nhau theo cột thành 1 "khối"; khối được xếp theo đáy của nó. Cây và công trình có khối riêng,
  // nên cây đứng trước lâu đài vẫn che pet đứng sau cây và không che pet đứng trước lâu đài.
  T.br = br; T.hi = hi; T.overBr = overBr;
  T.bc = new Uint8Array(N);   // ô giao với dải chặn cầu thang -> bước vào / ra ô này phải kiểm bằng tmLOS
  for(const b of T.bands) for(let y = Math.floor(b[1]/ts); y <= Math.floor((b[3] - 1)/ts); y++) for(let x = Math.floor(b[0]/ts); x <= Math.floor((b[2] - 1)/ts); x++) if(x >= 0 && y >= 0 && x < W && y < H) T.bc[y*W + x] = 1;
  T.runs = [];
  for(let x = 0; x < W; x++){
    for(const b of [1]){
      const A = fp; let y = 0;
      while(y < H){
        if(!A[y*W + x]){ y++; continue; }
        const y0 = y; y++;
        while(y < H && A[y*W + x] && !(b && !same((y-1)*W + x, y*W + x))) y++;   // công trình: tách khi sang công trình khác
        T.runs.push({x, y0, y1:y - 1, b, mark:y*ts - 16});
      }
    }
  }
  // Cây phía sau + công trình đè lên nó. Mốc của công trình = chân công trình. Hai trường hợp:
  //  - chân công trình THẤP hơn chân cây (nhà đứng trước cây): vẽ CẢ cây (kể cả phần dưới nhà) tại mốc cây, rồi tới nhà -> cây liền khối
  //  - chân công trình CAO hơn chân cây (lâu đài đứng sau cây): phần cây nằm dưới công trình vẽ cùng công trình (overTBs), để công trình không bị đẩy xuống thấp
  const moved = new Set();
  for(const [k, ti] of tbu){
    const tr = tr0[ti], x = k % W, y = (k / W) | 0, tm = (tr.oy + 2.5)*ts;
    const run = T.runs.find(q => q.x === x && y >= q.y0 && y <= q.y1); if(!run) continue;
    if(run.mark > tm){ run.mark = Math.max(run.mark, tm + 1); continue; }
    if(moved.has(k)) continue; moved.add(k);
    gTBs.drawImage(overTBu, x*ts, y*ts, ts, ts, x*ts, y*ts, ts, ts);
    gTBu.clearRect(x*ts, y*ts, ts, ts);
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
// deck = pet đang đi TRÊN cầu. Trên cầu: chỉ ô cầu, hoặc ô mặt cao (đầu cầu). Dưới cầu / bình thường: lưới T.walk (ô cầu có cát bên dưới vẫn đi được)
function tmCellOK(T, k, deck){ return deck ? (T.br[k] === 1 || (T.hi[k] === 1 && T.walk[k] === 1)) : T.walk[k] === 1; }
function tmWalkable(T, x, y, deck){
  const gx = Math.floor(x / T.ts), gy = Math.floor(y / T.ts);
  if(gx < 0 || gy < 0 || gx >= T.mw || gy >= T.mh) return false;
  if(!tmCellOK(T, gy*T.mw + gx, deck)) return false;
  return true;
}
// trạng thái "trên cầu" sau khi pet nằm ở ô k: đầu cầu (mặt cao + ô cầu) -> lên cầu; ô cầu khác -> giữ nguyên; ngoài cầu -> xuống
function tmDeckAt(T, k, deck){ return T.br[k] ? (T.hi[k] ? true : !!deck) : false; }
// pet đứng được tại (x, y) theo đúng luật di chuyển của game: ít nhất 2 / 3 điểm (giữa, trái 15px, phải 15px) đi được
function tmStandOK(T, x, y, deck){ return (tmWalkable(T, x, y, deck) ? 1 : 0) + (tmWalkable(T, x - 15, y, deck) ? 1 : 0) + (tmWalkable(T, x + 15, y, deck) ? 1 : 0) >= 2; }
function tmSnap(T, p){   // pet đang đứng chỗ không đi được (vd. vị trí lưu từ map cũ) -> đưa tới ô đi được gần nhất
  const gx = Math.floor(p.x / T.ts), gy = Math.floor(p.y / T.ts);
  p.deck = false;
  for(let r = 1; r < 60; r++) for(let dy = -r; dy <= r; dy++) for(let dx = -r; dx <= r; dx++){
    if(Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    const X = gx + dx, Y = gy + dy;
    if(X < 0 || Y < 0 || X >= T.mw || Y >= T.mh || !T.walk[Y*T.mw + X] || !tmStandOK(T, (X + .5)*T.ts, (Y + .5)*T.ts, false)) continue;
    p.x = (X + .5)*T.ts; p.y = (Y + .5)*T.ts; p.vx = p.vy = 0; p.target = null;
    if(p.tvx !== undefined){ p.tvx = 0; p.tvy = 0; }
    p.deck = tmDeckAt(T, Y*T.mw + X, false);
    return;
  }
}
// bước từ ô ka sang ô kb có đổi tầng (mặt cao <-> thấp) mà không qua cầu thang không
function tmLevelBlocked(T, ka, kb){ return ka !== kb && T.hi[ka] !== T.hi[kb] && !T.cn[ka] && !T.cn[kb]; }
function tmCellAt(T, x, y){ const gx = Math.floor(x / T.ts), gy = Math.floor(y / T.ts); return (gx < 0 || gy < 0 || gx >= T.mw || gy >= T.mh) ? -1 : gy*T.mw + gx; }
// đoạn a -> b không được: băng qua đường chặn cầu thang, hoặc đổi tầng không qua cầu thang (pet đang đi trên cầu thì không xét đổi tầng)
function tmBadMove(T, ax, ay, bx, by, deck){
  if(tmCrosses(T, ax, ay, bx, by)) return true;
  if(deck) return false;
  const ka = tmCellAt(T, ax, ay), kb = tmCellAt(T, bx, by);
  return ka >= 0 && kb >= 0 && tmLevelBlocked(T, ka, kb);
}
// bọc walkable: movement.js gọi walkable(x,y) không kèm map / pet -> biết nhờ bọc updatePet
let TM_CUR = null, TM_DECK = false;
const _walkable = walkable;
walkable = function(x, y){ const T = tmGet(TM_CUR || ACTIVE_MAP); return T ? tmWalkable(T, x, y, TM_DECK) : _walkable(x, y); };

// ---------- TÌM ĐƯỜNG: bấm điểm đến -> pet tự đi vòng vật cản tới điểm đi được gần nhất ----------
function tmHeapPush(h, c, i){ h.push([c, i]); let k = h.length - 1; while(k > 0){ const q = (k - 1) >> 1; if(h[q][0] <= h[k][0]) break; [h[q], h[k]] = [h[k], h[q]]; k = q; } }
function tmHeapPop(h){
  const top = h[0], last = h.pop();
  if(h.length){ h[0] = last; let k = 0; for(;;){ let a = 2*k + 1, b = a + 1, m = k; if(a < h.length && h[a][0] < h[m][0]) m = a; if(b < h.length && h[b][0] < h[m][0]) m = b; if(m === k) break; [h[m], h[k]] = [h[k], h[m]]; k = m; } }
  return top;
}
// đoạn a -> b có băng ngang đường chặn cầu thang không
function tmCrosses(T, ax, ay, bx, by){
  if(!T.walls || ax === bx) return false;
  for(const w of T.walls){
    if((ax < w.x) === (bx < w.x)) continue;
    const y = ay + (by - ay)*(w.x - ax)/(bx - ax);
    if(y > w.y0 - 20 && y < w.y1 + 20) return true;   // nới 20px ở hai đầu: đi chéo sượt qua góc cầu thang cũng tính là băng qua
  }
  return false;
}
// đoạn thẳng a -> b có đi được không (mẫu mỗi 8 px, kiểm cả hai bên thân pet như movement.js)
function tmLOS(T, a, b, deck){
  const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(d));   // mẫu mỗi 1px: đi sượt qua góc vách (vệt hẹp ~1-2px) cũng bị bắt
  if(tmCrosses(T, a.x, a.y, b.x, b.y)) return false;
  let pk = -1;
  for(let i = 0; i <= n; i++){
    const x = a.x + (b.x - a.x)*i/n, y = a.y + (b.y - a.y)*i/n;
    const ck = tmCellAt(T, x, y); if(!deck && pk >= 0 && ck >= 0 && tmLevelBlocked(T, pk, ck)) return false; pk = ck;
    if([tmWalkable(T, x, y, deck), tmWalkable(T, x - 15, y, deck), tmWalkable(T, x + 15, y, deck)].filter(Boolean).length < 2) return false;   // cùng quy tắc 2/3 điểm với movement.js
  }
  return true;
}
// trả về mảng điểm cần đi qua (có thể rỗng nếu đã ở sát đích), hoặc null nếu không có đường
// Tìm đường trên đồ thị (ô, trạng thái trên cầu / dưới cầu). Trả về mảng điểm cần đi qua, hoặc null nếu không có đường
function tmFindPath(T, sx, sy, tx, ty, deck0){
  const W = T.mw, H = T.mh, ts = T.ts, N = W*H;
  const sgx = Math.floor(sx/ts), sgy = Math.floor(sy/ts);
  if(sgx < 0 || sgy < 0 || sgx >= W || sgy >= H) return null;
  const s0 = (sgy*W + sgx)*2 + (deck0 ? 1 : 0), dist = new Float64Array(2*N).fill(Infinity), prev = new Int32Array(2*N).fill(-1), heap = [];
  dist[s0] = 0; tmHeapPush(heap, 0, s0);
  // trạng thái mới khi bước từ trạng thái d vào ô n; -1 nếu không bước được
  const step = (d, X, Y) => X < 0 || Y < 0 || X >= W || Y >= H || !tmCellOK(T, Y*W + X, d) ? -1 : (tmDeckAt(T, Y*W + X, d) ? 1 : 0);
  while(heap.length){
    const [c, st] = tmHeapPop(heap); if(c > dist[st]) continue;
    const k = st >> 1, d = st & 1, x = k % W, y = (k / W) | 0;
    for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++){
      if(!dx && !dy) continue;
      const X = x + dx, Y = y + dy, nd2 = step(d, X, Y); if(nd2 < 0) continue;
      if(dx && dy && (step(d, x + dx, y) < 0 || step(d, x, y + dy) < 0)) continue;   // không cắt góc vật cản
      if(dx && dy && T.cn && (T.cn[y*W + x + dx] || T.cn[(y + dy)*W + x] || T.cn[Y*W + X] !== T.cn[k])) continue;   // gần cầu thang: chỉ đi thẳng, không đi chéo sượt qua góc
      if(T.bc && (T.bc[k] || T.bc[Y*W + X]) && !tmLOS(T, {x:(x + .5)*ts, y:(y + .5)*ts}, {x:(X + .5)*ts, y:(Y + .5)*ts}, !!d)) continue;   // gần dải chặn: kiểm đúng bằng tmLOS
      if(!d && tmLevelBlocked(T, k, Y*W + X)) continue;                                // không đổi tầng cao <-> thấp, trừ qua cầu thang
      if(dx && T.cn && T.cn[Y*W + X] !== T.cn[k]) continue;                           // vào / ra cầu thang chỉ đi THẲNG ĐỨNG (không ngang, không chéo): chéo sẽ chạm dải chặn ở mép cầu thang
      const ns = (Y*W + X)*2 + nd2, nd = c + (dx && dy ? 1.414 : 1);
      if(nd < dist[ns]){ dist[ns] = nd; prev[ns] = st; tmHeapPush(heap, nd, ns); }
    }
  }
  const cd = k => Math.min(dist[k*2], dist[k*2 + 1]);
  // ô đích: chính ô được bấm nếu tới được, không thì ô tới được gần điểm bấm nhất
  const tgx = Math.floor(tx/ts), tgy = Math.floor(ty/ts);
  let goal = -1, exact = false;
  if(tgx >= 0 && tgy >= 0 && tgx < W && tgy < H && cd(tgy*W + tgx) < Infinity){ goal = tgy*W + tgx; exact = true; }
  else {
    let best = Infinity;
    for(let k = 0; k < N; k++){
      if(cd(k) === Infinity) continue;
      const d = Math.hypot(((k % W) + .5)*ts - tx, (((k / W) | 0) + .5)*ts - ty);
      if(d < best - 1e-6 || (Math.abs(d - best) <= 1e-6 && cd(k) < cd(goal))){ best = d; goal = k; }
    }
  }
  if(goal < 0) return null;
  let gs = dist[goal*2] <= dist[goal*2 + 1] ? goal*2 : goal*2 + 1;
  const sts = []; for(let st = gs; st !== s0 && st >= 0; st = prev[st]) sts.push(st);
  sts.reverse();
  const pts = [{x:sx, y:sy, d:!!deck0}, ...sts.map(st => { const k = st >> 1; return {x:((k % W) + .5)*ts, y:(((k / W) | 0) + .5)*ts, d:(st & 1) === 1}; })];
  if(pts.length > 1 && !tmLOS(T, pts[0], pts[1], pts[0].d)){   // xuất phát lệch tâm ô và đường thẳng tới điểm đầu bị chặn: về tâm ô trước
    const c0 = {x:(sgx + .5)*ts, y:(sgy + .5)*ts, d:pts[0].d};
    if(Math.hypot(c0.x - pts[0].x, c0.y - pts[0].y) > 4) pts.splice(1, 0, c0);
  }
  const out = []; let i = 0;   // rút gọn đường: chỉ nối tắt trong cùng 1 trạng thái trên / dưới cầu
  const sameState = (a, b) => { for(let q = a; q <= b; q++) if(pts[q].d !== pts[a].d) return false; return true; };
  while(i < pts.length - 1){ let j = Math.min(pts.length - 1, i + 40); while(j > i + 1 && !(sameState(i, j) && tmLOS(T, pts[i], pts[j], pts[i].d))) j--; out.push(pts[j]); i = j; }
  if(exact){
    const prevP = out.length > 1 ? out[out.length - 2] : pts[0], tp = {x:tx, y:ty, d:out.length ? out[out.length - 1].d : pts[0].d};
    if(prevP.d === tp.d && tmLOS(T, prevP, tp, tp.d)){ if(out.length) out[out.length - 1] = tp; else out.push(tp); }
  }
  return out;
}
function tmSteerBefore(T, p){
  if(p._autoGo || p.isAttacking){ p._path = null; p._wp = null; p._dest = null; return; }
  const tg = p.target;
  if(tg && tg !== p._wp){   // lệnh đi mới (bấm chuột): tìm đường
    const path = tmFindPath(T, p.x, p.y, tg.x, tg.y, p.deck);
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
  let ox = p.x, oy = p.y;
  if(T){ if(!tmStandOK(T, p.x, p.y, !!p.deck)) tmSnap(T, p); ox = p.x; oy = p.y; TM_CUR = p.map; TM_DECK = !!p.deck; tmSteerBefore(T, p); }
  try{ return _updatePet(p, t, dt); } finally {
    TM_CUR = null;
    if(T){
      const dk = !!p.deck, nx = p.x, ny = p.y;
      // game cho phép đi tiếp khi tâm pet đang ở ô không đi được (để thoát ra): không cho pet đang đứng hợp lệ bước vào chỗ không đứng được
      if(tmBadMove(T, ox, oy, nx, ny, dk) || (tmStandOK(T, ox, oy, dk) && !tmStandOK(T, nx, ny, dk))){   // định băng qua đường chặn cầu thang / đổi tầng: thử trượt theo từng trục, không được thì đứng lại
        const okAt = (x, y) => [tmWalkable(T, x, y, dk), tmWalkable(T, x - 15, y, dk), tmWalkable(T, x + 15, y, dk)].filter(Boolean).length >= 2;
        if(!tmBadMove(T, ox, oy, ox, ny, dk) && okAt(ox, ny)){ p.x = ox; }
        else if(!tmBadMove(T, ox, oy, nx, oy, dk) && okAt(nx, oy)){ p.y = oy; }
        else { p.x = ox; p.y = oy; }
        if(!p.manual){ if(p.tvx !== undefined){ p.tvx = -p.tvx; p.tvy = -p.tvy; } p.vx = -(p.vx || 0)*.3; p.vy = -(p.vy || 0)*.3; p.nextTurn = t + 1.5; }
      }
      const gx = Math.floor(p.x / T.ts), gy = Math.floor(p.y / T.ts);
      if(gx >= 0 && gy >= 0 && gx < T.mw && gy < T.mh) p.deck = tmDeckAt(T, gy*T.mw + gx, p.deck);
      // dải sát cầu thang KHÔNG chặn cứng (chặn cứng làm pet đứng khựng khi đi dọc mép cầu thang): pet bị đẩy nhẹ ra ngoài dải, nên trượt dọc theo mép
      if(!p.deck && T.bands.length) for(const b of T.bands) if(p.x >= b[0] && p.x < b[2] && p.y >= b[1] && p.y < b[3]){
        const d = b[4] - p.x, nx2 = p.x + Math.sign(d)*Math.min(Math.abs(d), Math.max(dt*180, .5));
        if([tmWalkable(T, nx2, p.y, false), tmWalkable(T, nx2 - 15, p.y, false), tmWalkable(T, nx2 + 15, p.y, false)].filter(Boolean).length >= 2) p.x = nx2;
        break;
      }
      tmSteerAfter(p);
    }
  }
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
  if(r.tree){
    const ts = T.ts, tr = r.tree, front = tr.layer === TM_CFG.trees[0];
    if(!front) cx.drawImage(T.overTBu, tr.ox*ts, tr.oy*ts, 3*ts, 3*ts, tr.ox*ts, tr.oy*ts, 3*ts, 3*ts);   // phần cây nằm dưới nhà
    cx.drawImage(front ? T.overT : T.overTB, tr.ox*ts, tr.oy*ts, 3*ts, 3*ts, tr.ox*ts, tr.oy*ts, 3*ts, 3*ts);
    return;
  }
  const ts = T.ts, h = (r.y1 - r.y0 + 1)*ts;
  cx.drawImage(T.overTBs, r.x*ts, r.y0*ts, ts, h, r.x*ts, r.y0*ts, ts, h);   // phần cây phía sau nằm dưới công trình (công trình đứng sau cây): vẽ ngay trước công trình
  cx.drawImage(r.b ? T.overB : T.overT, r.x*ts, r.y0*ts, ts, h, r.x*ts, r.y0*ts, ts, h);
}
const _drawMapScene = drawMapScene;
drawMapScene = function(mid, t){
  const T = tmGet(mid); if(!T) return _drawMapScene(mid, t);   // map thường / tilemap chưa nạp xong: vẽ ảnh nền như cũ
  const cam = VIEW.overview ? {x:0, y:0} : CAM;
  cx.save(); cx.fillStyle = '#10200a'; cx.fillRect(0, 0, CW, CH); cx.imageSmoothingEnabled = false;
  cx.drawImage(T.under, cam.x, cam.y, CW, CH, 0, 0, CW, CH);
  if(TM_CFG.petOnTop){ cx.drawImage(T.overTBu, cam.x, cam.y, CW, CH, 0, 0, CW, CH); cx.drawImage(T.overTBs, cam.x, cam.y, CW, CH, 0, 0, CW, CH); cx.drawImage(T.overB, cam.x, cam.y, CW, CH, 0, 0, CW, CH); cx.drawImage(T.overTB, cam.x, cam.y, CW, CH, 0, 0, CW, CH); cx.drawImage(T.overT, cam.x, cam.y, CW, CH, 0, 0, CW, CH); }   // cây, nhà vẽ liền vào nền; pet vẽ sau nên nằm trên
  cx.restore();
  cx.save(); cx.translate(-cam.x, -cam.y);
  const items = PETS.filter(p => p.map === mid).map(p => ({y:p.y, pet:p}));
  if(typeof BT !== 'undefined' && mid === BT.map && (BT.phase === 'fight' || BT.phase === 'result') && typeof btDrawEnemy === 'function')
    BT.enemies.forEach(e => items.push({y:e.y, enemy:e}));
  if(!TM_CFG.petOnTop) T.runs.forEach(r => {   // khối công trình đang nằm trong khung nhìn
    if(r.x*T.ts + T.ts < cam.x || r.x*T.ts > cam.x + CW || (r.y1 + 1)*T.ts < cam.y || r.y0*T.ts > cam.y + CH) return;
    // đáy khối: pet có chân ở dưới mốc này (đứng trước) thì vẽ sau = trên cùng; công trình: sát mép dưới
    items.push({y:r.mark, run:r});
  });
  if(!TM_CFG.petOnTop) T.trees.forEach(tr => {   // mỗi cây là 1 khối 3x3 xếp lớp theo ĐÁY của chính nó (giữa hàng gốc) -> mọi cột của cây cùng thứ tự với pet
    if((tr.ox + 3)*T.ts < cam.x || tr.ox*T.ts > cam.x + CW || (tr.oy + 3)*T.ts < cam.y || tr.oy*T.ts > cam.y + CH) return;
    items.push({y:(tr.oy + 2.5)*T.ts, run:{tree:tr}});
  });
  cx.imageSmoothingEnabled = false;
  items.sort((a, b) => a.y - b.y).forEach(it => it.pet ? drawPet(it.pet, t) : it.enemy ? btDrawEnemy(it.enemy, t) : tmDrawRun(T, it.run));
  cx.imageSmoothingEnabled = true;
  // pet đang đi DƯỚI cầu: vẽ lại cầu đè lên pet (chỉ phần ô cầu)
  const wb = WB(mid);
  PETS.forEach(p => {
    if(p.map !== mid || p.deck) return;
    const gx = Math.floor(p.x / T.ts), gy = Math.floor(p.y / T.ts);
    if(gx < 0 || gy < 0 || gx >= T.mw || gy >= T.mh || !T.br[gy*T.mw + gx]) return;
    const x0 = Math.max(0, Math.floor(p.x - 90)), y0 = Math.max(0, Math.floor(p.y - 150)), x1 = Math.min(wb.w, Math.ceil(p.x + 90)), y1 = Math.min(wb.h, Math.ceil(p.y + 40));
    cx.imageSmoothingEnabled = false; cx.drawImage(T.overBr, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0); cx.imageSmoothingEnabled = true;
  });
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
