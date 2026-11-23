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
// sheets: các sprite sheet (đọc lưới cols x rows từ khung 0, frames = số khung thật).
// anim: mỗi trạng thái chọn sheet + số khung n + fps. loop:true = lặp; attack.hitAt = khung thứ mấy thì trúng đòn / tung đạn.
//   dead và dead2 là 2 kiểu ngã khác nhau, mỗi con chết ngẫu nhiên một kiểu.
// Chưa có file ảnh thì địch vẽ tạm bằng khối tròn đỏ.
const EN_MAX = 240;   // cạnh dài tối đa của 1 khung quái sau khi cắt (px)
const enSheet = (file, cols, rows, o) => Object.assign({src:'Enemy/'+file, cols, rows, frames:cols*rows, max:EN_MAX}, o);
const ENEMY_TYPES = {
  zombie: { name:'Zombie', hp:80, dmg:10, speed:44, h:158, anchor:.844, ax:.39, bar:122, range:95, cd:1.3, spriteLeft:true,
    sheets: {
      idle:   enSheet('ZOMBIE/01-Idle/01-Idle.png', 4, 3),
      walk:   enSheet('ZOMBIE/02-Walk/02-Walk.png', 4, 3),
      attack: enSheet('ZOMBIE/03-Attack/03-Attack.png', 4, 2),
      hurt:   enSheet('ZOMBIE/04-Hurt/04-Hurt.png', 3, 2),
      dead1:  enSheet('ZOMBIE/05-Dead/01-Dead.png', 5, 2),
      dead2:  enSheet('ZOMBIE/05-Dead/02-Dead.png', 5, 2),
    },
    anim: {
      idle:   {sheet:'idle',   n:12, fps:10, loop:true},
      walk:   {sheet:'walk',   n:12, fps:12, loop:true},
      attack: {sheet:'attack', n:8,  fps:12, hitAt:4},
      hurt:   {sheet:'hurt',   n:6,  fps:14},
      dead:   {sheet:'dead1',  n:10, fps:12},
      dead2:  {sheet:'dead2',  n:10, fps:12},
    },
  },
  skeleton: { name:'Skeleton', hp:55, dmg:8, speed:52, runMul:1.7, h:158, anchor:.88, ax:.418, bar:128, range:520, stop:330, cd:1.9, spriteLeft:true,
    proj: {sheet:'stone', size:46, speed:430, dx:42, dy:54, life:2, spin:9},
    sheets: {
      idle:   enSheet('SKELETON/01-Idle/01-Idle.png', 4, 3),
      walk:   enSheet('SKELETON/02-Walk/02-Walk.png', 4, 3),
      run:    enSheet('SKELETON/03-Run/03-Run.png', 5, 2),
      attack: enSheet('SKELETON/04-Throw/04-Throw.png', 4, 2),
      hurt:   enSheet('SKELETON/05-Hurt/05-Hurt.png', 3, 2),
      dead1:  enSheet('SKELETON/06-Dead/01-Dead.png', 5, 2),
      dead2:  enSheet('SKELETON/06-Dead/02-Dead.png', 5, 2),
      stone:  enSheet('SKELETON/STONE/Stone.png', 1, 1, {max:96}),
    },
    anim: {
      idle:   {sheet:'idle',   n:12, fps:10, loop:true},
      walk:   {sheet:'walk',   n:12, fps:12, loop:true},
      run:    {sheet:'run',    n:10, fps:14, loop:true},
      attack: {sheet:'attack', n:8,  fps:12, hitAt:3},   // khung 3: tay vung ra phía trước -> ném đá
      hurt:   {sheet:'hurt',   n:6,  fps:14},
      dead:   {sheet:'dead1',  n:10, fps:12},
      dead2:  {sheet:'dead2',  n:10, fps:12},
    },
  },
};
// Chỉ số chiến đấu của pet (không khai = mặc định). range: tầm đánh · cd: giây giữa 2 đòn
const PET_BATTLE_DEFAULT = {hp:100, dmg:12, range:170, cd:1.6};
const PET_BATTLE = {
  'Shibav3_1': {hp:90,  dmg:22, range:650, cd:1.5},   // có fireball: bắn xa, nổ lan
  'Wukong':    {hp:140, dmg:16, range:200, cd:1.4},
  'Wukongv3':  {hp:160, dmg:20, range:230, cd:1.4},
};
