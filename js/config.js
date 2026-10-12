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
// ============ DANH SÁCH MAP (mỗi map = 1 ảnh nền + đường/vật phẩm riêng; mọi map chạy liên tục) ============
// Thêm map: bỏ ảnh vào assets/background/ rồi thêm 1 dòng. id không trùng nhau, không dấu, không khoảng trắng.
// Map ĐẦU TIÊN là map mở lên khi vào game.
const MAPS = [
  {id:'grass', name:'Đồng cỏ', bg:'assets/background/grass.png'},
  {id:'fire', name:'Lửa', bg:'assets/background/fire.png'},
  {id:'beach',  name:'Bãi biển', bg:'assets/background/beach.png'},
];
// true: lần đầu mở game (hoặc dữ liệu cũ) tất cả thú đã nằm sẵn ở map đầu tiên. false: thú nằm trong danh sách, người chơi tự thả vào map.
const PETS_START_PLACED = true;
// PETS
// scale: hệ số nhân kích thước riêng cho từng con (1.0 = bình thường, 0.8 = nhỏ hơn 20%, 1.2 = lớn hơn 20%)
//        MỘT scale này áp dụng chung cho mọi trạng thái: đi, đứng yên, ngủ, tấn công (game tự cân ảnh các trạng thái cho nhân vật to bằng nhau)
const PET_DEF = [
  {name:'Sói Sét', scale:1, sw:780, sh:640},
  {name:'Bọ Hoa Tiên', scale:0.8, sw:700, sh:650},
  {name:'Cún Shiba', scale:0.8, sw:780, sh:680},
  {name:'Rồng Lửa', scale:0.9, sw:820, sh:700},
  {name:'Thằn Lằn Băng', scale:0.8, sw:780, sh:700},
  {name:'Cáo Lửa', scale:0.8, sw:780, sh:680},
  {name:'Gecko', scale:0.7, sw:780, sh:680},
  {name:'Snowbunny', scale:0.8, sw:780, sh:680},
  {name:'Wukong', scale:0.8, sw:780, sh:680},
  {name:'Wukongv2', scale:1.1, sw:780, sh:680},
  {name:'Wukongv3', scale:1.1, sw:780, sh:680},
  {name:'Shibav2', scale:0.8, sw:780, sh:680},
  {name:'Shibav3_1', scale:1, sw:780, sh:680},
  {name:'Voltreaver', scale:1.15, sw:780, sh:680},
];
// ============ CẤU HÌNH ANIMATION CHO TỪNG THÚ (bạn chỉnh ở đây) ============
// Tạo thư mục chứa các khung hình (sprite_1.png, sprite_2.png, ... đánh số liên tiếp từ 1), game tự đếm số khung.
// Thú nào chưa có thư mục / chưa có ảnh -> không hiện (console F12 có cảnh báo [PET_ANIM]). Không còn ảnh tĩnh dự phòng.
//   folder : thư mục ảnh
//   stride : độ dài 1 chu kỳ bước (lớn hơn = chân bước chậm hơn so với quãng đường; mặc định 1)
//   speed  : hệ số tốc độ đi (mặc định 1; 0.7 = chậm hơn, 1.3 = nhanh hơn)
//   idle   : (tùy chọn) ảnh khi đứng yên. Mặc định tự lấy assets/pet/<tên thư mục>.png ; idle:false để tắt
//   idleFit / sleepFit : (tùy chọn) cách cân cỡ ảnh đứng yên / ngủ cho bằng nhân vật lúc đi: 'height' (bằng chiều cao, mặc định cho idle), 'width' (bằng chiều ngang, mặc định cho sleep), 'none' (không cân)
//   attackFit / attackScale : giống trên, cho ảnh tấn công (mặc định 'height')
//   idleScale / sleepScale : (tùy chọn) nhân thêm cỡ cho ảnh đứng yên / ngủ (1 = giữ nguyên; 1.2 = to hơn 20%)
//   sleep  : (tùy chọn) ảnh khi ngủ. Mặc định assets/<thư mục>/sleep/<thư mục>_sleep.png ; thiếu thì dùng ảnh đứng yên ; sleep:false để tắt
const PET_ANIM = {
  'Cún Shiba':      {folder:'assets/shiba',       stride:1, speed:1},
  'Cáo Lửa':        {folder:'assets/firefox',     stride:1, speed:1},
  'Sói Sét':        {folder:'assets/swiftfox',    stride:1, speed:1},
  'Bọ Hoa Tiên':    {folder:'assets/flowerbeetle',stride:1, speed:1},
  'Rồng Lửa':       {folder:'assets/firedragon',  stride:1, speed:1},
  'Thằn Lằn Băng':  {folder:'assets/waterdragon', stride:1, speed:1},
  'Gecko':          {folder:'assets/bluegecko',   stride:1, speed:1},
  'Snowbunny':      {folder:'assets/snowbunny',   stride:1, speed:1},
  'Wukong':         {folder:'assets/wukong',      stride:1, speed:1},
  'Wukongv2':       {folder:'assets/wukongv2',    stride:1, speed:1},
  'Wukongv3':       {folder:'assets/wukongv3',    stride:1, speed:1},
  'Voltreaver': {
    folder:'assets/voltreaver/walk',  
    stride:1, 
    speed:1},
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

