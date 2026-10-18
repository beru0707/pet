/* ==================================================================
   CẤU HÌNH – TRẬN ĐÁNH
   Thông số trận (BATTLE_CFG), loại địch + animation (ENEMY_TYPES), chỉ số chiến đấu của pet (PET_BATTLE).
   Muốn đổi số đợt / máu / sát thương / tốc độ: sửa file này.
   ================================================================== */

// ============ CẤU HÌNH TRẬN ĐÁNH (chỉnh ở đây) ============
const BATTLE_CFG = {
  map: 'fire',          // id map chiến đấu (trong MAPS)
  maxPets: 5,           // số pet tối đa được đặt
  reward: 60,           // xu thưởng khi thắng
  waveRest: 3,          // giây nghỉ trước mỗi đợt
  hpGrow: 0.25,         // mỗi đợt địch trâu hơn 25%
  blastRadius: 120,     // bán kính nổ của quả cầu lửa (px)
  barDY: 105,           // độ cao thanh máu pet so với chân (nhân với scale của pet)
  waves: [              // mỗi đợt: loại địch (trong ENEMY_TYPES), số lượng, giây giữa 2 con xuất hiện
    {type:'worm', count:3, gap:2.2},
    {type:'worm', count:4, gap:1.8},
    {type:'worm', count:6, gap:1.4},
  ]
};
// Loại địch. h = chiều cao vẽ (px thế giới) · anchor = vị trí "chân" trong khung (0..1 từ trên xuống)
// range = tầm cắn · cd = nghỉ giữa 2 lần cắn · dmg = sát thương mỗi cắn · speed = tốc độ chui đi
// sheets: các sprite sheet của địch (đọc theo lưới cols x rows, đếm từ khung 0).
// anim: mỗi trạng thái chọn sheet + dãy khung + fps. attack.hitAt = khung thứ mấy thì trúng đòn.
//   dive (lặn xuống) -> travel (chui đi) -> emerge (trồi lên) -> attack (cắn) -> dive ...
// Chưa có file ảnh thì địch vẽ tạm bằng khối tròn đỏ.
const range = (a, n) => Array.from({length:n}, (_, i) => a + i);
const ENEMY_TYPES = {
  worm: { name:'Sâu Cát', hp:70, dmg:9, speed:80, h:230, anchor:.86, range:150, cd:1.2,
    sheets: {
      main:   {src:'assets/worm/worm.webp',   cols:5, rows:5, frames:25, max:360},   // 36 khung: 16 lặn + 4 đi + 16 trồi
      attack: {src:'assets/worm/attack.webp', cols:4, rows:4, frames:16, max:360},   // 36 khung tấn công
    },
    anim: {
      dive:   {sheet:'main',   seq:range(0,9),  fps:14, scale: 0.68},
      travel: {sheet:'main',   seq:range(9,1),  fps:6, scale: 0.68},
      emerge: {sheet:'main',   seq:range(10,15), fps:14, scale:0.68},
      attack: {sheet:'attack', seq:range(0,16),  fps:12, hitAt:8, scale:0.68},
    }, 
  }
};
// Chỉ số chiến đấu của pet (không khai = mặc định). range: tầm đánh · cd: giây giữa 2 đòn
const PET_BATTLE_DEFAULT = {hp:100, dmg:12, range:170, cd:1.6};
const PET_BATTLE = {
  'Shibav3_1': {hp:90,  dmg:22, range:650, cd:1.5},   // có fireball: bắn xa, nổ lan
  'Wukong':    {hp:140, dmg:16, range:200, cd:1.4},
  'Wukongv3':  {hp:160, dmg:20, range:230, cd:1.4},
};
