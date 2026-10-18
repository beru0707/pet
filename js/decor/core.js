/* ==================================================================
   DECOR – TRẠNG THÁI
   Đối tượng DECOR (items / grid luôn của map đang xem), lớp canvas đường riêng cho từng map.
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
