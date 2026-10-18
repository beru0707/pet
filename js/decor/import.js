/* ==================================================================
   DECOR – NẠP ẢNH TỪ MÁY
   Chọn thư mục assets hoặc nhiều ảnh để thêm vật phẩm mới.
   ================================================================== */

// ---- nạp thêm ảnh từ máy (chọn thư mục assets hoặc chọn nhiều ảnh) ----
function importFiles(list){
  const files=[...list].filter(f=>/^image\//.test(f.type));
  let added=0, pending=files.length; if(!pending) return;
  files.forEach(f=>{
    const rel='/'+(f.webkitRelativePath||f.name);
    if(/\/(background|pet)\//i.test(rel) || Object.values(PET_ANIM).some(c=>rel.toLowerCase().includes('/'+c._base.split('/').pop().toLowerCase()+'/'))){ if(--pending===0) done(); return; }
    const key=f.name.replace(/\.[^.]+$/,''); 
    if(DECOR.defs[key]){ if(--pending===0) done(); return; }
    const fr=new FileReader();
    fr.onload=()=>{ const im=new Image(); im.onload=()=>{
        const m=Math.min(1,512/Math.max(im.naturalWidth,im.naturalHeight)), c=document.createElement('canvas');
        c.width=Math.round(im.naturalWidth*m); c.height=Math.round(im.naturalHeight*m); c.getContext('2d').drawImage(im,0,0,c.width,c.height);
        const src=c.toDataURL('image/png'), h0=Math.max(36,Math.min(260,Math.round(im.naturalHeight*.14)));
        DECOR.customs.push({key,name:key,src,h0}); addDef(key,key,src,h0); added++;
        if(--pending===0) done(); };
      im.onerror=()=>{ if(--pending===0) done(); }; im.src=fr.result; };
    fr.onerror=()=>{ if(--pending===0) done(); }; fr.readAsDataURL(f);
  });
  function done(){ saveDecor(); if(added) saveCustoms(); toast(added?`Đã thêm ${added} vật phẩm mới`:'Không có ảnh mới để thêm'); setTimeout(()=>renderDeco(),200); }
}
document.getElementById('f-files').addEventListener('change',e=>{ importFiles(e.target.files); e.target.value=''; });
document.getElementById('f-dir').addEventListener('change',e=>{ importFiles(e.target.files); e.target.value=''; });
