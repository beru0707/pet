/* ==================================================================
   BATTLE – GIAO DIỆN CƠ BẢN
   Tạo nút / thanh / bảng của trận (kiểu dáng ở css/battle.css), canvas phủ #bt-ov, hiệu ứng chuyển cảnh, chữ banner.
   ================================================================== */

// ============ GIAO DIỆN (tự chèn vào trang) ============
(function(){
  const mk = (tag, id, html) => { const d = document.createElement(tag); d.id = id; if(html) d.innerHTML = html; document.body.appendChild(d); return d; };
  mk('button','bt-open','⚔️ Vào trận');
  mk('canvas','bt-ov'); mk('div','bt-fade'); mk('div','bt-hud'); mk('div','bt-banner'); mk('div','bt-res');
  mk('div','bt-bar','<div class="bt-t">⚔️ Chuẩn bị<small id="bt-sub"></small></div><div id="bt-list"></div><button class="bt-btn" id="bt-go">Bắt đầu</button><button class="bt-btn" id="bt-quit">Thoát</button>');
})();
const $b = id => document.getElementById(id);
const OV = $b('bt-ov'), oc = OV.getContext('2d');

function btFade(cb){
  const f = $b('bt-fade'); f.style.opacity = 1;
  setTimeout(()=>{ try{ cb(); }catch(e){ console.error('[battle]', e); } setTimeout(()=>{ f.style.opacity = 0; }, 80); }, 480);
}

function btBanner(txt){ BT.bannerT = 2; const b = $b('bt-banner'); b.textContent = txt; b.style.display = 'block'; }
