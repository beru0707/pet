/* ==================================================================
   DATA – LƯU GAME
   Trạng thái game (xu, cấp, dữ liệu thú) + lưu / tải localStorage.
   ================================================================== */

// GAME STATE
let state = { petsData:[], activeMap:null };
// Cấp độ + EXP của từng pet, tra theo tên: PET_LV['Chicken'] = {lv, exp}. Lưu cùng game; chưa có = cấp 1, 0 EXP.
const PET_LV = {};
function petLv(name){ return PET_LV[name] || (PET_LV[name] = {lv:1, exp:0}); }   // activeMap: map đang xem, mở lại game vào đúng map này
function saveGame(){
  state.petsData = PETS.map(p=>({id:p.def.name, x:p.x, y:p.y, map:p.map}));
  state.petLv = PET_LV;
  localStorage.setItem(SAVE, JSON.stringify(state));
}
// Lưu riêng cấp độ (kể cả khi đang trong trận, lúc saveGame bị chặn) để không mất EXP nếu tải lại ở màn kết quả
function savePetLv(){
  try { const s = JSON.parse(localStorage.getItem(SAVE) || '{}'); s.petLv = PET_LV; localStorage.setItem(SAVE, JSON.stringify(s)); } catch(e){}
}
function loadGame(){
  try {
    const raw = localStorage.getItem(SAVE); if(!raw) return;
    const s = JSON.parse(raw);
    if(s.petsData) state.petsData = s.petsData;
    if(s.activeMap) state.activeMap = s.activeMap;
    if(s.petLv) Object.keys(s.petLv).forEach(k => { const v = s.petLv[k]; if(v && v.lv) PET_LV[k] = {lv:Math.max(1, v.lv|0), exp:Math.max(0, v.exp|0)}; });
    _savedById = null;
  } catch(e){}
}
// Map đã lưu để mở lại; nếu map đó không còn trong MAPS thì dùng map đầu tiên
function savedActiveMap(){ return (state.activeMap && mapById(state.activeMap)) ? state.activeMap : MAPS[0].id; }
// Dữ liệu đã lưu của 1 thú, tra theo id (= tên). Bản lưu cũ chưa có id thì tra theo thứ tự cũ trong PET_DEF.
let _savedById = null;
function savedPet(def){
  if(!_savedById){ _savedById = {}; (state.petsData || []).forEach((s,i) => { const k = (s && s.id) || (PET_DEF[i] && PET_DEF[i].name); if(k) _savedById[k] = s; }); }
  return _savedById[def.name] || {};
}
