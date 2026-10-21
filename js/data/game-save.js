/* ==================================================================
   DATA – LƯU GAME
   Trạng thái game (xu, cấp, dữ liệu thú) + lưu / tải localStorage.
   ================================================================== */

// GAME STATE
let state = { coins:200, xp:0, lv:1, petsData:[] };
function saveGame(){
  state.petsData = PETS.map(p=>({id:p.def.name, hunger:p.hunger, happy:p.happy, energy:p.energy, x:p.x, y:p.y, map:p.map}));
  localStorage.setItem(SAVE, JSON.stringify(state));
}
function loadGame(){
  try {
    const raw = localStorage.getItem(SAVE); if(!raw) return;
    const s = JSON.parse(raw);
    state.coins = s.coins||200; state.lv = s.lv||1; state.xp = s.xp||0;
    if(s.petsData) state.petsData = s.petsData;
    _savedById = null;
  } catch(e){}
}
// Dữ liệu đã lưu của 1 thú, tra theo id (= tên). Bản lưu cũ chưa có id thì tra theo thứ tự cũ trong PET_DEF.
let _savedById = null;
function savedPet(def){
  if(!_savedById){ _savedById = {}; (state.petsData || []).forEach((s,i) => { const k = (s && s.id) || (PET_DEF[i] && PET_DEF[i].name); if(k) _savedById[k] = s; }); }
  return _savedById[def.name] || {};
}
