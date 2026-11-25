/* ==================================================================
   CORE – CANVAS
   Canvas chính, quy đổi tọa độ chuột -> tọa độ thế giới.
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
