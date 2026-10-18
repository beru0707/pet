/* ==================================================================
   DECOR – VẬT PHẨM
   Định nghĩa vật phẩm, vẽ, chọn, khung chặn thú, đẩy thú ra khỏi vật phẩm.
   ================================================================== */

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
