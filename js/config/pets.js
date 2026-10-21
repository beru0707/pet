/* ==================================================================
   CẤU HÌNH – THÚ CƯNG
   Danh sách thú (PET_DEF), animation từng thú (PET_ANIM), cỡ thú, tốc độ đi bằng phím, kỹ năng bắn lửa.
   Muốn thêm / chỉnh thú: sửa file này.
   ================================================================== */

// PETS
// scale: hệ số nhân kích thước riêng cho từng con (1.0 = bình thường, 0.8 = nhỏ hơn 20%, 1.2 = lớn hơn 20%)
//        MỘT scale này áp dụng chung cho mọi trạng thái: đi, đứng yên, ngủ, tấn công (game tự cân ảnh các trạng thái cho nhân vật to bằng nhau)
const PET_DEF = [
  {name:'Benimaru', scale:1, sw:780, sh:640, barDY: 170},
  {name:'Souei', scale:1, sw:780, sh:640},
  {name:'Shion', scale:1, sw:780, sh:640},
  {name:'Shuna', scale:1, sw:780, sh:640},
  {name:'Swiftfox', scale:1, sw:780, sh:640},
  {name:'Flowerbeetle', scale:0.8, sw:700, sh:650},
  {name:'Shiba', scale:0.8, sw:780, sh:680},
  {name:'Gecko', scale:0.7, sw:780, sh:680},
  {name:'Snowbunny', scale:0.8, sw:780, sh:680},
  {name:'Wukong', scale:0.8, sw:780, sh:680},
  {name:'Wukongv2', scale:1.1, sw:780, sh:680},
  {name:'Wukongv3', scale:1.1, sw:780, sh:680},
  {name:'Shibav2', scale:0.8, sw:780, sh:680},
  {name:'Shibav3_1', scale:1, sw:780, sh:680},
  {name:'Voltreaver', scale:1.15, sw:780, sh:680},
  {name:'Dewgrub', scale:0.58, sw:780, sh:680},
  {name:'Ripplewing', scale:1, sw:780, sh:680},
  
];
// ============ CẤU HÌNH ANIMATION CHO TỪNG THÚ (bạn chỉnh ở đây) ============
// CHỈ DÙNG SPRITE SHEET: mỗi trạng thái là 1 ảnh ghép nhiều khung, game tự cắt theo lưới rồi phát animation.
// Số khung KHÔNG cố định: game tự nhận số cột / hàng / khung của từng sheet (6x6, 5x3, 8x1 ... đều được), đọc từ trái sang phải, từ trên xuống.
// Điều kiện: giữa các khung có lề trong suốt, và mở game qua http/https (Live Server...). Mở file:// thì ghi tay {src, cols, rows, frames}.
const SHEET_DEFAULT = {cols:6, rows:6, max:320};   
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
const PET_ANIM = {
  'Benimaru': {
    idleSheet: {
      src: 'assets/benimaru/idle.webp',
      fps: 12,
      scale: 1.43
    },
    walkSheet: {
      src: 'assets/benimaru/walk.webp',
      stride: 1,
      speed: 1,
      scale: 1.5
    },
    sleepSheet: {
      src: 'assets/benimaru/sleep.webp',
      cols: 1,
      rows: 1,
      scale: 1.43
    },
    attackSheet: {
      src: 'assets/benimaru/attack.webp',
      cols: 4,
      rows: 4,
      scale: 2.1,
      dx: 0.2,
      dy: 0,
    },
  },
  'Souei': {
    idleSheet: {
      src: 'assets/souei/idle.webp',
      fps: 12,
      scale: 1.4
    },
    walkSheet: {
      src: 'assets/souei/walk.webp',
      stride: 1,
      speed: 1,
      scale: 1.42
    },
    sleepSheet: {
      src: 'assets/souei/sleep.webp',
      cols: 1,
      rows: 1,
      scale: 1.4
    },
  },
  'Shion': {
    idleSheet: {
      src: 'assets/shion/idle.webp',
      fps: 12,
      scale: 1.48
    },
    walkSheet: {
      src: 'assets/shion/walk.webp',
      stride: 1,
      speed: 1,
      scale: 1.52
    },
    sleepSheet: {
      src: 'assets/shion/sleep.webp',
      cols: 1,
      rows: 1,
      scale: 1.48
    },
    attackSheet: {
      src: 'assets/shion/attack.webp',
      cols: 4,
      rows: 4,
      scale: 2.45
    },
  },
  'Shuna': {
    idleSheet: {
      src: 'assets/shuna/idle.webp',
      fps: 12,
      scale: 1.4
    },
    walkSheet: {
      src: 'assets/shuna/walk.webp',
      stride: 1,
      speed: 1,
      scale: 1.42
    },
    sleepSheet: {
      src: 'assets/shuna/sleep.webp',
      cols: 1,
      rows: 1,
      scale: 1.4
    },
  },
  'Shiba': {
    idleSheet: {
      src: 'assets/shiba/idle.webp',
      fps: 12,
      scale: 1
    },
    walkSheet: {
      src: 'assets/shiba/walk.webp',        
      stride: 1, 
      speed: 1
    },
    sleepSheet: {
      src: 'assets/shiba/sleep.webp',
      cols: 1,
      rows: 1
    },
  },
  'Swiftfox': {
    idleSheet: {
      src: 'assets/swiftfox/idle.webp',
      fps: 12,
      scale: 1
    },
    walkSheet: {
      src: 'assets/swiftfox/walk.webp',     
      stride: 1, 
      speed: 1
    },
    sleepSheet: {
      src: 'assets/swiftfox/sleep.webp',
      cols: 1,
      rows: 1
    },
  },
  'Flowerbeetle': {
    idleSheet: {
      src: 'assets/flowerbeetle/idle.webp',
      fps: 12,
      scale: 1
    },
    walkSheet: {
      src: 'assets/flowerbeetle/walk.webp', 
      stride: 1, 
      speed: 1,
      scale: 1.05
    },
    sleepSheet: {
      src: 'assets/flowerbeetle/sleep.webp',
      cols: 1,
      rows: 1
    },
  },
  'Gecko': {
    idleSheet: {
      src: 'assets/gecko/idle.webp',
      fps: 12,
      scale: 1
    },
    walkSheet: {
      src: 'assets/gecko/walk.webp',    
      stride: 1, 
      speed: 1
    },
    sleepSheet: {
      src: 'assets/gecko/sleep.webp',
      cols: 1,
      rows: 1
    },
  },
  'Snowbunny': {
    idleSheet: {
      src: 'assets/snowbunny/idle.webp',
      fps: 12,
      scale: 1,
    },
    walkSheet: {
      src: 'assets/snowbunny/walk.webp',    
      stride: 1, 
      speed: 1
    },
    sleepSheet: {
      src: 'assets/snowbunny/sleep.webp',
      cols: 1,
      rows: 1
    },
  },
  'Wukong': {   
    idleSheet: {
      src: 'assets/wukong/idle.webp',
      fps: 12,
      scale: 1
    },     
    walkSheet: {
      src: 'assets/wukong/walk.webp',
      stride: 1,
      speed: 1
    },
    sleepSheet: {
      src: 'assets/wukong/sleep.webp',
      cols: 1,
      rows: 1
    },
    attackSheet: {
      src: 'assets/wukong/attack.webp',
      cols:5,
      rows:5, 
      scale: 1.8
    },    
  },
  'Wukongv2': {
    idleSheet: {
      src: 'assets/wukongv2/idle.webp',
      fps: 12,
      scale: 1
    },
    walkSheet: {
      src: 'assets/wukongv2/walk.webp',
      stride: 1,
      speed: 1
    },    
    sleepSheet: {
      src:'assets/wukongv2/sleep.webp', 
      cols: 1, 
      rows: 1
    }, 
  },
  'Wukongv3': {
    idleSheet: {
      src: 'assets/wukongv3/idle.webp',
      fps: 12,
      scale: 1
    },
    walkSheet: {
      src: 'assets/wukongv3/walk.webp',
      stride: 1,
      speed: 1
    },     
    sleepSheet: {
      src: 'assets/wukongv3/sleep.webp',
      cols: 1,
      rows: 1
    },
    attackSheet: {
      src: 'assets/wukongv3/attack.webp',
      cols:5,
      rows:5,
      scale: 2.8
    }, 
  },
  'Dewgrub': {
    idleSheet: {
      src: 'assets/dewgrub/idle.webp',
      fps: 12,
      scale: 1
    },
    walkSheet: {
      src: 'assets/dewgrub/walk.webp',      
      stride: 1, 
      speed: 1,
      scale: 1.1
    },
    sleepSheet: {
      src: 'assets/dewgrub/sleep.webp',
      cols: 1,
      rows: 1
    },
  },
  'Ripplewing': {
    idleSheet: {
      src: 'assets/ripplewing/idle.webp',
      fps: 12,
      scale: 0.9
    },
    walkSheet: {
      src: 'assets/ripplewing/walk.webp',   
      stride: 1, 
      speed: 1
    },
    sleepSheet: {
      src: 'assets/ripplewing/sleep.webp',
      cols: 1,
      rows: 1,
      scale: 0.88
    },
  },
  'Voltreaver': {
    idleSheet: {
      src: 'assets/voltreaver/idle.webp',
      fps: 12,
      scale: 1
    },
    walkSheet: {
      src: 'assets/voltreaver/walk.webp',
      stride: 1,
      speed: 1
    },
    sleepSheet:{
      src:'assets/voltreaver/sleep.webp', 
      cols: 1, 
      rows: 1
    },
  },
  'Shibav2': {
    idleSheet: {
      src: 'assets/shibav2/idle.webp',
      fps: 12,
      scale: 1
    },
    walkSheet: {
      src: 'assets/shibav2/walk.webp',      
      stride: 1, 
      speed: 1
    },
    sleepSheet: {
      src: 'assets/shibav2/sleep.webp',
      cols: 1,
      rows: 1
    },
  },
  'Shibav3_1': {
    idleSheet: {
      src: 'assets/shibav3_1/idle.webp',
      fps: 12,
      scale: 1
    },
    walkSheet: {
      src: 'assets/shibav3_1/walk.webp',
      stride: 1,
      speed: 1
    },
    sleepSheet: {
      src:'assets/shibav3_1/sleep.webp', 
      cols: 1, 
      rows: 1
    },
    attackSheet: {
      src: 'assets/shibav3_1/attack.webp',
      cols: 7,
      rows: 3,
      frames: 21,
      scale: 0.9,
      fps: 30
    },
    fireballSheet: {
      src:'assets/shibav3_1/fireball.webp', 
      scale: 1.5
    },
    explosionSheet: {
      src:'assets/shibav3_1/explosion.webp', 
      cols: 4,
      rows: 5,
      frames: 20,
      scale: 2
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
const KEY_SPEED_OTHER = 70;   // thú còn lại: bằng tốc độ đi bình thường (45–95, trung bình ~70)
