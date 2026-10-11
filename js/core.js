/* ==================================================================
   CORE
   Canvas, quy đổi tọa độ chuột, bóng đổ
   ================================================================== */

const cv = document.getElementById('c');
const cx = cv.getContext('2d');
cv.width = CW; cv.height = CH;
document.documentElement.style.setProperty('--ar', CW/CH);   // khung hiển thị theo đúng tỉ lệ thế giới game

function scaleXY(e){
  const r = cv.getBoundingClientRect();
  const src = e.touches ? e.touches[0] : e;
  return {x:(src.clientX - r.left)*CW/r.width, y:(src.clientY - r.top)*CH/r.height};
}
// DRAW
function softShadow(x,y,rx,ry,alpha){
  cx.save(); cx.translate(x,y); cx.scale(rx,ry);
  const g = cx.createRadialGradient(0,0,0,0,0,1);
  g.addColorStop(0,`rgba(18,46,12,${alpha})`); g.addColorStop(.6,`rgba(18,46,12,${alpha*.55})`); g.addColorStop(1,'rgba(18,46,12,0)');
  cx.fillStyle=g; cx.beginPath(); cx.arc(0,0,1,0,Math.PI*2); cx.fill(); cx.restore();
}
