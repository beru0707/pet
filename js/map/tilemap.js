/* ==================================================================
   MAP DẠNG Ô (TILEMAP) – đọc JSON xuất từ Sprite Fusion
   - Ghép sẵn map vào canvas ẩn, mỗi khung chỉ cắt phần camera nhìn thấy.
   - Camera bám theo pet đang chọn (hoặc trọng tâm đội trong trận).
   - Va chạm theo ô (walkable) cho map có tilemap; map thường vẫn dùng cách cũ.
   - Cây "Trees front" được xếp lớp theo trục y cùng với pet / địch.
   Nạp file này SAU scene.js, maps.js, battle/*.js, map/tilemap-core.js (TM_CFG, tmBuild) và TRƯỚC main.js.
   Cách bật cho 1 map: thêm tilemap + tileset vào dòng của map trong MAPS (config/world.js):
     {id:'grass', name:'Đồng cỏ', bg:'assets/background/grass.webp',
      tilemap:'assets/maps/grass.json', tileset:'assets/maps/spritesheet.png'}
   (bg vẫn giữ, dùng làm ảnh thu nhỏ trong menu và làm nền tạm lúc đang nạp)
   ================================================================== */

const TILEMAPS = {};                       // id map -> dữ liệu đã dựng
const CAM = {x:0, y:0, fx:0, fy:0};        // x,y đã làm tròn (dùng để vẽ); fx,fy là số thực

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
// chừa lề cho thân: điểm cách chân TM_CFG.headMargin px về phía trên không được rơi vào vùng cấm (vách đá, nước, chân nhà...). Gốc cây / cầu coi như đi được
function tmGround(T, k, y){
  if(T.walk[k] === 1 || T.br[k] === 1 || (T.rp !== undefined && T.rp[k] === 1)) return true;
  if(T.fp !== undefined && T.fp[k] === 1) return true;   // ô chân công trình: không áp lề đầu (giống gốc cây) để pet bước được vào dải DƯỚI sát công trình; dải TRÊN (mép trên xuống fa) vẫn do tmWalkable chặn
  return false;
}
function tmHeadClear(T, x, y, gy){
  const m = TM_CFG.headMargin; if(!m) return true;
  const hy = Math.floor((y - m) / T.ts); if(hy >= gy || hy < 0) return true;
  const hx = Math.floor(x / T.ts); return tmGround(T, hy*T.mw + hx, y - m);
}
// mức thân pet chồng lên vùng cấm (0..1), dùng để làm mờ nhẹ pet
function tmWallOverlap(T, p){
  if(!TM_CFG.wallFade || p.deck) return 0;
  const gx = Math.floor(p.x / T.ts); let n = 0;
  for(const d of [18, 36, 54]){ const gy = Math.floor((p.y - d) / T.ts); if(gx >= 0 && gx < T.mw && gy >= 0 && gy < T.mh && !tmGround(T, gy*T.mw + gx, p.y - d)) n++; }
  return n / 3;
}
function tmWalkable(T, x, y, deck){
  const gx = Math.floor(x / T.ts), gy = Math.floor(y / T.ts);
  if(gx < 0 || gy < 0 || gx >= T.mw || gy >= T.mh) return false;
  const k = gy*T.mw + gx;
  if(tmCellOK(T, k, deck)) return deck || tmHeadClear(T, x, y, gy);
  // ô chân công trình chỉ bị chặn dải TRÊN (T.fp, từ mép trên xuống độ sâu fa); dải dưới đi được. Tìm đường vẫn coi cả ô là vật cản nên đi vòng
  if(!deck && T.fp !== undefined && T.fp[k] === 1) return (y - gy*T.ts) >= T.fa[k] && tmHeadClear(T, x, y, gy);
  // ô GỐC cây chỉ chặn TM_CFG.rootBlock (vd. 60%) phần DƯỚI của ô; phần trên đi vào được. Tìm đường (lưới ô) vẫn coi cả ô là vật cản nên đi vòng, còn đi tay / đi lang thang thì sát được thân cây
  return !deck && T.rp !== undefined && T.rp[k] === 1 && (y - gy*T.ts) < T.ts*(1 - TM_CFG.rootBlock);
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
// Khóa xếp lớp theo y của pet. Công trình xếp theo mốc r.mark (gần đáy công trình), nên pet đứng ở dải dưới ĐƯỢC ĐI của ô chân (T.fp, từ độ sâu fa xuống đáy ô)
// có thể có y < mark và bị công trình vẽ đè dù đang đứng TRƯỚC vùng cấm. Pet ở dải đó (kiểm cả hai mép thân) thì được đẩy lên ngay sau mốc công trình -> vẽ đè lên công trình.
function tmPetSortY(T, p){
  if(p.deck || T.fp === undefined) return p.y;
  const gy = Math.floor(p.y / T.ts); if(gy < 0 || gy >= T.mh) return p.y;
  let y = p.y;
  for(const dx of [-15, 0, 15]){
    const gx = Math.floor((p.x + dx) / T.ts); if(gx < 0 || gx >= T.mw) continue;
    const k = gy*T.mw + gx; if(T.fp[k] !== 1 || p.y - gy*T.ts < T.fa[k]) continue;
    const r = T.runs.find(q => q.x === gx && gy >= q.y0 && gy <= q.y1); if(r) y = Math.max(y, r.mark + 1);
  }
  return y;
}
function tmDrawPetFaded(T, p, t){   // phần thân còn chồng lên vách / mép đảo: pet mờ nhẹ, mượt theo thời gian
  const f = TM_CFG.wallFade ? tmWallOverlap(T, p) * TM_CFG.wallFade : 0;
  p._fade = (p._fade || 0) + (f - (p._fade || 0)) * .2;
  if(p._fade < .01){ drawPet(p, t); return; }
  cx.save(); cx.globalAlpha = 1 - p._fade; drawPet(p, t); cx.restore();
}
// bọc walkable: movement.js gọi walkable(x,y) không kèm map / pet -> biết nhờ bọc updatePet
let TM_CUR = null, TM_DECK = false;
const _walkable = walkable;
walkable = function(x, y){ const T = tmGet(TM_CUR || ACTIVE_MAP); return T ? tmWalkable(T, x, y, TM_DECK) : _walkable(x, y); };

// ---------- TÌM ĐƯỜNG: bấm điểm đến -> pet tự đi vòng vật cản tới điểm đi được gần nhất ----------
// Ô GỐC cây chỉ bị chặn phần dưới (TM_CFG.rootBlock) nên tìm đường coi nó là ô đi được ở dải phía TRÊN: điểm đứng đại diện của ô gốc cây nằm giữa dải đó, ô khác là tâm ô.
// Ra / vào ô gốc cây chỉ từ phía trên hoặc hai bên (đi ngang qua dải trên được); từ phía dưới thì phải đi vòng vì phần dưới bị chặn.
// Ô CHÂN công trình ngược lại: chỉ bị chặn dải TRÊN (từ mép trên xuống T.fa), dải DƯỚI đi được -> điểm đứng đại diện nằm giữa dải dưới; ra / vào từ phía dưới hoặc hai bên, không xuyên dải trên từ ô phía trên.
const tmRootOK = (T, k) => T.rp !== undefined && T.rp[k] === 1 && TM_CFG.rootBlock < 1;
const tmFootOK = (T, k) => T.fp !== undefined && T.fp[k] === 1 && T.fa[k] < T.ts;
const tmPartial = (T, k) => tmRootOK(T, k) || tmFootOK(T, k);   // ô chỉ đi được một phần (dải)
function tmCellPt(T, k){ const x = k % T.mw, y = (k / T.mw) | 0; return {x:(x + .5)*T.ts, y:(y + (tmRootOK(T, k) ? (1 - TM_CFG.rootBlock)/2 : tmFootOK(T, k) ? (T.fa[k]/T.ts + 1)/2 : .5))*T.ts}; }
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
  const step0 = (d, X, Y) => X < 0 || Y < 0 || X >= W || Y >= H || !tmCellOK(T, Y*W + X, d) ? -1 : (tmDeckAt(T, Y*W + X, d) ? 1 : 0);   // ô đi được hoàn toàn
  const step = (d, X, Y) => (d === 0 && X >= 0 && Y >= 0 && X < W && Y < H && tmPartial(T, Y*W + X) && !tmCellOK(T, Y*W + X, d)) ? 0 : step0(d, X, Y);   // + ô gốc cây (dải trên đi được) và ô chân công trình (dải dưới đi được)
  while(heap.length){
    const [c, st] = tmHeapPop(heap); if(c > dist[st]) continue;
    const k = st >> 1, d = st & 1, x = k % W, y = (k / W) | 0;
    for(let dy = -1; dy <= 1; dy++) for(let dx = -1; dx <= 1; dx++){
      if(!dx && !dy) continue;
      const X = x + dx, Y = y + dy, nd2 = step(d, X, Y); if(nd2 < 0) continue;
      if(dx && dy && (step0(d, x + dx, y) < 0 || step0(d, x, y + dy) < 0)) continue;   // không cắt góc vật cản (ô gốc cây cũng tính là vật cản ở đây)
      if(!d && ((tmRootOK(T, k) && Y > y) || (tmRootOK(T, Y*W + X) && y > Y))) continue;   // ô gốc cây: không ra / vào từ phía dưới (phần dưới bị chặn)
      if(!d && ((tmFootOK(T, k) && Y < y) || (tmFootOK(T, Y*W + X) && y < Y))) continue;   // ô chân công trình: không ra / vào từ phía trên (dải trên bị chặn)
      if(!d && (tmPartial(T, k) || tmPartial(T, Y*W + X)) && !tmLOS(T, tmCellPt(T, k), tmCellPt(T, Y*W + X), false)) continue;   // cạnh nối ô gốc cây / chân công trình: kiểm đúng bằng tmLOS
      if(dx && dy && T.cn && (T.cn[y*W + x + dx] || T.cn[(y + dy)*W + x] || T.cn[Y*W + X] !== T.cn[k])) continue;   // gần cầu thang: chỉ đi thẳng, không đi chéo sượt qua góc
      if(T.bc && (T.bc[k] || T.bc[Y*W + X]) && !tmLOS(T, tmCellPt(T, k), tmCellPt(T, Y*W + X), !!d)) continue;   // gần dải chặn: kiểm đúng bằng tmLOS
      if(!d && tmLevelBlocked(T, k, Y*W + X)) continue;                                // không đổi tầng cao <-> thấp, trừ qua cầu thang
      if(dx && T.cn && T.cn[Y*W + X] !== T.cn[k]) continue;                           // vào / ra cầu thang chỉ đi THẲNG ĐỨNG (không ngang, không chéo): chéo sẽ chạm dải chặn ở mép cầu thang
      const ns = (Y*W + X)*2 + nd2, nd = c + (dx && dy ? 1.414 : 1);
      if(nd < dist[ns]){ dist[ns] = nd; prev[ns] = st; tmHeapPush(heap, nd, ns); }
    }
  }
  const cd = k => Math.min(dist[k*2], dist[k*2 + 1]);
  // ô đích: chính ô được bấm nếu tới được, không thì ô tới được gần điểm bấm nhất
  const tgx = Math.floor(tx/ts), tgy = Math.floor(ty/ts);
  let goal = -1, exact = false, skip = -1;
  // bấm vào phần DƯỚI của ô gốc cây (bị chặn): điểm đi được gần nhất là phía TRƯỚC thân cây chứ không phải dải trên phía sau thân, nên bỏ ô gốc cây đó khi chọn đích
  if(tgx >= 0 && tgy >= 0 && tgx < W && tgy < H && tmRootOK(T, tgy*W + tgx)){
    const f = (ty - tgy*ts)/ts, free = 1 - TM_CFG.rootBlock;
    if(f >= free && f - free > 1 - f) skip = tgy*W + tgx;
  }
  // bấm vào phần TRÊN của ô chân công trình (bị chặn): nếu gần mép trên hơn dải dưới thì đích gần nhất là ô phía trên (sau công trình), nên bỏ ô chân đó; ngược lại đi tới dải dưới
  if(tgx >= 0 && tgy >= 0 && tgx < W && tgy < H && tmFootOK(T, tgy*W + tgx)){
    const f = (ty - tgy*ts)/ts, keep = T.fa[tgy*W + tgx]/ts;
    if(f < keep && f < keep - f) skip = tgy*W + tgx;
  }
  if(skip < 0 && tgx >= 0 && tgy >= 0 && tgx < W && tgy < H && cd(tgy*W + tgx) < Infinity){ goal = tgy*W + tgx; exact = true; }
  else {
    let best = Infinity;
    for(let k = 0; k < N; k++){
      if(k === skip || cd(k) === Infinity) continue;
      const cp = tmCellPt(T, k), d = Math.hypot(cp.x - tx, cp.y - ty);
      if(d < best - 1e-6 || (Math.abs(d - best) <= 1e-6 && cd(k) < cd(goal))){ best = d; goal = k; }
    }
  }
  if(goal < 0) return null;
  let gs = dist[goal*2] <= dist[goal*2 + 1] ? goal*2 : goal*2 + 1;
  const sts = []; for(let st = gs; st !== s0 && st >= 0; st = prev[st]) sts.push(st);
  sts.reverse();
  const pts = [{x:sx, y:sy, d:!!deck0}, ...sts.map(st => { const k = st >> 1, cp = tmCellPt(T, k); return {x:cp.x, y:cp.y, d:(st & 1) === 1}; })];
  if(pts.length > 1 && !tmLOS(T, pts[0], pts[1], pts[0].d)){   // xuất phát lệch tâm ô và đường thẳng tới điểm đầu bị chặn: về tâm ô trước
    const c0 = {...tmCellPt(T, sgy*W + sgx), d:pts[0].d};
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
// ---------- ĐI LANG THANG THEO MAP (chế độ tự động đi) ----------
// Mỗi lần pet "đổi hướng", với xác suất TM_CFG.wander.chance nó chọn 1 điểm hẹn có nghĩa trên map rồi tìm đường tới đó (như bấm chuột), tới nơi thì đứng nghỉ một lúc; không thì đi ngẫu nhiên kiểu cũ (movement.js).
// Loại điểm hẹn: door = dải đi được sát chân công trình hoặc ngay trước công trình · tree = sau thân cây (dải trên ô gốc) hoặc trước cây · far = điểm đi được bất kỳ ở xa · friend = cạnh 1 pet khác trong map.
function tmWanderSpots(T){
  if(T._spots) return T._spots;
  const ts = T.ts, W = T.mw, S = {door:[], tree:[], cells:[]};
  for(const f of T.feet || []){
    const spots = [];
    for(let x = f.x; x < f.x + f.w; x++){
      const k = f.y*W + x; if(T.fp[k] !== 1) continue;
      spots.push({x:(x + .5)*ts, y:f.y*ts + (T.fa[k] + ts)/2}, {x:(x + .5)*ts, y:(f.y + 1)*ts + ts*.45});   // dải dưới sát công trình · ngay trước công trình
    }
    if(spots.length) S.door.push(spots);
  }
  for(const tr of T.trees || []){
    const k = (tr.oy + 2)*W + tr.ox + 1, x = (tr.ox + 1.5)*ts, spots = [];
    if(T.rp && T.rp[k] === 1) spots.push({x, y:(tr.oy + 2)*ts + ts*(1 - TM_CFG.rootBlock)/2});   // sau thân cây
    if(tr.oy + 3 < T.mh) spots.push({x, y:(tr.oy + 3.4)*ts});                                    // trước cây
    if(spots.length) S.tree.push(spots);
  }
  for(let k = 0; k < W*T.mh; k++) if(T.walk[k] === 1 && !T.br[k] && !(T.cn && T.cn[k])) S.cells.push(k);
  return T._spots = S;
}
const tmRand = (a, b) => a + Math.random()*(b - a);
function tmWanderGoal(T, p, kind){
  const S = tmWanderSpots(T), ts = T.ts, minD = TM_CFG.wander.minDist;
  const pick = list => list[(Math.random()*list.length) | 0];
  for(let tries = 0; tries < 8; tries++){
    let q = null;
    if(kind === 'door' && S.door.length) q = pick(pick(S.door));
    else if(kind === 'tree' && S.tree.length) q = pick(pick(S.tree));
    else if(kind === 'far' && S.cells.length){ const k = pick(S.cells); q = {x:(k % T.mw + .5)*ts, y:(((k / T.mw) | 0) + .5)*ts}; }
    else if(kind === 'friend'){
      const fr = PETS.filter(o => o !== p && o.map === p.map && !o.bdead && !o.deck);
      if(fr.length){ const o = pick(fr); q = {x:o.x + (Math.random() < .5 ? -1 : 1)*tmRand(40, 75), y:o.y + tmRand(-8, 12)}; }
    }
    if(!q) return null;
    q = {x:q.x + tmRand(-10, 10), y:q.y};
    if(Math.hypot(q.x - p.x, q.y - p.y) < minD || !tmStandOK(T, q.x, q.y, false)) continue;
    return q;
  }
  return null;
}
function tmWanderTick(T, p, t){
  const C = TM_CFG.wander; if(!C) return;
  if(p.selected){   // pet đang chọn không tự đi: hủy chuyến lang thang đang dở (cả đường đi), lệnh bấm chuột của người chơi giữ nguyên
    if(p._wg){ p._wg = null; p._stroll = 1; p.target = null; p._path = null; p._wp = null; p._dest = null; }
    return;
  }
  const g = p._wg;
  if(g){
    if(p._dest ? (p._dest.x === g.x && p._dest.y === g.y && (p.target || (p._path && p._path.length))) : (p.target && t - g.t < .25)) return;   // vẫn đang đi tới điểm hẹn (qua điểm trung gian p.target có thể rỗng 1 khung hình, nhưng p._path còn)
    p._wg = null; p._stroll = 1;
    if(!p.target && !p.manual){
      if(Math.hypot(p.x - g.x, p.y - g.y) < 45){ const d = C.dwell[g.kind] || [1, 3]; p.idleUntil = Math.max(p.idleUntil || 0, t + tmRand(d[0], d[1])); }   // tới nơi: đứng nghỉ một lúc
      else p.nextTurn = t + .3;                                                                                                                              // không tới được / kẹt: thử lại sớm
    }
    return;
  }
  if(p.target || p.manual || p.isAttacking || p.bdead || p._autoGo || t < (p.idleUntil || 0) || t <= (p.nextTurn || 0)) return;
  if(typeof BT !== 'undefined' && BT.phase !== 'off' && BT.map === p.map) return;   // đang có trận ở map này: pet đứng giữ chỗ
  if(Math.random() > C.chance) return;                                              // không chọn điểm hẹn: đi ngẫu nhiên kiểu cũ
  let r = Object.entries(C.w).reduce((a, [, w]) => a + w, 0)*Math.random(), kind = null;
  for(const [k, w] of Object.entries(C.w)){ r -= w; if(r <= 0){ kind = k; break; } }
  const q = kind && tmWanderGoal(T, p, kind); if(!q) return;
  p.target = q; p._wg = {x:q.x, y:q.y, t, kind}; p._stroll = tmRand(C.speed[0], C.speed[1]); p.idleUntil = 0; p.nextTurn = t + 1;
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
function tmSteerAfter(T, p){
  if(!p._wp || p.target === p._wp) return;   // vẫn đang đi tới điểm trung gian
  const near = Math.hypot(p._wp.x - p.x, p._wp.y - p.y) < 14;
  if(p.target === null && near && p._path && p._path.length > 1){
    // tới điểm trung gian: ghim pet vào đúng điểm đó (nếu chỉ lệch vài px) để đoạn kế tiếp đi đúng đường đã kiểm tra bằng tmLOS. Lệch 0.1px cũng đủ để luật lề đầu chặn pet đứng kẹt dưới vật cản phía trên
    if(Math.hypot(p._wp.x - p.x, p._wp.y - p.y) < 6 && tmStandOK(T, p._wp.x, p._wp.y, !!p._wp.d)){ p.x = p._wp.x; p.y = p._wp.y; }
    p._path.shift(); return;   // sang điểm kế
  }
  p._path = null; p._wp = null; p._dest = null;   // tới đích cuối, hoặc bị hủy (phím di chuyển, kẹt...)
}
const _updatePet = updatePet;
updatePet = function(p, t, dt){
  const T = tmGet(p.map);
  let ox = p.x, oy = p.y;
  if(T){ if(!tmStandOK(T, p.x, p.y, !!p.deck)) tmSnap(T, p); ox = p.x; oy = p.y; TM_CUR = p.map; TM_DECK = !!p.deck; tmWanderTick(T, p, t); tmSteerBefore(T, p); }
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
      tmSteerAfter(T, p);
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
  const items = PETS.filter(p => p.map === mid).map(p => ({y:tmPetSortY(T, p), pet:p}));
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
  items.sort((a, b) => a.y - b.y).forEach(it => it.pet ? tmDrawPetFaded(T, it.pet, t) : it.enemy ? btDrawEnemy(it.enemy, t) : tmDrawRun(T, it.run));
  cx.imageSmoothingEnabled = true;
  // pet đang đi DƯỚI cầu: vẽ lại cầu đè lên pet (chỉ phần ô cầu)
  const wb = WB(mid);
  let bridgeRedrawn = false;
  PETS.forEach(p => {
    if(p.map !== mid || p.deck) return;
    const gx = Math.floor(p.x / T.ts), gy = Math.floor(p.y / T.ts);
    if(gx < 0 || gy < 0 || gx >= T.mw || gy >= T.mh || !T.br[gy*T.mw + gx]) return;
    const x0 = Math.max(0, Math.floor(p.x - 90)), y0 = Math.max(0, Math.floor(p.y - 150)), x1 = Math.min(wb.w, Math.ceil(p.x + 90)), y1 = Math.min(wb.h, Math.ceil(p.y + 40));
    cx.imageSmoothingEnabled = false; cx.drawImage(T.overBr, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0); cx.imageSmoothingEnabled = true;
    bridgeRedrawn = true;
  });
  // lớp cầu vừa vẽ đè cũng phủ cả pet đang đi TRÊN cầu (nằm trong vùng 150px phía trên pet đi dưới) -> vẽ lại pet trên cầu lên trên cùng
  if(bridgeRedrawn) PETS.forEach(p => { if(p.map === mid && p.deck) tmDrawPetFaded(T, p, t); });
  // vòng tròn đánh dấu hiện ở ĐÍCH cuối, không phải điểm trung gian của đường đi
  const sw = PETS.filter(p => p._wp && p.target === p._wp && p._dest);
  sw.forEach(p => { p._wpSave = p.target; p.target = p._dest; });
  drawTargetMarkers(mid, t);
  sw.forEach(p => { p.target = p._wpSave; });
  drawProjectiles(mid); drawExplosions(mid);
  cx.restore();
};

// KHÔNG dựng sẵn mọi tilemap lúc nạp script nữa (tmBuild chạy đồng bộ, tạo 7 canvas cỡ cả map, làm khựng đúng lúc vào game).
// Map đang mở được dựng trong màn hình chờ (boot.js), các map khác dựng khi cần (ensureMap trong pet-loader.js).
// Khi chưa dựng xong thì map vẫn hiện ảnh nền bg.
