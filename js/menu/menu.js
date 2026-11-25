/* ==================================================================
   MENU – 3 NÚT GÓC TRÊN PHẢI + KHUNG MENU
   Ba nút: Danh sách pet · Danh sách map · Cài đặt. Bấm nút mở khung giữa màn hình (#gm),
   bấm lại cùng nút / nút ĐÓNG / phím Esc / bấm nền tối để đóng. Nội dung vẽ ở body.js.
   ================================================================== */

const MENU = { open:false, tab:'pets', fp:'all', fm:'all', pet:null, map:null };
const GM_TITLES = { pets:'DANH SÁCH PET', maps:'DANH SÁCH MAP', settings:'CÀI ĐẶT' };
const gmEl = document.getElementById('gm');

// ảnh khung (đã gồm nút ✕) tải xong mới hiện menu
let gmImgsReady = false;
const gmImgsLoad = Promise.all(['assets/ui/menu-frame.webp'].map(src => new Promise(res => {
  const im = new Image(); im.onload = im.onerror = () => res(); im.src = src;
  im.decode ? im.decode().then(res, res) : 0;
}))).then(() => { gmImgsReady = true; if(MENU.open) setMenuTab(MENU.tab); });

// cỡ chữ gốc của khung theo kích thước cửa sổ (mọi kích thước trong khung tính theo em)
function gmFit(){
  const pad = parseFloat(getComputedStyle(gmEl).paddingTop) || 0;
  gmEl.style.fontSize = Math.max(8, Math.min(18, (innerHeight - pad - 8) / 36.2, innerWidth * .96 / 80)) + 'px';   // khung = ảnh menu-frame.webp: rộng 80em, cao ~36em (tỉ lệ 1870:841)
}
function setMenuTab(tab){
  MENU.tab = tab;
  gmEl.classList.toggle('hidden', !MENU.open || !gmImgsReady);
  document.getElementById('wrap').classList.toggle('menu-open', MENU.open);   // các nút nổi (cần ảo, ⚔️...) tránh khung menu
  document.querySelectorAll('#top-menu [data-m]').forEach(x => x.classList.toggle('on', MENU.open && x.dataset.m === tab));
  document.getElementById('gm-title').textContent = GM_TITLES[tab] || '';
  if(MENU.open){ gmFit(); renderMenu(); }
}
function setMenuOpen(on){ MENU.open = !!on; setMenuTab(MENU.tab); }

document.getElementById('top-menu').addEventListener('click', e => {
  const b = e.target.closest('[data-m]'); if(!b) return;
  b.blur();
  if(MENU.open && MENU.tab === b.dataset.m) setMenuOpen(false);
  else { MENU.open = true; setMenuTab(b.dataset.m); }
});
document.getElementById('gm-close').addEventListener('click', e => { e.currentTarget.blur(); setMenuOpen(false); });
gmEl.addEventListener('pointerdown', e => { if(e.target === gmEl) setMenuOpen(false); });   // bấm nền tối ngoài khung
window.addEventListener('keydown', e => { if(e.key === 'Escape' && MENU.open) setMenuOpen(false); });
window.addEventListener('resize', () => { if(MENU.open) gmFit(); });
