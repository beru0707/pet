/* ==================================================================
   UI – HUD + THÔNG BÁO
   Thông báo nhỏ (toast).
   ================================================================== */

let _t; function toast(m){ const e=document.getElementById('toast'); e.textContent=m; e.classList.add('show'); clearTimeout(_t); _t=setTimeout(()=>e.classList.remove('show'),2200); }
