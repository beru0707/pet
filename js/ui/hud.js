/* ==================================================================
   UI – HUD + THÔNG BÁO
   Hiển thị xu / cấp, thông báo nhỏ (toast).
   ================================================================== */

function updateHUD(){ document.getElementById('h-coins').textContent=state.coins; document.getElementById('h-lv').textContent=state.lv; }
let _t; function toast(m){ const e=document.getElementById('toast'); e.textContent=m; e.classList.add('show'); clearTimeout(_t); _t=setTimeout(()=>e.classList.remove('show'),2200); }
