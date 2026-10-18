/* ==================================================================
   BATTLE – TRẠNG THÁI
   Biến BT (pha: off / entering / prep / fight / result / leaving), chỉ số chiến đấu của pet, chặn lưu game khi đang đánh.
   ================================================================== */

// ============ TRẠNG THÁI ============
const BT = { phase:'off', map:null, lobby:null, snap:[], enemies:[], fx:[], frames:{}, stat:{}, kills:0, total:0,
             waveIdx:0, waveState:'rest', spawned:0, nextAt:0, restUntil:0, nowT:0, elapsed:0, drag:null, banner:'', bannerT:0 };
const btStat = def => Object.assign({}, PET_BATTLE_DEFAULT, PET_BATTLE[def.name] || {});

// không lưu game khi đang đánh (tránh ghi đè vị trí pet ở phòng chờ)
(function(){ if(typeof saveGame === 'function'){ const o = saveGame; window.saveGame = function(){ if(BT.phase !== 'off') return; return o.apply(this, arguments); }; } })();
