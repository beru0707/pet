/* ==================================================================
   DECOR – ĐƯỜNG
   Vẽ lớp đường (đất, đá cuội, cát, ván gỗ) và cọ vẽ / tẩy.
   ================================================================== */

function rngFrom(seed){ let s = (seed*2654435761 % 2147483647) || 1; const f = () => { s = (s*16807) % 2147483647; return s/2147483647; }; f();f();f(); return f; }
function rrect(c,x,y,w,h,r){ c.beginPath(); if(c.roundRect) c.roundRect(x,y,w,h,r); else c.rect(x,y,w,h); c.fill(); }

function renderPaths(id=ACTIVE_MAP){
  const grid = MAPDATA[id].grid;
  const c = MAPPATH[id].cv.getContext('2d'); c.clearRect(0,0,CW,CH);
  PATH_TYPES.forEach((T,ti)=>{
    const cells=[]; for(let i=0;i<grid.length;i++) if(grid[i]===ti+1) cells.push(i);
    if(!cells.length) return;
    const xy = i => [(i%GW)*CELL, ((i/GW)|0)*CELL];
    c.fillStyle = T.e; cells.forEach(i=>{ const [x,y]=xy(i); rrect(c,x-4,y-4,CELL+8,CELL+8,13); });
    c.fillStyle = T.c; cells.forEach(i=>{ const [x,y]=xy(i); rrect(c,x-1,y-1,CELL+2,CELL+2,11); });
    cells.forEach(i=>{
      const [x,y]=xy(i), r=rngFrom(i*131+ti*7+3);
      if(T.k==='dirt'){ for(let n=0;n<7;n++){ c.fillStyle = r()<.5?'#a97b40':'#dcb577'; c.fillRect(x+3+r()*(CELL-8),y+3+r()*(CELL-8),2+r()*2,2); } }
      else if(T.k==='sand'){ for(let n=0;n<8;n++){ c.fillStyle = r()<.5?'#d8be72':'#fff3c4'; c.fillRect(x+2+r()*(CELL-5),y+2+r()*(CELL-5),2,2); } }
      else if(T.k==='stone'){ for(let n=0;n<2;n++){ const px=x+6+r()*(CELL-12),py=y+6+r()*(CELL-12),rx=4+r()*3,ry=3+r()*2.5;
          c.beginPath(); c.ellipse(px,py,rx,ry,0,0,7); c.fillStyle='#d6d9de'; c.fill(); c.lineWidth=1.4; c.strokeStyle='#767a82'; c.stroke(); } }
      else if(T.k==='plank'){ c.strokeStyle='#7e4a22'; c.lineWidth=2; c.beginPath(); c.moveTo(x,y+CELL/2); c.lineTo(x+CELL,y+CELL/2); c.stroke();
          const off = ((i/GW|0)%2)?CELL*.3:CELL*.7; c.beginPath(); c.moveTo(x+off,y+(((i/GW|0)%2)?CELL/2:0)); c.lineTo(x+off,y+(((i/GW|0)%2)?CELL:CELL/2)); c.stroke();
          c.fillStyle='#cf9355'; c.fillRect(x+2,y+3,CELL-4,2); }
    });
  });
}
function drawPathLayer(id=ACTIVE_MAP){ const P=MAPPATH[id]; if(P.dirty){ renderPaths(id); P.dirty=false; } cx.drawImage(P.cv,0,0); }

function paintAt(x,y,erase){
  const gx=x/CELL-.5, gy=y/CELL-.5, R=DECOR.brush.r-.5+.01, v = erase ? 0 : DECOR.brush.type+1;
  for(let j=Math.floor(gy-R);j<=Math.ceil(gy+R);j++) for(let i=Math.floor(gx-R);i<=Math.ceil(gx+R);i++){
    if(i<0||j<0||i>=GW||j>=GH) continue;
    if((i-gx)**2+(j-gy)**2<=R*R+.15){ DECOR.grid[j*GW+i]=v; dirtyPaths(); }
  }
}
function paintLine(a,b,erase){
  const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/(CELL/2)));
  for(let i=0;i<=n;i++) paintAt(a.x+(b.x-a.x)*i/n, a.y+(b.y-a.y)*i/n, erase);
}
