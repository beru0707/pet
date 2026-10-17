/* ==================================================================
   DECOR – giao diện
   Thanh công cụ trang trí, nạp thêm ảnh từ máy
   ================================================================== */

// ---- bảng điều khiển ----
function renderDeco(){
  if(typeof MENU!=='undefined' && MENU.tab!=='deco'){ renderMenuBody(); return; }   // tab Danh sách pet / Map: xem menu.js
  const b=document.getElementById('d-body'); let h='';
  if(DECOR.tab==='path'){
    h+=PATH_TYPES.map((T,i)=>`<button class="dbtn ${DECOR.brush.type===i?'on':''}" data-pt="${i}"><i style="background:${T.c};border-color:${T.e}"></i>${T.n}</button>`).join('');
    h+=`<button class="dbtn ${DECOR.brush.type===-1?'on':''}" data-pt="-1"><span style="font-size:30px">🧽</span>Tẩy đường</button>`;
    h+=`<span class="dlabel">Cỡ cọ</span>`+[1,2,3].map(r=>`<button class="dbtn big ${DECOR.brush.r===r?'on':''}" data-pr="${r}">${['●','⬤','⬤⬤'][r-1]}<span>${['Nhỏ','Vừa','Lớn'][r-1]}</span></button>`).join('');
    h+=`<button class="dbtn" data-clearpath="1"><span style="font-size:26px">🗑️</span>Xóa hết đường</button>`;
  } else if(DECOR.tab==='item'){
    h+=DECOR.order.map(k=>{const d=DECOR.defs[k];return `<button class="dbtn ${DECOR.sel===k?'on':''}" data-it="${k}"><img src="${d.src}" alt=""><span>${d.name}</span></button>`}).join('');
    h+=`<button class="dbtn" data-addfiles="1"><span style="font-size:28px">➕</span>Thêm ảnh</button><button class="dbtn" data-adddir="1"><span style="font-size:28px">📂</span>Chọn thư mục assets</button>`;
    if(!DECOR.order.length) h+=`<span class="dlabel">Chưa thấy ảnh nào trong assets – bấm "Chọn thư mục assets" để nạp.</span>`;
  } else {
    const it=selItem();
    if(it){ h+=`<button class="dbtn big" data-ia="minus">➖<span>Nhỏ lại</span></button><button class="dbtn big" data-ia="plus">➕<span>To lên</span></button><button class="dbtn big" data-ia="flip">🔄<span>Lật</span></button><button class="dbtn big" data-ia="dup">📑<span>Nhân đôi</span></button><button class="dbtn big ${itemBlock(it)?'on':''}" data-ia="block">🚧<span>${itemBlock(it)?'Đang chặn thú':'Cho thú đi qua'}</span></button><button class="dbtn big" data-ia="del">🗑️<span>Xóa</span></button>`; }
    else h+=`<span class="dlabel">Chạm vào một vật phẩm trên bãi cỏ để chọn, rồi kéo để di chuyển.</span>`;
    h+=`<button class="dbtn" data-clearitems="1"><span style="font-size:26px">🧹</span>Xóa hết vật phẩm</button>`;
  }
  b.innerHTML=h;
  document.querySelectorAll('#deco .d-tabs [data-t]').forEach(x=>x.classList.toggle('on',x.dataset.t===DECOR.tab));
}
// setDecor(on) / mở-đóng menu: xem menu.js
document.getElementById('btn-deco').addEventListener('click',()=>setDecor(!MENU.open));
document.getElementById('d-done').addEventListener('click',()=>setDecor(false));
document.querySelector('#deco .d-tabs').addEventListener('click',e=>{ const t=e.target.closest('[data-t]'); if(t){ DECOR.tab=t.dataset.t; renderDeco(); } });
document.getElementById('d-body').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b) return; const d=b.dataset;
  if(d.pt!==undefined){ DECOR.brush.type=+d.pt; }
  else if(d.pr){ DECOR.brush.r=+d.pr; }
  else if(d.clearpath){ if(confirm('Xóa toàn bộ đường đã làm?')){ DECOR.grid.fill(0); dirtyPaths(); saveDecor(); } }
  else if(d.it){ DECOR.sel=d.it; }
  else if(d.addfiles){ document.getElementById('f-files').click(); return; }
  else if(d.adddir){ document.getElementById('f-dir').click(); return; }
  else if(d.clearitems){ if(confirm('Xóa toàn bộ vật phẩm đã đặt?')){ DECOR.items=[]; DECOR.selId=null; saveDecor(); } }
  else if(d.ia){ const it=selItem(); if(it){
      if(d.ia==='plus'){ it.s=Math.min(4,it.s*1.15); ejectPets(); } else if(d.ia==='minus') it.s=Math.max(.25,it.s/1.15);
      else if(d.ia==='flip') it.f=it.f?0:1;
      else if(d.ia==='block'){ it.b = !itemBlock(it); ejectPets(); }
      else if(d.ia==='dup'){ const c={...it,id:'i'+Date.now().toString(36),x:it.x+30,y:it.y+10}; DECOR.items.push(c); DECOR.selId=c.id; }
      else if(d.ia==='del'){ DECOR.items=DECOR.items.filter(i=>i!==it); DECOR.selId=null; }
      saveDecor(); } }
  renderDeco();
});

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
