/* ==================================================================
   TILEMAP CORE – quy tắc va chạm + dựng map từ JSON Sprite Fusion
   Phần THUẦN (không đụng tới game: PETS, MAPS, camera...) nên dùng chung cho game (map/tilemap.js)
   và trang xem map riêng (map-viewer.html). Nạp file này TRƯỚC map/tilemap.js.
   Gọi: tmBuild(T, json, tilesetImg) -> điền T.walk, T.hi, T.cn, T.br, T.walls, T.runs, T.trees, T.under, T.over*...
   ================================================================== */

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
  rootBlock: .6,                                   // ô GỐC cây (giữa hàng dưới cùng của khối 3x3) chỉ chặn chừng này (tỉ lệ 0..1) phần DƯỚI của ô; phần trên đi vào được nên pet đứng sát sau thân cây. 1 = chặn cả ô. Ô chân nhà thì luôn chặn cả ô, kể cả khi thân cây đè lên
};

// ---------- dựng map ----------
function tmBuild(T, j, img){
  const ts = j.tileSize, W = j.mapWidth, H = j.mapHeight, cols = Math.floor(img.naturalWidth / ts);
  T.ts = ts; T.mw = W; T.mh = H; T.w = W*ts; T.h = H*ts;
  const mk = () => { const c = document.createElement('canvas'); c.width = T.w; c.height = T.h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; };
  const [under, gu] = mk(), [overT, gT] = mk(), [overTB, gTB] = mk(), [overTBu, gTBu] = mk(), [overTBs, gTBs] = mk(), [overB, gB] = mk(), [overBr, gBr] = mk();   // overBr: riêng các ô cầu   // overT: cây · overB: nhà / tháp (mỗi loại xếp lớp riêng)
  const used = new Set([gu]);   // lớp nào thực sự được vẽ vào; lớp rỗng sẽ thu nhỏ còn 1x1 ở cuối hàm để trả RAM (mỗi lớp cỡ cả map)
  const front = new Set(TM_CFG.front), pass = new Set(TM_CFG.walkOver);
  const N = W*H, fg = new Uint8Array(N), top = new Int8Array(N).fill(-1), pr = new Uint8Array(N), so = new Uint8Array(N), ps = new Uint8Array(N), fp = new Uint8Array(N), bid = new Int16Array(N).fill(-1), hi = new Uint8Array(N), cn = new Uint8Array(N), br = new Uint8Array(N);
  const ord = new Map(TM_CFG.order.map((n, i) => [n, i])), walkTop = new Set(TM_CFG.walkTop.map(n => ord.get(n)));
  const raiseMask = TM_CFG.raise.reduce((a, n) => a | (ord.has(n) ? 1 << ord.get(n) : 0), 0), grassIdx = ord.get('Grass');
  const bridgeL = new Set(TM_CFG.bridge), conn = new Set(TM_CFG.connector), flat = new Set(TM_CFG.flat), foot = new Set(TM_CFG.footprint);
  // nhận diện từng cái cây (khối 3x3) theo id ô, riêng cho từng layer cây
  const treeLayers = new Set(TM_CFG.trees), tFront = TM_CFG.trees[0], tCorner = TM_CFG.treeIds[0][0], isTreeId = v => TM_CFG.treeIds.some(q => v >= q[0] && v <= q[1]);
  const bldCell = new Uint8Array(N), inst = {}, tgm = {}; T.trees = []; const tbu = [];   // tgm: layer cây -> (ô -> id tile)   // tbu: ô cây phía sau nằm dưới công trình
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
    inst[L.name] = ins; tgm[L.name] = gm;
  });
  const tr0 = T.trees.slice();   // thứ tự gốc (ti là chỉ số trong mảng này)
  T.trees.sort((a, b) => (a.layer === tFront) - (b.layer === tFront));   // cây phía sau vẽ trước
  // Cây (Trees front) đè lên nhà = 2 LỚP riêng (cây: gT / gTB, nhà: gB), xếp theo trục y cùng với pet: mốc cây = GỐC cây, mốc nhà = CHÂN nhà, mốc nào thấp hơn thì vẽ sau = nằm trên.
  //   gốc cây nằm dưới chân nhà -> cây hiển thị trên nhà; chân nhà nằm dưới gốc cây -> nhà hiển thị trên cây.
  // Va chạm: ô CHÂN nhà luôn chặn cả ô, kể cả khi thân cây đè lên (lớp nhà bên dưới vẫn chặn); ô GỐC cây chỉ chặn rootBlock phía dưới (xem tmWalkable trong map/tilemap.js).
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
      const g = flat.has(L.name) ? gu : isTree ? (ti >= 0 ? (isFrontTree ? gT : (bldCell[k] ? (tbu.push([k, ti]), gTBu) : gTB)) : (isFrontTree ? gT : gu)) : isBld ? gB :   // cây (gT / gTB) và nhà (gB) là 2 lớp riêng, kể cả khi đè lên nhau; thứ tự cây / nhà / pet do mốc đáy quyết định lúc vẽ (gốc cây vs chân nhà)
         (above && fg[k]) ? gT : (above && fp[k]) ? gB : gu;
      g.drawImage(img, (id % cols)*ts, Math.floor(id / cols)*ts, ts, ts, t.x*ts, t.y*ts, ts, ts); used.add(g);
      if(isTree && ti >= 0 && g !== gu) fg[k] = 1;
      const oi = ord.get(L.name); if(oi !== undefined){ if(oi > top[k]) top[k] = oi; pr[k] |= 1 << oi; }
      if(bridgeL.has(L.name)){ br[k] = 1; used.add(gBr); gBr.drawImage(img, (id % cols)*ts, Math.floor(id / cols)*ts, ts, ts, t.x*ts, t.y*ts, ts, ts); }
      if(conn.has(L.name)) cn[k] = 1;
      if(foot.has(L.name)){ fp[k] = 1; bid[k] = id; }
      if(pass.has(L.name)) ps[k] = 1;
    }
  }
  // mặt CAO: lớp Grass trên cùng và chồng lên Rocks / Cliff
  for(let k = 0; k < N; k++) if(grassIdx !== undefined && top[k] === grassIdx && (pr[k] & raiseMask)) hi[k] = 1;
  // Dải cỏ nằm trên cát (không có Rocks / Cliff) mà dính liền ô mặt cao là CÙNG MỘT mặt bằng với ô mặt cao đó (vd. dải cỏ ngay chân cầu thang
  // sát sân lâu đài). Nếu để là "tầng thấp" thì pet đi từ cầu thang ra dải cỏ không bước tiếp vào sân được (tmLevelBlocked chặn) -> kẹt ở chân cầu thang.
  if(grassIdx !== undefined){
    const grow = [];
    for(let k = 0; k < N; k++){
      if(hi[k] || top[k] !== grassIdx || br[k]) continue;
      const x = k % W, y = (k / W) | 0;
      if((x > 0 && hi[k - 1]) || (x < W - 1 && hi[k + 1]) || (y > 0 && hi[k - W]) || (y < H - 1 && hi[k + W])) grow.push(k);
    }
    grow.forEach(k => { hi[k] = 1; });
  }
  // Hai ô công trình chồng dọc thuộc CÙNG 1 công trình khi id ô dưới lớn hơn id ô trên 2..8 (Sprite Fusion đánh id theo hàng, bước = bề ngang).
  // Nhà xây sát ngay dưới lâu đài (id chỉ lệch 1) là công trình KHÁC -> có chân và khối xếp lớp riêng.
  // Chính xác hơn: id ô dưới - id ô trên phải đúng bằng BỀ NGANG của hàng ô đó (các ô liền nhau cùng hàng có id tăng dần 1). Nhờ vậy cái thùng gỗ (2 ô rộng)
  // xếp ngay trên hang lửa (3 ô rộng) không bị gộp thành 1 công trình, dù id lệch nhau 3 như trong nội bộ hang. Hàng chỉ có 1 ô (phần đầu tháp bị cây che) thì lấy bề ngang hàng dưới.
  const segW = k => { let l = 0, r = 0;
    while((k - l) % W > 0 && bid[k - l - 1] >= 0 && bid[k - l - 1] === bid[k - l] - 1) l++;
    while((k + r + 1) % W !== 0 && bid[k + r + 1] >= 0 && bid[k + r + 1] === bid[k + r] + 1) r++;
    return l + r + 1; };
  const same = (a, b) => { const d = bid[b] - bid[a], wa = segW(a), w = wa > 1 ? wa : segW(b); return w > 1 ? d === w : (d >= 2 && d <= 8); };
  for(let k = 0; k < N; k++) if(fp[k] && (k + W >= N || !fp[k + W] || !same(k, k + W))) so[k] = 1;   // chân công trình: ô dưới cùng của mỗi cột
  // Va chạm của cây: mỗi cây chỉ chặn đúng ô GỐC (giữa hàng dưới cùng của khối 3x3); tán hai bên và phần trên đi vòng ra sau được
  // Ô gốc cây: T.walk vẫn = 0 (tìm đường coi là vật cản), nhưng nếu nền ô đi được (không phải chân nhà) thì đánh dấu T.rp: tmWalkable chỉ chặn phần DƯỚI (rootBlock), phần trên đi được
  T.rp = new Uint8Array(N);
  for(const tr of T.trees){ const X = tr.ox + 1, Y = tr.oy + 2; if(X < W && Y < H){ const q = Y*W + X; if(!so[q] && (ps[q] || walkTop.has(top[q]))) T.rp[q] = 1; so[q] = 1; } }
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
    gTBs.drawImage(overTBu, x*ts, y*ts, ts, ts, x*ts, y*ts, ts, ts); used.add(gTBs);
    gTBu.clearRect(x*ts, y*ts, ts, ts);
  }
  // GỘP các cột công trình liền kề của CÙNG 1 nhà thành 1 nhóm, dùng chung mark = đáy thấp nhất.
  // Nếu không, mỗi cột có mark riêng (cột có tường thì thấp, cột mái nhô ra thì cao) nên pet đứng giữa các mốc đó
  // bị nhà che một nửa, không che một nửa.
  // Hai cột x và x+1 thuộc cùng 1 nhà khi ở ít nhất 1 hàng chung, id ô bên phải = id ô bên trái + 1 (các ô cùng hàng của 1 sprite có id liên tiếp).
  {
    const par = T.runs.map((_, i) => i);
    const find = i => par[i] === i ? i : (par[i] = find(par[i]));
    const sameHouse = (A, B) => {
      const y0 = Math.max(A.y0, B.y0), y1 = Math.min(A.y1, B.y1);
      for(let y = y0; y <= y1; y++){
        const a = bid[y*W + A.x], b = bid[y*W + B.x];
        if(a >= 0 && b === a + 1) return true;
      }
      return false;
    };
    for(let a = 0; a < T.runs.length; a++) for(let b = 0; b < T.runs.length; b++){
      const A = T.runs[a], B = T.runs[b];
      if(B.x === A.x + 1 && sameHouse(A, B)) par[find(a)] = find(b);
    }
    const mx = new Map();
    T.runs.forEach((r, i) => { const g = find(i); mx.set(g, Math.max(mx.get(g) ?? -Infinity, r.mark)); });
    T.runs.forEach((r, i) => { r.mark = mx.get(find(i)); });
  }
  // Lớp không có ô nào thì thu còn 1x1 (vẽ một canvas 1x1 trong suốt = không vẽ gì, nên hình không đổi)
  [[overT, gT], [overTB, gTB], [overTBu, gTBu], [overTBs, gTBs], [overB, gB], [overBr, gBr]].forEach(([c, g]) => { if(!used.has(g)){ c.width = 1; c.height = 1; } });
}
