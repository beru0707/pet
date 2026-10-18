/* ==================================================================
   ASSETS – NẠP ẢNH
   IMGS, nạp ảnh (ưu tiên .webp), hàng đợi nạp song song, ảnh nền từng map.
   ================================================================== */

const IMGS = {};
const PREFER_WEBP = true;   // ưu tiên .webp cạnh .png; không có thì tự dùng .png
const LOAD_PARALLEL = 3;    // số sheet giải nén cùng lúc

function tryImg(src){
  const load = s => new Promise(r=>{ const im=new Image(); im.decoding='async'; im.onload=()=>r(im); im.onerror=()=>r(null); im.src=s; });
  return (PREFER_WEBP && /\.png$/i.test(src)) ? load(src.replace(/\.png$/i,'.webp')).then(im => im || load(src)) : load(src);
}
async function runPool(tasks, n, onEach){
  let i = 0;
  await Promise.all(Array.from({length:Math.min(n,tasks.length)}, async () => {
    while(i < tasks.length){ const t = tasks[i++]; try{ await t(); }catch(e){ console.warn('[ASSETS]', e); } if(onEach) onEach(); await new Promise(r=>setTimeout(r,0)); }
  }));
}

const _bg = {};
const bgSrc = id => (IMGS['bg_'+id] && IMGS['bg_'+id].src) || '';
const setBgVar = s => document.documentElement.style.setProperty('--bgurl', 'url("'+s+'")');
function loadBg(id){
  return _bg[id] || (_bg[id] = tryImg(MAPS.find(m=>m.id===id).bg).then(im=>{
    if(im){
      IMGS['bg_'+id] = im;
      if(id === (typeof ACTIVE_MAP !== 'undefined' ? ACTIVE_MAP : MAPS[0].id)) setBgVar(im.src);
      if(typeof MENU !== 'undefined' && MENU.open && MENU.tab === 'map') renderDeco();
    }
    return im;
  }));
}
