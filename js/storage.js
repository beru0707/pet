/* ==================================================================
   STORAGE
   Lưu/tải trang trí: đường + vật phẩm (localStorage), ảnh tải lên (IndexedDB)
   ================================================================== */

// ---- lưu / tải ----
// ảnh tải lên lưu trong IndexedDB (dung lượng lớn); đường + vị trí vật phẩm lưu localStorage
let _idb=null;
function idb(){ return _idb||(_idb=new Promise((res,rej)=>{
  const r=indexedDB.open('petmap_db',1);
  r.onupgradeneeded=()=>r.result.createObjectStore('customs',{keyPath:'key'});
  r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); })); }
function idbAll(){ return idb().then(db=>new Promise((res,rej)=>{ const q=db.transaction('customs').objectStore('customs').getAll(); q.onsuccess=()=>res(q.result); q.onerror=()=>rej(q.error); })); }
function idbSync(){ // ghi toàn bộ danh sách ảnh tùy chỉnh hiện tại
  return idb().then(db=>new Promise((res,rej)=>{ const tx=db.transaction('customs','readwrite'), st=tx.objectStore('customs');
    st.clear(); DECOR.customs.forEach(c=>st.put(c)); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }));
}
function saveCustoms(){ idbSync().catch(()=>toast('Không lưu được ảnh tải lên (trình duyệt chặn lưu trữ)')); }
function saveDecor(){   // lưu đường + vật phẩm của TẤT CẢ map
  try{
    const maps={};
    MAPS.forEach(m=>{ const D=MAPDATA[m.id]; let bin=''; for(let i=0;i<D.grid.length;i++) bin+=String.fromCharCode(D.grid[i]);
      maps[m.id]={grid:btoa(bin),gw:GW,items:D.items}; });
    localStorage.setItem(DECOR_KEY, JSON.stringify({v:2,maps}));
  }catch(e){ toast('Không lưu được (bộ nhớ trình duyệt đầy)'); }
}
function loadDecor(){
  KNOWN_ITEMS.forEach(([k,n,h])=>addDef(k,n,'assets/'+k+'.png',h));
  for(let i=1;i<=60;i++){ const k='sprite_'+i; if(!KNOWN_ITEMS.some(a=>a[0]===k)) addDef(k,'Vật phẩm '+i,'assets/'+k+'.png',90); }
  let old=[];
  // gw = số cột lúc lưu (bản cũ không có -> 64); đổi kích thước thế giới vẫn giữ nguyên vị trí đường
  const applyMap=(id,o)=>{ const D=MAPDATA[id]; if(!D||!o) return;
    if(o.grid){ const bin=atob(o.grid), og=o.gw||64, rows=Math.floor(bin.length/og);
      for(let j=0;j<Math.min(rows,GH);j++) for(let i=0;i<Math.min(og,GW);i++) D.grid[j*GW+i]=bin.charCodeAt(j*og+i);
      dirtyPaths(id); }
    D.items=o.items||[]; };
  try{
    const o=JSON.parse(localStorage.getItem(DECOR_KEY)||'null');
    if(o){
      if(o.v===2 && o.maps) MAPS.forEach(m=>applyMap(m.id,o.maps[m.id]));
      else { applyMap(MAPS[0].id,o); old=o.customs||[]; }   // dữ liệu cũ (1 map) -> map đầu tiên
    }
  }catch(e){}
  const use=list=>list.forEach(c=>{ if(DECOR.customs.some(x=>x.key===c.key)) return; DECOR.customs.push(c); addDef(c.key,c.name,c.src,c.h0); });
  use(old); // dữ liệu cũ (nếu có)
  idbAll().then(list=>{ use(list); if(old.length){ saveCustoms(); saveDecor(); } if(DECOR.active) renderDeco(); }).catch(()=>{});
}
loadDecor();
