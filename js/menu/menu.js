/* ==================================================================
   MENU – THANH CHỨC NĂNG
   Nút góc phải trên mở thanh 3 tab: Trang trí | Danh sách pet | Map. Chuyển tab, bật / tắt menu.
   ================================================================== */

const MENU = { open:false, tab:'deco' };

function setMenuTab(tab){
  MENU.tab = tab;
  const wasDeco = DECOR.active;
    DECOR.active = MENU.open && tab === 'deco';          // chỉ tab Trang trí mới khóa việc chọn/điều khiển thú
  if(wasDeco && !DECOR.active){ DECOR.dragItem = null; DECOR.painting = false; DECOR.selId = null; saveDecor(); }
  if(DECOR.active){ PETS.forEach(p=>p.selected=false); closePetPanel(); toast('Chế độ trang trí – kéo chuột để vẽ đường / đặt vật phẩm'); }
  cv.style.cursor = DECOR.active ? 'crosshair' : 'pointer';
  document.getElementById('deco').classList.toggle('hidden', !MENU.open);
  document.getElementById('wrap').classList.toggle('menu-open', MENU.open);   // bảng thông tin thú dời lên để không bị thanh menu che
  document.getElementById('d-sub').style.display = tab === 'deco' ? '' : 'none';
  document.querySelectorAll('#m-tabs [data-m]').forEach(x=>x.classList.toggle('on', x.dataset.m === tab));
  if(MENU.open) renderDeco();
}
function setDecor(on){ MENU.open = !!on; setMenuTab(MENU.tab); }   // giữ tên cũ: mở/đóng menu
document.getElementById('m-tabs').addEventListener('click', e=>{
  const t = e.target.closest('[data-m]'); if(t) setMenuTab(t.dataset.m);
});
