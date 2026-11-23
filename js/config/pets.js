/* ==================================================================
   CẤU HÌNH – THÚ CƯNG
   Danh sách thú (PET_DEF), animation từng thú (PET_ANIM), cỡ thú, tốc độ đi bằng phím, kỹ năng bắn lửa.
   Muốn thêm / chỉnh thú: sửa file này.
   ================================================================== */

// PETS – mỗi con lấy ảnh từ thư mục Character/<dir>/ (bộ sprite sheet: 01-Idle, 02-Throw, 03-Walk, 04-Run, 06-Jump, 07-Hurt, 08-Dead).
// Thêm pet mới: chép thư mục sprite vào Character/ cùng cấu trúc rồi thêm 1 dòng ở đây (xem số đo bên dưới).
//   dir       : tên thư mục trong Character/
//   blink     : true = dùng 02-Idle_Blink.png (có chớp mắt) cho đứng yên; false = thư mục không có file đó, dùng 01-Idle.png
//   scale     : hệ số nhân kích thước riêng cho từng con (1.0 = khung cao PET_BASE_SIZE px). Đã chỉnh để mọi pet cao thấy được ~80px.
//               MỘT scale này áp dụng chung cho mọi trạng thái: đi, đứng yên, tấn công
//   ox, oy    : bù lệch cho MỌI trạng thái (đơn vị = chiều cao khung): ảnh gốc để nhân vật lệch trái và chừa lề dưới, nên cần kéo vào giữa (ox) và hạ xuống chạm chân (oy)
//   vis       : phần chiều cao khung mà nhân vật thật sự chiếm (dùng để tính vùng bấm chọn pet)
//   barDY     : độ cao thanh máu so với chân (nhân với scale)
//   stride    : độ dài 1 chu kỳ bước (nhỏ hơn = chân bước nhanh hơn so với quãng đường đi)
//   sw, sh    : kích thước khung gốc (chỉ dùng làm tỉ lệ khi ảnh chưa nạp xong)
// ox/oy/vis/stride/scale đo tự động từ ảnh (vùng nhìn thấy của từng khung); không vừa mắt thì chỉnh tay.
const PET_DEF = [
  {name:'Chicken', dir:'CHICKEN',  blink:true, scale:1.055, ox:0.115, oy:0.112, vis:0.759, barDY:83.4, stride:0.668, sw:174, sh:200, spriteLeft:true},
  {name:'Ducky',   dir:'DUCKY',    blink:true, scale:1.066, ox:0.105, oy:0.114, vis:0.751, barDY:82.6, stride:0.667, sw:172, sh:200, spriteLeft:true},
  {name:'Penguin', dir:'PENGUIN',  blink:true, scale:1.063, ox:0.108, oy:0.113, vis:0.753, barDY:82.8, stride:0.666, sw:173, sh:200, spriteLeft:true},
  {name:'Piggy',   dir:'PIGGY',    blink:true, scale:1.107, ox:0.082, oy:0.130, vis:0.723, barDY:79.5, stride:0.615, sw:180, sh:200, spriteLeft:true},
  {name:'Polar',   dir:'POLAR',    blink:true, scale:1.056, ox:0.105, oy:0.120, vis:0.757, barDY:83.3, stride:0.673, sw:172, sh:200, spriteLeft:true},
  {name:'Reindeer', dir:'REINDEER', blink:true, scale:1.292, ox:0.065, oy:0.218, vis:0.619, barDY:68.1, stride:0.520, sw:182, sh:200, spriteLeft:true},
  {name:'Tanuki',  dir:'TANUKI',   blink:false, scale:1.074, ox:0.065, oy:0.120, vis:0.745, barDY:81.9, stride:0.651, sw:175, sh:200, spriteLeft:true},
  {name:'Teddy',   dir:'TEDDY',    blink:true, scale:1.056, ox:0.105, oy:0.120, vis:0.757, barDY:83.3, stride:0.673, sw:172, sh:200, spriteLeft:true},
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
const CHAR_MAX = 176;   // cạnh dài tối đa của 1 khung sau khi cắt (px). Pet vẽ cao ~80-130px trên màn hình; 176 đủ nét mà RAM vẫn vừa (mỗi pet ~86 khung)
const petSheets = d => {
  const S = (file, cols, rows, o) => Object.assign({src:'Character/'+d.dir+'/'+file, cols, rows, max:CHAR_MAX}, o);
  return {
    walkSheet:   S('03-Walk/03-Walk.png', 4, 3, {stride:d.stride}),
    idleSheet:   S(d.blink ? '01-Idle/02-Idle_Blink.png' : '01-Idle/01-Idle.png', 4, 3, {fps:10}),
    attackSheet: S('02-Throw/02-Throw.png', 4, 2, {fps:12.5}),
    extra: {
      run:       S('04-Run/04-Run.png', 5, 2),
      jumpup:    S('06-Jump/01-Jump_Up.png', 5, 1),
      jumpfall:  S('06-Jump/02-Jump_Fall.png', 5, 1),
      jumpthrow: S('06-Jump/03-Jump_Throw.png', 4, 2),
      hurt:      S('07-Hurt/01-Hurt.png', 3, 2),
      dizzy:     S('07-Hurt/02-Hurt_Dizzy.png', 5, 2),
      dead:      S('08-Dead/08-Dead.png', 5, 2),
    },
  };
};
const PET_ANIM = Object.fromEntries(PET_DEF.map(d => [d.name, petSheets(d)]));

// Cấu hình kỹ năng bắn lửa (thêm vào cuối config.js)
const FIREBALL_SPEED = 750; // Tốc độ bay của quả cầu lửa
const FIREBALL_LIFESPAN = 2.5; // Thời gian tồn tại của quả cầu lửa (giây)

// Kích thước thú CỐ ĐỊNH ở mọi vị trí (không còn to dần khi lại gần màn hình).
// Đổi cỡ chung cho tất cả thú: sửa PET_BASE_SIZE. Cỡ riêng từng con: sửa scale trong PET_DEF.
const PET_BASE_SIZE = 100;
const KEY_SPEED_WALK = 46;    // thú có ảnh động: bằng tốc độ đi bình thường (34–58, trung bình ~46)
const SELECTED_SPEED_MUL = 2;   // pet đang được chọn và di chuyển (phím / bấm điểm đến) đi nhanh gấp 2; pet không chọn đi lang thang như cũ
const KEY_SPEED_OTHER = 70;   // thú còn lại: bằng tốc độ đi bình thường (45–95, trung bình ~70)
