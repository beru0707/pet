/* ==================================================================
   CẤU HÌNH – file bạn chỉnh nhiều nhất
   Kích thước, danh sách thú, animation từng thú, cỡ thú, tốc độ phím, vật phẩm, loại đường
   ================================================================== */

// CONFIG
// Kích thước thế giới game. Tỉ lệ CW/CH nên bằng tỉ lệ ảnh nền (nền 3072×1376 ≈ 2.233 -> 2286×1024).
const CW = 2286, CH = 1024;
const SAVE = 'petmap_pure_v2';
// WALKABILITY
const WALK_POLY = [[90,170],[CW-90,170],[CW-90,960],[90,960]];
const FORBIDDEN = [];
// PETS
// scale: hệ số nhân kích thước riêng cho từng con (1.0 = bình thường, 0.8 = nhỏ hơn 20%, 1.2 = lớn hơn 20%)
const PET_DEF = [
  {name:'Sói Sét',        col:0,row:0, sx:50, sy:20, sw:780,sh:640, scale:1,   imgKey:'swiftfox'},
  {name:'Bọ Hoa Tiên',    col:1,row:0, sx:100,sy:20, sw:700,sh:650, scale:0.8, imgKey:'flowerbeetle'},
  {name:'Cún Shiba',      col:2,row:0, sx:50, sy:30, sw:780,sh:680, scale:0.8, imgKey:'shiba'},
  {name:'Rồng Lửa',       col:0,row:1, sx:30, sy:20, sw:820,sh:700, scale:0.9, imgKey:'firedragon'},
  {name:'Thằn Lằn Băng',  col:1,row:1, sx:60, sy:30, sw:780,sh:700, scale:0.8, imgKey:'waterdragon'},
  {name:'Cáo Lửa',        col:2,row:1, sx:50, sy:30, sw:780,sh:680, scale:0.8, imgKey:'firefox'},
  {name:'Gecko',          col:2,row:1, sx:50, sy:30, sw:780,sh:680, scale:0.7, imgKey:'bluegecko'},
  {name:'Shibav2',        col:2,row:1, sx:50, sy:30, sw:780,sh:680, scale:0.8, imgKey:'shibav2'},
  {name:'Shibav3_1',      col:2,row:1, sx:50, sy:30, sw:780,sh:680, scale:0.9, imgKey:'shibav3_1'},
].map(d=>({...d, srcX:d.col*917+d.sx, srcY:d.row*768+d.sy}));
// ============ CẤU HÌNH ANIMATION CHO TỪNG THÚ (bạn chỉnh ở đây) ============
// Tạo thư mục chứa các khung hình (sprite_1.png, sprite_2.png, ... đánh số liên tiếp từ 1), game tự đếm số khung.
// Thú nào chưa có thư mục / chưa có ảnh -> tự dùng ảnh tĩnh như cũ.
//   folder : thư mục ảnh
//   stride : độ dài 1 chu kỳ bước (lớn hơn = chân bước chậm hơn so với quãng đường; mặc định 1)
//   speed  : hệ số tốc độ đi (mặc định 1; 0.7 = chậm hơn, 1.3 = nhanh hơn)
const PET_ANIM = {
  'Cún Shiba':      {folder:'assets/shiba',       stride:1, speed:1},
  'Cáo Lửa':        {folder:'assets/firefox',     stride:1, speed:1},
  'Sói Sét':        {folder:'assets/swiftfox',    stride:1, speed:1},
  'Bọ Hoa Tiên':    {folder:'assets/flowerbeetle',stride:1, speed:1},
  'Rồng Lửa':       {folder:'assets/firedragon',  stride:1, speed:1},
  'Thằn Lằn Băng':  {folder:'assets/waterdragon', stride:1, speed:1},
  'Gecko':          {folder:'assets/bluegecko',   stride:1, speed:1},
  'Shibav2':        {folder:'assets/shibav2',     stride:1, speed:1},
  'Shibav3_1': {
    folder:'assets/shibav3_1/walk', 
    attackFolder:'assets/shibav3_1/attack/fireball', 
    stride:1, 
    speed:1},   
};

// Cấu hình kỹ năng bắn lửa (thêm vào cuối config.js)
const FIREBALL_SPEED = 600; // Tốc độ bay của quả cầu lửa
const FIREBALL_LIFESPAN = 2.5; // Thời gian tồn tại của quả cầu lửa (giây)


// Kích thước thú CỐ ĐỊNH ở mọi vị trí (không còn to dần khi lại gần màn hình).
// Đổi cỡ chung cho tất cả thú: sửa PET_BASE_SIZE. Cỡ riêng từng con: sửa scale trong PET_DEF.
const PET_BASE_SIZE = 100;
const KEY_SPEED_WALK = 46;    // thú có ảnh động: bằng tốc độ đi bình thường (34–58, trung bình ~46)
const KEY_SPEED_OTHER = 70;   // thú còn lại: bằng tốc độ đi bình thường (45–95, trung bình ~70)
const DECOR_KEY = 'petmap_decor_v1';
const CELL = 24, GW = Math.ceil(CW/CELL), GH = Math.ceil(CH/CELL);
const PATH_TYPES = [
  {k:'dirt',  n:'Đường đất', c:'#c99a5b', e:'#7d5427'},
  {k:'stone', n:'Đá cuội',   c:'#b9bcc2', e:'#5f636b'},
  {k:'sand',  n:'Cát',       c:'#efdb9a', e:'#a98c48'},
  {k:'plank', n:'Ván gỗ',    c:'#b87a41', e:'#5e3517'}
];
// Ảnh vật phẩm đã biết trong assets (tên file -> tên hiển thị, chiều cao mặc định khi đặt)
const KNOWN_ITEMS = [
  ['sprite_14','Bụi hoa hồng',70],['sprite_15','Bụi hoa trắng',70],['sprite_20','Khóm hoa đỏ',60],['sprite_21','Hoa hướng dương',84],
  ['sprite_7','Cây lớn',250],['sprite_19','Ghế gỗ',70],['sprite_10','Khúc xương',34],['sprite_11','Bát ăn xanh',40],
  ['sprite_12','Bát hồng',40],['sprite_9','Bóng xanh',30],['sprite_8','Bóng trắng',30]
];
const TREE_KEYS = ['sprite_7'];   // cây: thú được đi qua (đi sau tán cây). Muốn thêm loại khác thì thêm tên file vào đây

