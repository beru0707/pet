/* ==================================================================
   CẤU HÌNH – TRANG TRÍ
   Khóa lưu trang trí, ô lưới, loại đường, danh sách vật phẩm.
   ================================================================== */

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
