/* ==================================================================
   CẤU HÌNH – TRẬN ĐÁNH
   Thông số trận (BATTLE_CFG), loại địch + animation (ENEMY_TYPES), chỉ số chiến đấu của pet (PET_BATTLE).
   Muốn đổi số đợt / máu / sát thương / tốc độ: sửa file này.
   ================================================================== */

// ============ CẤU HÌNH TRẬN ĐÁNH (chỉnh ở đây) ============
const BATTLE_CFG = {
  map: 'fire',          // id map chiến đấu (trong MAPS)
  maxPets: 5,           // số pet tối đa được đặt
  waveRest: 3,          // giây nghỉ trước mỗi đợt
  hpGrow: 0.25,         // mỗi đợt địch trâu hơn 25%
  blastRadius: 120,     // bán kính nổ của quả cầu lửa (px)
  barDY: 105,           // độ cao thanh máu pet so với chân (nhân với scale của pet)
  waves: [              // mỗi đợt: loại địch (trong ENEMY_TYPES), số lượng, giây giữa 2 con xuất hiện
    {type:'zombie',   count:4, gap:2.4},
    {type:'skeleton', count:3, gap:2.4},
    {type:'zombie',   count:5, gap:1.6},
    {type:'skeleton', count:5, gap:1.8},
  ]
};

// ============ QUÁI VẬT (lấy ảnh từ thư mục Enemy/<TÊN>/) ============
// Quái đi bộ: đứng yên / đi / (chạy) -> tới tầm thì tấn công -> bị đánh trúng thì giật mình (hurt) -> chết (dead).
//   name   : tên hiện trong menu map           hp / dmg : máu / sát thương mỗi đòn
//   speed  : tốc độ đi (px/giây)               runMul : nhân tốc độ khi chạy (chỉ quái có anim run, chạy khi còn xa hơn range*1.8)
//   range  : tầm tấn công (px)                 stop : đứng lại ở khoảng cách này (mặc định range*.85)       cd : giây nghỉ giữa 2 đòn
//   h      : chiều cao vẽ cả khung (px thế giới) · anchor : vị trí "chân" trong khung (0..1 từ trên xuống) · ax : vị trí tâm nhân vật theo chiều ngang (0..1 từ trái)
//            (3 số này đo từ ảnh: nhân vật chiếm ~70% khung, đứng lệch trái; chỉnh h để quái to / nhỏ hơn)
//   bar    : độ cao thanh máu và chữ sát thương so với chân (px)
//   spriteLeft : true = ảnh gốc nhìn sang TRÁI (game tự lật khi quái quay phải)
//   proj   : (tuỳ chọn) quái bắn đạn thay vì đánh giáp lá cà. {sheet, size, speed, dx, dy, life, spin}
//              sheet = tên sheet ảnh đạn · size = cỡ vẽ (px) · speed = tốc độ bay (px/giây) · dx, dy = điểm xuất phát so với chân quái (dx theo hướng nhìn) · life = giây bay tối đa · spin = vòng quay (rad/giây)
// DỮ LIỆU quái nằm ở js/config/enemies.data.js (công cụ căn đọc / ghi trực tiếp) – defs: chỉ số + cỡ, anim.<quái>.extra: mỗi trạng thái 1 sheet
//   trạng thái: idle · walk · run · attack · hurt · dead · dead2 (2 kiểu ngã, chết ngẫu nhiên 1 kiểu) · stone (ảnh đạn, chỉ quái bắn xa)
//   mỗi trạng thái: { src, cols, rows, max, fps, hitAt? , scale?, dx?, dy? }   hitAt = khung thứ mấy thì trúng đòn / tung đạn
//   scale / dx / dy: căn riêng từng trạng thái, tương đối so với walk (như pet) · số khung n = frames hoặc cols*rows · idle/walk/run tự lặp
// Cỡ & điểm chân từ công cụ căn: h = 100*scale · ax = 0.5 - ox/(sw/sh) · anchor = 1 - oy  (quy đổi ngay dưới đây)
// Chưa có file ảnh thì địch vẽ tạm bằng khối tròn đỏ.
const EN_LOOP = {idle:true, walk:true, run:true};
const ENEMY_TYPES = Object.fromEntries(ENEMY_DATA.defs.map(d => {
  const ex = ENEMY_DATA.anim[d.key].extra, T = {sheets:{}, anim:{}};
  const {key, dir, scale, ox, oy, sw, sh, ...rest} = d;
  Object.assign(T, rest, {h:100*scale, ax:.5 - ox/(sw/sh), anchor:1 - oy});
  Object.entries(ex).forEach(([k, a]) => {
    const n = a.frames || a.cols*a.rows;
    T.sheets[k] = {src:a.src, cols:a.cols, rows:a.rows, frames:n, max:a.max};
    if(k !== 'stone') T.anim[k] = {sheet:k, n, fps:a.fps, loop:!!EN_LOOP[k], hitAt:a.hitAt, scale:a.scale ?? 1, dx:a.dx || 0, dy:a.dy || 0};
  });
  return [key, T];
}));
// Chỉ số chiến đấu của pet (không khai = mặc định). range: tầm đánh · cd: giây giữa 2 đòn
// Cấp độ pet: đánh xong trận (thắng hay thua) mọi pet đã tham chiến đều nhận EXP; đủ EXP thì lên cấp, chỉ số chiến đấu tăng theo cấp.
//   max      : cấp tối đa · expNeed(lv) : EXP cần để từ cấp lv lên lv+1 = expBase + expStep*(lv-1)
//   expKill  : EXP cho mỗi địch bị hạ trong trận (tính chung cho cả đội) · expWin : thưởng thêm khi thắng · expLose : hệ số nhân EXP khi thua
//   hpPerLv / dmgPerLv : mỗi cấp tăng bấy nhiêu % so với chỉ số gốc ở cấp 1 (0.12 = +12% HP mỗi cấp; áp cho cả sát thương skill)
const LEVEL_CFG = {max:20, expBase:40, expStep:20, expKill:6, expWin:30, expLose:.5, hpPerLv:.12, dmgPerLv:.10};
const petExpNeed = lv => LEVEL_CFG.expBase + LEVEL_CFG.expStep * (lv - 1);
// Chỉ số gốc (cấp 1) của pet; chỉ số thật = gốc x hệ số cấp, xem btStat (battle/state.js)
const PET_BATTLE_DEFAULT = {hp:100, dmg:12, range:170, cd:1.6};
const PET_BATTLE = {
  'Shibav3_1': {hp:90,  dmg:22, range:650, cd:1.5},   // có fireball: bắn xa, nổ lan
  'Wukong':    {hp:140, dmg:16, range:200, cd:1.4},
  'Wukongv3':  {hp:160, dmg:20, range:230, cd:1.4},
};
