/* ==================================================================
   BATTLE – CÀI ĐẶT TRONG TRẬN
   Nút ⚙️ góc trên bên phải: tốc độ x1/x2/x4, tự động đánh cho pet không được chọn, thoát trận. Mở bảng thì trận tạm dừng.
   ================================================================== */

BT.speed = 1;       // hệ số tốc độ game trong trận
BT.auto = true;     // pet KHÔNG được chọn tự đánh khi có địch trong tầm
BT.paused = false;
// hệ số thời gian main.js dùng mỗi khung: 0 = tạm dừng
const btSpeed = () => BT.phase === 'fight' ? (BT.paused ? 0 : BT.speed) : 1;

function btSetOpen(on){
  BT.paused = !!on && BT.phase === 'fight';
  $b('bt-sp').style.display = on ? 'flex' : 'none';
}
function btSetSync(){
  document.querySelectorAll('#sp-speeds button').forEach(b => b.classList.toggle('on', +b.dataset.s === BT.speed));
  const a = $b('sp-auto'); a.textContent = BT.auto ? 'Bật' : 'Tắt'; a.classList.toggle('on', BT.auto);
}
$b('bt-set').addEventListener('click', () => { if(BT.phase === 'fight'){ btSetSync(); btSetOpen($b('bt-sp').style.display !== 'flex'); } });
$b('sp-speeds').addEventListener('click', e => { const b = e.target.closest('button'); if(!b) return; BT.speed = +b.dataset.s; btSetSync(); });
$b('sp-auto').addEventListener('click', () => { BT.auto = !BT.auto; btSetSync(); });
$b('sp-resume').addEventListener('click', () => btSetOpen(false));
$b('sp-exit').addEventListener('click', () => {
  if(BT.phase !== 'fight') return;
  btSetOpen(false);
  BT.phase = 'result'; btExit();   // bỏ trận: về phòng chờ, không có thưởng
});
// hiện nút ⚙️ chỉ khi đang đánh
setInterval(() => { $b('bt-set').style.display = BT.phase === 'fight' ? 'block' : 'none'; if(BT.phase !== 'fight' && BT.paused) btSetOpen(false); }, 150);
btSetSync();
