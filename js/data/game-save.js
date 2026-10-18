/* ==================================================================
   DATA – LƯU GAME
   Trạng thái game (xu, cấp, dữ liệu thú) + lưu / tải localStorage.
   ================================================================== */

// GAME STATE
let state = { coins:200, xp:0, lv:1, petsData:[] };
function saveGame(){
  state.petsData = PETS.map(p=>({hunger:p.hunger, happy:p.happy, energy:p.energy, x:p.x, y:p.y, map:p.map}));
  localStorage.setItem(SAVE, JSON.stringify(state));
}
function loadGame(){
  try {
    const raw = localStorage.getItem(SAVE); if(!raw) return;
    const s = JSON.parse(raw);
    state.coins = s.coins||200; state.lv = s.lv||1; state.xp = s.xp||0;
    if(s.petsData) state.petsData = s.petsData;
  } catch(e){}
}
