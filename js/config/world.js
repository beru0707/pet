/* ==================================================================
   CẤU HÌNH – THẾ GIỚI
   Kích thước thế giới game, vùng đi được, danh sách map.
   ================================================================== */

// CONFIG
// Kích thước thế giới game. Tỉ lệ CW/CH nên bằng tỉ lệ ảnh nền (nền 3072×1376 ≈ 2.233 -> 2286×1024).
const CW = 2286, CH = 1024;
const SAVE = 'petmap_pure_v2';
// WALKABILITY
const WALK_POLY = [[90,170],[CW-90,170],[CW-90,960],[90,960]];
const FORBIDDEN = [];
// ============ DANH SÁCH MAP (mỗi map = 1 ảnh nền + ảnh nền riêng; mọi map chạy liên tục) ============
// Thêm map: bỏ ảnh vào assets/background/ rồi thêm 1 dòng. id không trùng nhau, không dấu, không khoảng trắng.
// Map ĐẦU TIÊN là map mở lên khi vào game.
const MAPS = [
  {id:'grass', name:'Đồng cỏ', bg:'assets/background/grass.webp'},
  {id:'fire', name:'Lửa', bg:'assets/background/fire.webp'},
  {id:'beach',  name:'Bãi biển', bg:'assets/background/beach.webp'},
  {id:'jura',  name:'Jura Tempest', bg:'assets/background/jura.png'},
];
// true: lần đầu mở game (hoặc dữ liệu cũ) tất cả thú đã nằm sẵn ở map đầu tiên. false: thú nằm trong danh sách, người chơi tự thả vào map.
const PETS_START_PLACED = true;
