/* ==================================================================
   BATTLE – TRẠNG THÁI
   Biến BT (pha: off / entering / prep / fight / result / leaving), chỉ số chiến đấu của pet, chặn lưu game khi đang đánh.
   ================================================================== */

// ============ TRẠNG THÁI ============
const BT = { phase:'off', map:null, lobby:null, snap:[], enemies:[], shots:[], fx:[], frames:{}, stat:{}, kills:0, total:0,
             waveIdx:0, waveState:'rest', spawned:0, nextAt:0, restUntil:0, nowT:0, elapsed:0, drag:null, banner:'', bannerT:0 };
// Chỉ số chiến đấu = gốc (cấp 1) x hệ số theo cấp. Dùng được cả trong menu (xem body.js) lẫn trong trận.
const btStat = def => {
  const s = Object.assign({}, PET_BATTLE_DEFAULT, PET_BATTLE[def.name] || {}), lv = petLv(def.name).lv - 1;
  s.hp = Math.round(s.hp * (1 + LEVEL_CFG.hpPerLv * lv)); s.dmg = Math.round(s.dmg * (1 + LEVEL_CFG.dmgPerLv * lv));
  return s;
};
// Cộng EXP, tự lên cấp. Trả về {from, to, gain, exp, need} để báo ở màn kết quả.
function petAddExp(name, gain){
  const L = petLv(name), from = L.lv;
  L.exp += gain;
  while(L.lv < LEVEL_CFG.max && L.exp >= petExpNeed(L.lv)){ L.exp -= petExpNeed(L.lv); L.lv++; }
  if(L.lv >= LEVEL_CFG.max) L.exp = 0;
  return {from, to:L.lv, gain, exp:L.exp, need:L.lv >= LEVEL_CFG.max ? 0 : petExpNeed(L.lv)};
}

// không lưu game khi đang đánh (tránh ghi đè vị trí pet ở phòng chờ)
(function(){ if(typeof saveGame === 'function'){ const o = saveGame; window.saveGame = function(){ if(BT.phase !== 'off') return; return o.apply(this, arguments); }; } })();
