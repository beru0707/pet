/* ==================================================================
   CẤU HÌNH – THÚ CƯNG
   Danh sách thú (PET_DEF), animation từng thú (PET_ANIM), cỡ thú, tốc độ đi bằng phím, kỹ năng bắn lửa.
   Muốn thêm / chỉnh thú: sửa file này.
   ================================================================== */

// PETS
// scale: hệ số nhân kích thước riêng cho từng con (1.0 = bình thường, 0.8 = nhỏ hơn 20%, 1.2 = lớn hơn 20%)
//        MỘT scale này áp dụng chung cho mọi trạng thái: đi, đứng yên, ngủ, tấn công (game tự cân ảnh các trạng thái cho nhân vật to bằng nhau)
const PET_DEF = [
  {name:'Chicken', scale:0.825, sw:137, sh:200, spriteLeft:true},
  {name:'Ducky',   scale:0.825, sw:143, sh:200, spriteLeft:true},
  {name:'Penguin', scale:0.825, sw:142, sh:200, spriteLeft:true},
];
// spriteLeft: true = ảnh gốc nhìn sang TRÁI (game sẽ lật khi đi sang phải)
// ============ CẤU HÌNH ANIMATION CHO TỪNG THÚ (bạn chỉnh ở đây) ============
// CHỈ DÙNG SPRITE SHEET: mỗi trạng thái là 1 ảnh ghép nhiều khung, game tự cắt theo lưới rồi phát animation.
// Số khung KHÔNG cố định: game tự nhận số cột / hàng / khung của từng sheet (6x6, 5x3, 8x1 ... đều được), đọc từ trái sang phải, từ trên xuống.
// Điều kiện: giữa các khung có lề trong suốt, và mở game qua http/https (Live Server...). Mở file:// thì ghi tay {src, cols, rows, frames}.
const SHEET_DEFAULT = {cols:6, rows:6, max:256};   // max = cạnh dài tối đa của 1 khung sau khi cắt (px). Thú chỉ vẽ cao ~100-160px nên 256 là dư; RAM tỉ lệ bình phương. Sheet nào vẽ rất to thì ghi riêng max trong sheet đó   
//   walkSheet   : (BẮT BUỘC) sheet ĐI BỘ.  Thú nào chưa có walkSheet -> không hiện (F12 có cảnh báo [PET_ANIM])
//   idleSheet   : sheet ĐỨNG YÊN (nhiều khung = chớp mắt). Bỏ trống = tự tìm idle.png cạnh walk.png; không có thì dùng khung 1 của walk
//   sleepSheet  : ảnh NGỦ. Bỏ trống = tự tìm sleep.png (ảnh đơn); không có thì dùng ảnh đứng yên
//   attackSheet : sheet TẤN CÔNG (chỉ Shibav3_1, phím Enter)
//   fireballSheet / explosionSheet : sheet quả cầu lửa / vụ nổ của kỹ năng bắn (ghi kèm frames: số khung thật)
//   Mỗi mục viết ngắn 'đường dẫn.png' (tự nhận lưới) hoặc ép tay {src:'...', cols:5, rows:3, frames:13}. Ảnh đơn: {src:'...', cols:1, rows:1}
//   stride : độ dài 1 chu kỳ bước (lớn hơn = chân bước chậm hơn so với quãng đường; mặc định 1)
//   speed  : hệ số tốc độ đi (mặc định 1; 0.7 = chậm hơn, 1.3 = nhanh hơn)
//   idleFps / sleepFps : số khung/giây của idle (mặc định 12) / ngủ (mặc định 6) · attackFps (mặc định 12.5) · attackFireFrame: khung thứ mấy thì bắn (mặc định 6)
//   idleFit / sleepFit / attackFit : cách cân cỡ ảnh cho bằng nhân vật lúc đi: 'height' (idle, attack mặc định), 'width' (sleep mặc định), 'none' (không cân)
//   idleScale / sleepScale / attackScale : nhân thêm cỡ (1 = giữ nguyên; 1.2 = to hơn 20%)
// Nhân vật 4 hướng (nếu có bộ ảnh front/back/left/right): khai {dirs:'thư-mục'} + ảnh <hướng>-<walk|idle|blink|attack>.webp, game chọn khung theo p.dir
const PET_DIRS = ['front','back','left','right'];
// Chicken / Ducky / Penguin: 1 hướng nhìn (lật ngang khi đổi hướng). walk 4x3=12 · idle 4x3=12 (có chớp mắt) · attack (Throw) 4x2=8
// PET_EXTRA: sheet phụ (đã cắt viền, có thể rộng/cao hơn khung chuẩn): cols/rows + scale (so với khung chuẩn) + dx/dy (phần của chiều cao vẽ) để chân vẫn đứng đúng chỗ.
// run 5x2 · jumpup/jumpfall 5x1 · jumpthrow 4x2 (tấn công khi đang nhảy) · hurt 3x2 · dizzy 5x2 (bị đánh nặng, máu <30%) · dead 5x2
const PET_EXTRA = {"chicken":{"run":{"cols":5,"rows":2,"scale":1.055,"dx":0.0,"dy":0.0},"jumpup":{"cols":5,"rows":1,"scale":1.11,"dx":0.0,"dy":0.0},"jumpfall":{"cols":5,"rows":1,"scale":1.105,"dx":0.0,"dy":0.0},"jumpthrow":{"cols":4,"rows":2,"scale":1.12,"dx":-0.02,"dy":0.0},"hurt":{"cols":3,"rows":2,"scale":1.005,"dx":0.0,"dy":-0.005},"dizzy":{"cols":5,"rows":2,"scale":1.0,"dx":-0.014,"dy":0.0},"dead":{"cols":5,"rows":2,"scale":1.18,"dx":-0.13,"dy":-0.098}},"ducky":{"run":{"cols":5,"rows":2,"scale":1.055,"dx":0.0,"dy":0.0},"jumpup":{"cols":5,"rows":1,"scale":1.115,"dx":0.0,"dy":0.0},"jumpfall":{"cols":5,"rows":1,"scale":1.1,"dx":0.0,"dy":0.0},"jumpthrow":{"cols":4,"rows":2,"scale":1.13,"dx":-0.022,"dy":0.0},"hurt":{"cols":3,"rows":2,"scale":1.0,"dx":0.0,"dy":-0.002},"dizzy":{"cols":5,"rows":2,"scale":1.0,"dx":-0.015,"dy":0.0},"dead":{"cols":5,"rows":2,"scale":1.19,"dx":-0.117,"dy":-0.1}},"penguin":{"run":{"cols":5,"rows":2,"scale":1.055,"dx":0.0,"dy":0.0},"jumpup":{"cols":5,"rows":1,"scale":1.115,"dx":0.0,"dy":0.0},"jumpfall":{"cols":5,"rows":1,"scale":1.115,"dx":0.0,"dy":0.0},"jumpthrow":{"cols":4,"rows":2,"scale":1.12,"dx":-0.021,"dy":0.0},"hurt":{"cols":3,"rows":2,"scale":1.005,"dx":0.0,"dy":-0.005},"dizzy":{"cols":5,"rows":2,"scale":1.0,"dx":-0.015,"dy":0.0},"dead":{"cols":5,"rows":2,"scale":1.165,"dx":-0.12,"dy":-0.103}}};
const petSheets = id => ({
  walkSheet:   {src:'assets/'+id+'/walk.webp',   cols:4, rows:3},
  idleSheet:   {src:'assets/'+id+'/idle.webp',   cols:4, rows:3, fps:12},
  attackSheet: {src:'assets/'+id+'/attack.webp', cols:4, rows:2, fps:12.5},
  extra: Object.fromEntries(Object.entries(PET_EXTRA[id]).map(([k,v]) => [k, Object.assign({src:'assets/'+id+'/'+k+'.webp'}, v)])),
});
const PET_ANIM = {
  'Chicken': petSheets('chicken'),
  'Ducky':   petSheets('ducky'),
  'Penguin': petSheets('penguin'),
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
