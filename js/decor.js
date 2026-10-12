/* ==================================================================
   DECOR – lõi
   Vẽ đường, đặt vật phẩm, khung chặn thú, kéo thả
   ================================================================== */

const DECOR = { active:false, tab:'path', brush:{type:0,r:2}, sel:null, selId:null,
                defs:{}, order:[], customs:[], dragItem:null, painting:false, last:null };
// items / grid luôn là của MAP ĐANG XEM (mỗi map có đường + vật phẩm riêng, lưu trong MAPDATA – xem maps.js)
Object.defineProperty(DECOR,'items',{ get:()=>MAPDATA[ACTIVE_MAP].items, set:v=>{ MAPDATA[ACTIVE_MAP].items = v; } });
Object.defineProperty(DECOR,'grid', { get:()=>MAPDATA[ACTIVE_MAP].grid,  set:v=>{ MAPDATA[ACTIVE_MAP].grid = v; } });
// mỗi map có 1 lớp đường riêng (canvas + cờ cần vẽ lại)
const MAPPATH = {};
MAPS.forEach(m=>{ const c=document.createElement('canvas'); c.width=CW; c.height=CH; MAPPATH[m.id]={cv:c,dirty:true}; });
const dirtyPaths = (id=ACTIVE_MAP)=>{ if(MAPPATH[id]) MAPPATH[id].dirty=true; };

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

// ---- vật phẩm ----
function addDef(key,name,src,h0){
  if(DECOR.defs[key]) return false;
  const img=new Image(), d={key,name,src,h0,img,ok:false,block:!TREE_KEYS.includes(key)}; DECOR.defs[key]=d;
  img.onload=()=>{ d.ok=true; DECOR.order.push(key);
    const rank=k=>{const i=KNOWN_ITEMS.findIndex(a=>a[0]===k);return i<0?1000+(parseInt(k.replace(/\D/g,''))||0):i};
    DECOR.order.sort((a,b)=>rank(a)-rank(b)); if(DECOR.active&&DECOR.tab==='item') renderDeco(); };
  img.onerror=()=>{ delete DECOR.defs[key]; };
  img.src=src; return true;
}
function itemSize(it){ const d=DECOR.defs[it.key]; if(!d||!d.ok) return null; const h=d.h0*it.s; return {w:h*d.img.naturalWidth/d.img.naturalHeight,h,d}; }
function drawItem(it){
  const z=itemSize(it); if(!z) return;
  softShadow(it.x, it.y-1, z.w*.36, Math.min(14,z.h*.07)+3, .22);
  cx.save(); cx.translate(it.x,it.y); if(it.f) cx.scale(-1,1);
  cx.drawImage(z.d.img,-z.w/2,-z.h,z.w,z.h); cx.restore();
  if(DECOR.active){ const b=itemBlock(it); if(b){ cx.save(); cx.strokeStyle='rgba(255,70,70,.7)'; cx.lineWidth=2; cx.setLineDash([6,5]); cx.strokeRect(b.x0,b.y0,b.x1-b.x0,b.y1-b.y0); cx.restore(); } }
  if(DECOR.active && it.id===DECOR.selId){
    cx.save(); cx.strokeStyle='#ffd54a'; cx.lineWidth=3; cx.setLineDash([10,7]); cx.strokeRect(it.x-z.w/2-4,it.y-z.h-4,z.w+8,z.h+8); cx.restore();
  }
}
function hitItem(x,y){
  const arr=[...DECOR.items].sort((a,b)=>b.y-a.y);
  for(const it of arr){ const z=itemSize(it); if(z && Math.abs(x-it.x)<=z.w/2 && y<=it.y+6 && y>=it.y-z.h) return it; }
  return null;
}
// vùng chặn nằm ở chân vật phẩm; thú không đi vào được
function itemBlock(it){
  const z=itemSize(it); if(!z) return null;
  const on = it.b!==undefined ? it.b : z.d.block; if(!on) return null;
  return {x0:it.x-z.w/2, x1:it.x+z.w/2, y0:it.y-z.h, y1:it.y};   // đúng khung ảnh vật phẩm
}
const BM=10; // lề cho bề rộng thân thú
const inRect=(b,x,y)=>x>b.x0-BM&&x<b.x1+BM&&y>b.y0-BM&&y<b.y1+BM;
function blockedByItem(x,y){
  for(const it of simItems()){ const b=itemBlock(it); if(b&&inRect(b,x,y)) return true; }
  return false;
}
function ejectPets(){   // đẩy thú ra cạnh gần nhất của khung nếu bị đặt vật phẩm lên đầu
  PETS.forEach(p=>{
    if(p.map!==ACTIVE_MAP) return;
    for(let i=0;i<20;i++){
      let nb=null;
      for(const it of DECOR.items){ const b=itemBlock(it); if(b&&inRect(b,p.x,p.y)){ nb=b; break; } }
      if(!nb) break;
      const dl=p.x-(nb.x0-BM), dr=(nb.x1+BM)-p.x, dt=p.y-(nb.y0-BM), db=(nb.y1+BM)-p.y;
      const m=Math.min(dl,dr,dt,db);
      if(m===db) p.y=nb.y1+BM+2; else if(m===dt) p.y=nb.y0-BM-2; else if(m===dl) p.x=nb.x0-BM-2; else p.x=nb.x1+BM+2;
      p.vx=p.vy=0; if(p.tvx!==undefined){ p.tvx=p.tvy=0; }
    }
    p.x=Math.max(100,Math.min(CW-100,p.x)); p.y=Math.max(180,Math.min(950,p.y));
  });
}
const selItem = () => DECOR.items.find(i=>i.id===DECOR.selId);

function decorDown(e){
  const p=scaleXY(e); try{ cv.setPointerCapture(e.pointerId); }catch(_){}
  if(DECOR.tab==='path'){ DECOR.painting=true; DECOR.erase = DECOR.brush.type===-1; paintAt(p.x,p.y,DECOR.erase); DECOR.last=p; }
  else if(DECOR.tab==='item'){
    if(!DECOR.sel) { toast('Chọn một vật phẩm bên dưới trước nhé'); return; }
    const d=DECOR.defs[DECOR.sel]; if(!d) return;
    const it={id:'i'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),key:DECOR.sel,x:p.x,y:p.y,s:1,f:0};
    DECOR.items.push(it); DECOR.selId=it.id; DECOR.dragItem={it,dx:0,dy:0,placed:true};
  } else {
    const it=hitItem(p.x,p.y);
    DECOR.selId = it ? it.id : null;
    if(it) DECOR.dragItem={it,dx:it.x-p.x,dy:it.y-p.y};
    renderDeco();
  }
}
cv.addEventListener('pointermove', e=>{
  if(!DECOR.active) return; const p=scaleXY(e);
  if(DECOR.painting){ paintLine(DECOR.last,p,DECOR.erase); DECOR.last=p; }
  else if(DECOR.dragItem){ const d=DECOR.dragItem; d.it.x=Math.max(10,Math.min(CW-10,p.x+d.dx)); d.it.y=Math.max(10,Math.min(CH-4,p.y+d.dy)); }
});
function decorUp(){
  if(!DECOR.active) return;
  if(DECOR.painting){ DECOR.painting=false; DECOR.last=null; saveDecor(); }
  if(DECOR.dragItem){ DECOR.dragItem=null; ejectPets(); saveDecor(); renderDeco(); }
}
cv.addEventListener('pointerup', decorUp); cv.addEventListener('pointercancel', decorUp);
