/* ==================================================================
   CẤU HÌNH – THÚ CƯNG
   Danh sách thú (PET_DEF), animation từng thú (PET_ANIM), cỡ thú, tốc độ đi bằng phím, kỹ năng bắn lửa.
   Muốn thêm / chỉnh thú: sửa file này.
   ================================================================== */

// PETS – mỗi con lấy ảnh từ thư mục Character/<dir>/ (bộ sprite sheet: 01-Idle, 02-Throw, 03-Walk, 04-Run, 06-Jump, 07-Hurt, 08-Dead).
// Thêm pet mới: chép thư mục sprite vào Character/ cùng cấu trúc rồi thêm 1 dòng ở đây (xem số đo bên dưới).
//   scale     : hệ số nhân kích thước riêng cho từng con (1.0 = khung cao PET_BASE_SIZE px). Theo công cụ căn (repo 'character'): 1 = khung cao PET_BASE_SIZE px.
//               MỘT scale này áp dụng chung cho mọi trạng thái: đi, đứng yên, tấn công
//   ox, oy    : bù lệch cho MỌI trạng thái (đơn vị = chiều cao khung): ảnh gốc để nhân vật lệch trái và chừa lề dưới, nên cần kéo vào giữa (ox) và hạ xuống chạm chân (oy)
//   vis       : phần chiều cao khung mà nhân vật thật sự chiếm (dùng để tính vùng bấm chọn pet)
//   barDY     : độ cao thanh máu so với chân (nhân với scale)
//   stride    : độ dài 1 chu kỳ bước (nhỏ hơn = chân bước nhanh hơn so với quãng đường đi)
//   sw, sh    : kích thước khung gốc (chỉ dùng làm tỉ lệ khi ảnh chưa nạp xong)
// ox/oy/vis/stride/scale đo tự động từ ảnh (vùng nhìn thấy của từng khung); không vừa mắt thì chỉnh tay.
const PET_DEF = [
  {name:'Chicken',   scale:1, ox:0.115, oy:0.109, vis:0.759, barDY:79.1, sw:174, sh:200, spriteLeft:true},
  {name:'Ducky',     scale:1, ox:0.104, oy:0.109, vis:0.751, barDY:77.5, sw:172, sh:200, spriteLeft:true},
  {name:'Penguin',   scale:1, ox:0.106, oy:0.109, vis:0.753, barDY:77.9, sw:173, sh:200, spriteLeft:true},
  {name:'Piggy',     scale:1, ox:0.076, oy:0.125, vis:0.723, barDY:71.8, sw:180, sh:200, spriteLeft:true},
  {name:'Polar',     scale:1, ox:0.106, oy:0.117, vis:0.757, barDY:78.9, sw:172, sh:200, spriteLeft:true},
  {name:'Reindeer',  scale:1.212, ox:0.063, oy:0.215, vis:0.619, barDY:63.9, sw:182, sh:200, spriteLeft:true},
  {name:'Tanuki',    scale:1, ox:0.066, oy:0.117, vis:0.745, barDY:76.3, sw:175, sh:200, spriteLeft:true},
  {name:'Teddy',     scale:1, ox:0.106, oy:0.117, vis:0.757, barDY:78.9, sw:172, sh:200, spriteLeft:true},
];
// spriteLeft: true = ảnh gốc nhìn sang TRÁI (game sẽ lật khi đi sang phải)
// ============ CẤU HÌNH ANIMATION CHO TỪNG THÚ (bạn chỉnh ở đây) ============
// CHỈ DÙNG SPRITE SHEET: mỗi trạng thái là 1 ảnh ghép nhiều khung, game tự cắt theo lưới rồi phát animation.
// Số khung KHÔNG cố định: game tự nhận số cột / hàng / khung của từng sheet (6x6, 5x3, 8x1 ... đều được), đọc từ trái sang phải, từ trên xuống.
// Điều kiện: giữa các khung có lề trong suốt, và mở game qua http/https (Live Server...). Mở file:// thì ghi tay {src, cols, rows, frames}.
const SHEET_DEFAULT = {cols:6, rows:6, max:256};   // max = cạnh dài tối đa của 1 khung sau khi cắt (px). Thú chỉ vẽ cao ~100-160px nên 256 là dư; RAM tỉ lệ bình phương. Sheet nào vẽ rất to thì ghi riêng max trong sheet đó   
//   walkSheet   : (BẮT BUỘC) sheet ĐI BỘ.  Thú nào chưa có walkSheet -> không hiện (F12 có cảnh báo [PET_ANIM])
//   idleSheet   : sheet ĐỨNG YÊN (nhiều khung = chớp mắt). Bỏ trống = tự tìm idle.png cạnh walk.png; không có thì dùng khung 1 của walk
//   attackSheet : sheet TẤN CÔNG (chỉ Shibav3_1, phím Enter)
//   fireballSheet / explosionSheet : sheet quả cầu lửa / vụ nổ của kỹ năng bắn (ghi kèm frames: số khung thật)
//   Mỗi mục viết ngắn 'đường dẫn.png' (tự nhận lưới) hoặc ép tay {src:'...', cols:5, rows:3, frames:13}. Ảnh đơn: {src:'...', cols:1, rows:1}
//   stride : độ dài 1 chu kỳ bước (lớn hơn = chân bước chậm hơn so với quãng đường; mặc định 1)
//   speed  : hệ số tốc độ đi (mặc định 1; 0.7 = chậm hơn, 1.3 = nhanh hơn)
//   idleFps : số khung/giây của idle (mặc định 12) · attackFps (mặc định 12.5) · attackFireFrame: khung thứ mấy thì bắn (mặc định 6)
//   idleFit / attackFit : cách cân cỡ ảnh cho bằng nhân vật lúc đi: 'height' (idle, attack mặc định), 'none' (không cân)
//   idleScale / attackScale : nhân thêm cỡ (1 = giữ nguyên; 1.2 = to hơn 20%)
// Nhân vật 4 hướng (nếu có bộ ảnh front/back/left/right): khai {dirs:'thư-mục'} + ảnh <hướng>-<walk|idle|blink|attack>.webp, game chọn khung theo p.dir
const PET_DIRS = ['front','back','left','right'];
// Mỗi pet dùng 1 hướng nhìn (lật ngang khi đổi hướng). Số khung của từng sheet (cột x hàng):
//   walk 4x3=12 · idle 4x3=12 · throw (đòn đánh) 4x2=8 · run 5x2=10 · jumpup / jumpfall 5x1=5 · jumpthrow 4x2=8 (đánh khi đang nhảy) · hurt 3x2=6 · dizzy 5x2=10 (bị đánh nặng, máu <30%%) · dead 5x2=10
// Mọi sheet cùng 1 pet có cùng cỡ ô nên không cần scale / dx / dy riêng cho từng trạng thái (đã có ox, oy trong PET_DEF).
// Ảnh .png nằm ngoài assets/ và không có bản .webp nên nạp thẳng .png (xem tryImg trong assets/images.js).
// PET_ANIM – dán thẳng khối do công cụ căn (repo 'character') xuất ra: mỗi pet 1 khối gồm walkSheet / idleSheet / attackSheet + MỘT 'extra' chứa mọi trạng thái còn lại
// (run, jumpup, jumpfall, jumpthrow, hurt, dizzy, dead). dx / dy / scale tính TƯƠNG ĐỐI so với Đi bộ (đã có ox, oy ở PET_DEF); không ghi = 0 / 1.
// cols/rows/max ghi rõ cho chắc (max = cạnh dài tối đa 1 khung sau khi cắt, 176 đủ nét mà RAM vừa). Tên khối ('Teddy') phải trùng PET_DEF.name.
const PET_ANIM = {
// PET_DEF  scale: 1, ox: 0.115, oy: 0.109
  'Chicken': {
    walkSheet: {
      src: 'Character/CHICKEN/03-Walk/03-Walk.png',
      cols: 4,
      rows: 3,
      max: 176,
      stride: 0.705
    },
    idleSheet: {
      src: 'Character/CHICKEN/01-Idle/02-Idle_Blink.png',
      cols: 4,
      rows: 3,
      max: 176,
      fps: 10,
      scale: 0.995
    },
    attackSheet: {
      src: 'Character/CHICKEN/02-Throw/02-Throw.png',
      cols: 4,
      rows: 2,
      max: 176,
      fps: 12.5,
      dx: 0.004
    },
    extra: {
      run: { src: 'Character/CHICKEN/04-Run/04-Run.png', cols: 5, rows: 2, max: 176, dx: 0.004, dy: 0.012 },
      jumpup: { src: 'Character/CHICKEN/06-Jump/01-Jump_Up.png', cols: 5, rows: 1, max: 176, dx: 0.004 },
      jumpfall: { src: 'Character/CHICKEN/06-Jump/02-Jump_Fall.png', cols: 5, rows: 1, max: 176, dx: -0.008 },
      jumpthrow: { src: 'Character/CHICKEN/06-Jump/03-Jump_Throw.png', cols: 4, rows: 2, max: 176, dx: -0.027 },
      hurt: { src: 'Character/CHICKEN/07-Hurt/01-Hurt.png', cols: 3, rows: 2, max: 176, dx: 0.02, dy: -0.008 },
      dizzy: { src: 'Character/CHICKEN/07-Hurt/02-Hurt_Dizzy.png', cols: 5, rows: 2, max: 176, dx: -0.012 },
      dead: { src: 'Character/CHICKEN/08-Dead/08-Dead.png', cols: 5, rows: 2, max: 176, dx: -0.123, dy: -0.008 },
    },
  },
// PET_DEF  scale: 1, ox: 0.104, oy: 0.109
  'Ducky': {
    walkSheet: {
      src: 'Character/DUCKY/03-Walk/03-Walk.png',
      cols: 4,
      rows: 3,
      max: 176,
      stride: 0.711
    },
    idleSheet: {
      src: 'Character/DUCKY/01-Idle/02-Idle_Blink.png',
      cols: 4,
      rows: 3,
      max: 176,
      fps: 10,
      scale: 0.995,
      dy: 0.004
    },
    attackSheet: {
      src: 'Character/DUCKY/02-Throw/02-Throw.png',
      cols: 4,
      rows: 2,
      max: 176,
      fps: 12.5,
      dx: 0.006,
      dy: 0.004
    },
    extra: {
      run: { src: 'Character/DUCKY/04-Run/04-Run.png', cols: 5, rows: 2, max: 176, dx: 0.006, dy: 0.012 },
      jumpup: { src: 'Character/DUCKY/06-Jump/01-Jump_Up.png', cols: 5, rows: 1, max: 176, dx: 0.008 },
      jumpfall: { src: 'Character/DUCKY/06-Jump/02-Jump_Fall.png', cols: 5, rows: 1, max: 176, dx: -0.004 },
      jumpthrow: { src: 'Character/DUCKY/06-Jump/03-Jump_Throw.png', cols: 4, rows: 2, max: 176, dx: -0.027 },
      hurt: { src: 'Character/DUCKY/07-Hurt/01-Hurt.png', cols: 3, rows: 2, max: 176, dx: 0.022, dy: -0.004 },
      dizzy: { src: 'Character/DUCKY/07-Hurt/02-Hurt_Dizzy.png', cols: 5, rows: 2, max: 176, dx: -0.01, dy: 0.004 },
      dead: { src: 'Character/DUCKY/08-Dead/08-Dead.png', cols: 5, rows: 2, max: 176, dx: -0.108, dy: -0.008 },
    },
  },
// PET_DEF  scale: 1, ox: 0.106, oy: 0.109
  'Penguin': {
    walkSheet: {
      src: 'Character/PENGUIN/03-Walk/03-Walk.png',
      cols: 4,
      rows: 3,
      max: 176,
      stride: 0.708
    },
    idleSheet: {
      src: 'Character/PENGUIN/01-Idle/02-Idle_Blink.png',
      cols: 4,
      rows: 3,
      max: 176,
      fps: 10,
      scale: 0.995,
      dx: 0.002,
      dy: 0.004
    },
    attackSheet: {
      src: 'Character/PENGUIN/02-Throw/02-Throw.png',
      cols: 4,
      rows: 2,
      max: 176,
      fps: 12.5,
      dx: 0.006,
      dy: 0.004
    },
    extra: {
      run: { src: 'Character/PENGUIN/04-Run/04-Run.png', cols: 5, rows: 2, max: 176, dx: 0.008, dy: 0.012 },
      jumpup: { src: 'Character/PENGUIN/06-Jump/01-Jump_Up.png', cols: 5, rows: 1, max: 176, dx: 0.008 },
      jumpfall: { src: 'Character/PENGUIN/06-Jump/02-Jump_Fall.png', cols: 5, rows: 1, max: 176, dx: 0.008 },
      jumpthrow: { src: 'Character/PENGUIN/06-Jump/03-Jump_Throw.png', cols: 4, rows: 2, max: 176, dx: -0.027 },
      hurt: { src: 'Character/PENGUIN/07-Hurt/01-Hurt.png', cols: 3, rows: 2, max: 176, dx: 0.023, dy: -0.004 },
      dizzy: { src: 'Character/PENGUIN/07-Hurt/02-Hurt_Dizzy.png', cols: 5, rows: 2, max: 176, dx: -0.01, dy: 0.004 },
      dead: { src: 'Character/PENGUIN/08-Dead/08-Dead.png', cols: 5, rows: 2, max: 176, dx: -0.107, dy: -0.008 },
    },
  },
// PET_DEF  scale: 1, ox: 0.076, oy: 0.125
  'Piggy': {
    walkSheet: {
      src: 'Character/PIGGY/03-Walk/03-Walk.png',
      cols: 4,
      rows: 3,
      max: 176,
      stride: 0.681
    },
    idleSheet: {
      src: 'Character/PIGGY/01-Idle/02-Idle_Blink.png',
      cols: 4,
      rows: 3,
      max: 176,
      fps: 10,
      dx: 0.004
    },
    attackSheet: {
      src: 'Character/PIGGY/02-Throw/02-Throw.png',
      cols: 4,
      rows: 2,
      max: 176,
      fps: 12.5,
      scale: 0.974,
      dx: 0.018
    },
    extra: {
      run: { src: 'Character/PIGGY/04-Run/04-Run.png', cols: 5, rows: 2, max: 176, scale: 0.979, dx: 0.004, dy: 0.02 },
      jumpup: { src: 'Character/PIGGY/06-Jump/01-Jump_Up.png', cols: 5, rows: 1, max: 176, dx: 0.002 },
      jumpfall: { src: 'Character/PIGGY/06-Jump/02-Jump_Fall.png', cols: 5, rows: 1, max: 176, dx: -0.002 },
      jumpthrow: { src: 'Character/PIGGY/06-Jump/03-Jump_Throw.png', cols: 4, rows: 2, max: 176, dx: -0.033 },
      hurt: { src: 'Character/PIGGY/07-Hurt/01-Hurt.png', cols: 3, rows: 2, max: 176, dx: 0.043 },
      dizzy: { src: 'Character/PIGGY/07-Hurt/02-Hurt_Dizzy.png', cols: 5, rows: 2, max: 176, dx: -0.016 },
      dead: { src: 'Character/PIGGY/08-Dead/08-Dead.png', cols: 5, rows: 2, max: 176, dx: -0.102 },
    },
  },
// PET_DEF  scale: 1, ox: 0.106, oy: 0.117
  'Polar': {
    walkSheet: {
      src: 'Character/POLAR/03-Walk/03-Walk.png',
      cols: 4,
      rows: 3,
      max: 176,
      stride: 0.711
    },
    idleSheet: {
      src: 'Character/POLAR/01-Idle/02-Idle_Blink.png',
      cols: 4,
      rows: 3,
      max: 176,
      fps: 10,
      scale: 0.995,
      dx: -0.002
    },
    attackSheet: {
      src: 'Character/POLAR/02-Throw/02-Throw.png',
      cols: 4,
      rows: 2,
      max: 176,
      fps: 12.5,
      scale: 0.99,
      dx: 0.004
    },
    extra: {
      run: { src: 'Character/POLAR/04-Run/04-Run.png', cols: 5, rows: 2, max: 176, dx: 0.004, dy: 0.016 },
      jumpup: { src: 'Character/POLAR/06-Jump/01-Jump_Up.png', cols: 5, rows: 1, max: 176, dx: 0.006 },
      jumpfall: { src: 'Character/POLAR/06-Jump/02-Jump_Fall.png', cols: 5, rows: 1, max: 176, dx: -0.006 },
      jumpthrow: { src: 'Character/POLAR/06-Jump/03-Jump_Throw.png', cols: 4, rows: 2, max: 176, dx: -0.033 },
      hurt: { src: 'Character/POLAR/07-Hurt/01-Hurt.png', cols: 3, rows: 2, max: 176, dx: 0.025 },
      dizzy: { src: 'Character/POLAR/07-Hurt/02-Hurt_Dizzy.png', cols: 5, rows: 2, max: 176, dx: -0.012 },
      dead: { src: 'Character/POLAR/08-Dead/08-Dead.png', cols: 5, rows: 2, max: 176, dx: -0.11 },
    },
  },
// PET_DEF  scale: 1.212, ox: 0.063, oy: 0.215
  'Reindeer': {
    walkSheet: {
      src: 'Character/REINDEER/03-Walk/03-Walk.png',
      cols: 4,
      rows: 3,
      max: 176,
      stride: 0.554
    },
    idleSheet: {
      src: 'Character/REINDEER/01-Idle/02-Idle_Blink.png',
      cols: 4,
      rows: 3,
      max: 176,
      fps: 10
    },
    attackSheet: {
      src: 'Character/REINDEER/02-Throw/02-Throw.png',
      cols: 4,
      rows: 2,
      max: 176,
      fps: 12.5,
      scale: 0.97,
      dx: 0.01
    },
    extra: {
      run: { src: 'Character/REINDEER/04-Run/04-Run.png', cols: 5, rows: 2, max: 176, scale: 0.994, dx: 0.008, dy: 0.012 },
      jumpup: { src: 'Character/REINDEER/06-Jump/01-Jump_Up.png', cols: 5, rows: 1, max: 176, dx: 0.002 },
      jumpfall: { src: 'Character/REINDEER/06-Jump/02-Jump_Fall.png', cols: 5, rows: 1, max: 176, dx: 0.016 },
      jumpthrow: { src: 'Character/REINDEER/06-Jump/03-Jump_Throw.png', cols: 4, rows: 2, max: 176, dx: -0.039 },
      hurt: { src: 'Character/REINDEER/07-Hurt/01-Hurt.png', cols: 3, rows: 2, max: 176, dx: 0.043 },
      dizzy: { src: 'Character/REINDEER/07-Hurt/02-Hurt_Dizzy.png', cols: 5, rows: 2, max: 176, dx: -0.02 },
      dead: { src: 'Character/REINDEER/08-Dead/08-Dead.png', cols: 5, rows: 2, max: 176, dx: -0.102, dy: -0.102 },
    },
  },
// PET_DEF  scale: 1, ox: 0.066, oy: 0.117
  'Tanuki': {
    walkSheet: {
      src: 'Character/TANUKI/03-Walk/03-Walk.png',
      cols: 4,
      rows: 3,
      max: 176,
      stride: 0.699
    },
    idleSheet: {
      src: 'Character/TANUKI/01-Idle/01-Idle.png',
      cols: 4,
      rows: 3,
      max: 176,
      fps: 10,
      dx: -0.002
    },
    attackSheet: {
      src: 'Character/TANUKI/02-Throw/02-Throw.png',
      cols: 4,
      rows: 2,
      max: 176,
      fps: 12.5,
      scale: 0.979
    },
    extra: {
      run: { src: 'Character/TANUKI/04-Run/04-Run.png', cols: 5, rows: 2, max: 176, dy: 0.016 },
      jumpup: { src: 'Character/TANUKI/06-Jump/01-Jump_Up.png', cols: 5, rows: 1, max: 176, dx: 0.006 },
      jumpfall: { src: 'Character/TANUKI/06-Jump/02-Jump_Fall.png', cols: 5, rows: 1, max: 176, dx: 0.01 },
      jumpthrow: { src: 'Character/TANUKI/06-Jump/03-Jump_Throw.png', cols: 4, rows: 2, max: 176, dx: -0.023 },
      hurt: { src: 'Character/TANUKI/07-Hurt/01-Hurt.png', cols: 3, rows: 2, max: 176, dx: 0.016 },
      dizzy: { src: 'Character/TANUKI/07-Hurt/02-Hurt_Dizzy.png', cols: 5, rows: 2, max: 176, dx: -0.008 },
      dead: { src: 'Character/TANUKI/08-Dead/08-Dead.png', cols: 5, rows: 2, max: 176, dx: -0.086 },
    },
  },
// PET_DEF  scale: 1, ox: 0.106, oy: 0.117
  'Teddy': {
    walkSheet: {
      src: 'Character/TEDDY/03-Walk/03-Walk.png',
      cols: 4,
      rows: 3,
      max: 176,
      stride: 0.711
    },
    idleSheet: {
      src: 'Character/TEDDY/01-Idle/02-Idle_Blink.png',
      cols: 4,
      rows: 3,
      max: 176,
      fps: 10,
      scale: 0.995,
      dx: -0.002
    },
    attackSheet: {
      src: 'Character/TEDDY/02-Throw/02-Throw.png',
      cols: 4,
      rows: 2,
      max: 176,
      fps: 12.5,
      scale: 0.99,
      dx: 0.004
    },
    extra: {
      run: { src: 'Character/TEDDY/04-Run/04-Run.png', cols: 5, rows: 2, max: 176, dx: 0.004, dy: 0.016 },
      jumpup: { src: 'Character/TEDDY/06-Jump/01-Jump_Up.png', cols: 5, rows: 1, max: 176, dx: 0.006 },
      jumpfall: { src: 'Character/TEDDY/06-Jump/02-Jump_Fall.png', cols: 5, rows: 1, max: 176, dx: -0.006 },
      jumpthrow: { src: 'Character/TEDDY/06-Jump/03-Jump_Throw.png', cols: 4, rows: 2, max: 176, dx: -0.033 },
      hurt: { src: 'Character/TEDDY/07-Hurt/01-Hurt.png', cols: 3, rows: 2, max: 176, dx: 0.025 },
      dizzy: { src: 'Character/TEDDY/07-Hurt/02-Hurt_Dizzy.png', cols: 5, rows: 2, max: 176, dx: -0.012 },
      dead: { src: 'Character/TEDDY/08-Dead/08-Dead.png', cols: 5, rows: 2, max: 176, dx: -0.11 },
    },
  },
};

// Cấu hình kỹ năng bắn lửa (thêm vào cuối config.js)
const FIREBALL_SPEED = 750; // Tốc độ bay của quả cầu lửa
const FIREBALL_LIFESPAN = 2.5; // Thời gian tồn tại của quả cầu lửa (giây)

// Kích thước thú CỐ ĐỊNH ở mọi vị trí (không còn to dần khi lại gần màn hình).
// Đổi cỡ chung cho tất cả thú: sửa PET_BASE_SIZE. Cỡ riêng từng con: sửa scale trong PET_DEF.
const PET_BASE_SIZE = 100;
const KEY_SPEED_WALK = 46;    // thú có ảnh động: bằng tốc độ đi bình thường (34–58, trung bình ~46)
const SELECTED_SPEED_MUL = 2;   // pet đang được chọn và di chuyển (phím / bấm điểm đến) đi nhanh gấp 2; pet không chọn đi lang thang như cũ
const KEY_SPEED_OTHER = 70;   // thú còn lại: bằng tốc độ đi bình thường (45–95, trung bình ~70)
