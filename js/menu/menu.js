/* ==================================================================
   MENU – THANH CHỨC NĂNG
   Nút góc phải trên mở thanh 2 tab: Danh sách pet | Map. Chuyển tab, bật / tắt menu.
   ================================================================== */

const MENU = { open:false, tab:'pets' };

function setMenuTab(tab){
  MENU.tab = tab;
  document.getElementById('deco').classList.toggle('hidden', !MENU.open);
  document.getElementById('wrap').classList.toggle('menu-open', MENU.open);   // bảng thông tin thú dời lên để không bị thanh menu che
  document.querySelectorAll('#m-tabs [data-m]').forEach(x=>x.classList.toggle('on', x.dataset.m === tab));
  if(MENU.open) renderMenu();
}
function setMenuOpen(on){ MENU.open = !!on; setMenuTab(MENU.tab); }
document.getElementById('btn-deco').addEventListener('click', ()=>setMenuOpen(!MENU.open));
document.getElementById('d-done').addEventListener('click', ()=>setMenuOpen(false));
document.getElementById('m-tabs').addEventListener('click', e=>{
  const t = e.target.closest('[data-m]'); if(t) setMenuTab(t.dataset.m);
});
