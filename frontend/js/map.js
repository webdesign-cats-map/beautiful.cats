/**
 * 地图模块 - 高德地图 v2.0
 * 研究区域：河海大学江宁校区 (118.785863, 31.914453)
 */

const MapApp = (() => {
  let map=null, markers=[], heatmap=null, campusPoly=null;
  let satLayer=null, roadLayer=null, tdtLayers=[];
  let isPickingLocation=false, pickedLocation=null, currentCatId=null;
  let currentBasemapId='amap_normal';

  // 河海大学江宁校区正确坐标
  const CAMPUS_CENTER = [118.785863, 31.914453];
  const CAMPUS_ZOOM   = 16;

  const CAT_EMOJIS = ['🐱','😺','😸','😻','🐈','🙀'];

  const BASEMAPS = [
    { id:'amap_normal',    label:'高德标准', icon:'🗺️', group:'amap',    style:'amap://styles/normal' },
    { id:'amap_satellite', label:'高德卫星', icon:'🛰️', group:'amap_sat' },
    { id:'amap_dark',      label:'高德夜间', icon:'🌙', group:'amap',    style:'amap://styles/dark' },
    { id:'amap_light',     label:'高德浅色', icon:'☁️', group:'amap',    style:'amap://styles/light' },
    { id:'tdt_vec',        label:'天地图矢量',icon:'📐', group:'tdt',     layers:['vec_w','cva_w'] },
    { id:'tdt_img',        label:'天地图影像',icon:'🌍', group:'tdt',     layers:['img_w','cia_w'] },
    { id:'tdt_ter',        label:'天地图地形',icon:'⛰️', group:'tdt',     layers:['ter_w','cta_w'] },
  ];

  function _tdtUrl(layer) {
    const key = window.TDT_KEY || '';
    const sub = layer.split('_')[0];
    return (x,y,z) => `https://t${Math.floor(Math.random()*8)}.tianditu.gov.cn/${layer}/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${sub}&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX=${z}&TILEROW=${y}&TILECOL=${x}&tk=${key}`;
  }

  function _clearOverlayLayers() {
    if (satLayer)  { map.remove(satLayer);  satLayer=null; }
    if (roadLayer) { map.remove(roadLayer); roadLayer=null; }
    tdtLayers.forEach(l => map.remove(l)); tdtLayers=[];
  }

  // ===== 底图切换 =====
  function switchBasemap(id) {
    const bm = BASEMAPS.find(b=>b.id===id); if(!bm||!map) return;
    currentBasemapId = id; _clearOverlayLayers();
    if      (bm.group==='amap')    { map.setMapStyle(bm.style); }
    else if (bm.group==='amap_sat'){ map.setMapStyle('amap://styles/normal'); satLayer=new AMap.TileLayer.Satellite({zIndex:10}); roadLayer=new AMap.TileLayer.RoadNet({zIndex:11}); map.add([satLayer,roadLayer]); }
    else if (bm.group==='tdt')     { map.setMapStyle('amap://styles/blank'); bm.layers.forEach((ln,i)=>{ const tl=new AMap.TileLayer({getTileUrl:_tdtUrl(ln),zIndex:10+i,opacity:1}); map.add(tl); tdtLayers.push(tl); }); }
    document.querySelectorAll('.bm-btn').forEach(b=>b.classList.toggle('bm-active',b.dataset.id===id));
  }

  function _renderBasemapSwitcher() {
    const container = document.getElementById('basemapSwitcher'); if(!container) return;
    const makeBtn = bm=>`<button class="bm-btn${bm.id===currentBasemapId?' bm-active':''}" data-id="${bm.id}" title="${bm.label}" onclick="MapApp.switchBasemap('${bm.id}')"><span class="bm-icon">${bm.icon}</span><span class="bm-label">${bm.label}</span></button>`;
    const aGroup = BASEMAPS.filter(b=>b.group!=='tdt');
    const tGroup = BASEMAPS.filter(b=>b.group==='tdt');
    container.innerHTML = aGroup.map(makeBtn).join('') + '<div class="bm-divider"></div>' + tGroup.map(makeBtn).join('');
  }

  // ===== 初始化 =====
  function init() {
    if (typeof AMap === 'undefined') {
      document.getElementById('mapLoading').innerHTML='<p style="color:#c97b3a;font-size:15px;padding:20px">⚠️ 高德地图加载失败，请检查Key</p>';
      _bindEventsNoMap(); return;
    }
    map = new AMap.Map('mapContainer', {
      zoom: CAMPUS_ZOOM, center: CAMPUS_CENTER,
      mapStyle: 'amap://styles/normal', resizeEnable: true, animateEnable: true,
    });
    map.on('complete', () => {
      document.getElementById('mapLoading').style.display='none';
      _searchCampusBoundary();
      loadCatMarkers();
      _updateStats();
      _renderBasemapSwitcher();
      _bindMouseCoord();
    });
    _bindMapEvents(); _bindUIEvents();
  }

  // ===== 搜索并高亮校园区域 =====
  function _searchCampusBoundary() {
    AMap.plugin('AMap.PlaceSearch', () => {
      const ps = new AMap.PlaceSearch({ pageSize:1, pageIndex:1 });
      ps.search('河海大学江宁校区', (status, result) => {
        if (status==='complete' && result.poiList?.pois?.[0]) {
          const poi = result.poiList.pois[0];
          // 在校园中心画一个半透明圆圈标示校区范围
          const circle = new AMap.Circle({
            center: poi.location,
            radius: 900,
            strokeColor: '#c97b3a', strokeOpacity: 0.6, strokeWeight: 2,
            fillColor: '#fde8d8', fillOpacity: 0.1,
            strokeStyle: 'dashed', zIndex: 50
          });
          map.add(circle);
          // 加一个学校图标标注
          const schoolMarker = new AMap.Marker({
            position: poi.location,
            content: `<div style="background:var(--primary,#c97b3a);color:#fff;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.2);font-family:'PingFang SC',sans-serif">🏫 河海大学江宁校区</div>`,
            offset: new AMap.Pixel(-70, -10), zIndex: 60
          });
          map.add(schoolMarker);
          map.setCenter(poi.location);
        }
      });
    });
  }

  // ===== 鼠标悬停显示经纬度 =====
  function _bindMouseCoord() {
    const bar = document.getElementById('coordBar'); if(!bar) return;
    map.on('mousemove', e => {
      const lng = e.lnglat.getLng().toFixed(6);
      const lat = e.lnglat.getLat().toFixed(6);
      bar.textContent = `📍 经度: ${lng}  纬度: ${lat}`;
      bar.style.display = 'block';
    });
    map.on('mouseout', () => { bar.style.display='none'; });
  }

  // ===== 猫咪点位 =====
  function loadCatMarkers(filterOpts={}) {
    clearMarkers();
    let cats = DB.Cat.getAll();
    if (filterOpts.gender) cats=cats.filter(c=>c.gender===filterOpts.gender);
    if (filterOpts.health) cats=cats.filter(c=>c.health_status===filterOpts.health);
    cats.forEach(cat=>{ if(!cat.location?.lng||!cat.location?.lat) return; _addCatMarker(cat); });
  }

  function _addCatMarker(cat) {
    const avatarUrl = cat.avatar ? cat.avatar : '';
    // 有图片时用图片圆形Marker，无图片用emoji
    let content;
    if (avatarUrl) {
      const borderColor = cat.health_status === 'injured' ? '#e07070' : cat.gender === 'female' ? '#e8956d' : '#c97b3a';
      content = `<div style="
        width:44px;height:44px;border-radius:50%;
        border:3px solid ${borderColor};
        box-shadow:0 3px 10px rgba(0,0,0,0.3);
        overflow:hidden;cursor:pointer;
        background:#f5e8d8;
        transition:transform .2s;
        " title="${cat.name}"
        onmouseover="this.style.transform='scale(1.2) translateY(-3px)'"
        onmouseout="this.style.transform='scale(1)'">
        <img src="${avatarUrl}"
          style="width:100%;height:100%;object-fit:cover;display:block;"
          onerror="this.parentElement.innerHTML='<div style=\\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:22px;background:linear-gradient(135deg,#e8956d,#c97b3a)\\'>${cat.gender === 'female' ? '😸' : '😺'}</div>'">
      </div>`;
    } else {
      const bgColor = cat.health_status === 'injured' ? '#e07070' : cat.gender === 'female' ? '#e8956d' : '#c97b3a';
      content = `<div class="cat-marker" title="${cat.name}" style="background:linear-gradient(135deg,${bgColor},${bgColor}cc)">${cat.gender === 'female' ? '😸' : '😺'}</div>`;
    }
    const marker = new AMap.Marker({
      position: [cat.location.lng, cat.location.lat],
      content,
      offset: new AMap.Pixel(-22, -22),
      extData: { catId: cat.id }
    });
    marker.on('click', () => showCatModal(cat.id));
    map.add(marker);
    markers.push(marker);
  }

  function clearMarkers() { markers.forEach(m=>map.remove(m)); markers=[]; }

  // ===== 热力图 =====
  // 数据来源：已审核打卡 + 所有猫咪的出没位置（每只猫贡献2个权重点）
  function _buildHeatmapData() {
    const checkinPts = DB.Checkin.getHeatmapData(); // 已审核打卡，weight=1
    const catPts = DB.Cat.getAll()
      .filter(c => c.location?.lng && c.location?.lat)
      .map(c => ({
        lng: c.location.lng,
        lat: c.location.lat,
        weight: 2 + Math.min((c.checkin_count || 0) * 0.5, 5) // 打卡越多权重越高
      }));
    return [...checkinPts, ...catPts];
  }

  function toggleHeatmap(show) {
    if (!map) return;
    if (show) {
      const data = _buildHeatmapData();
      AMap.plugin('AMap.HeatMap', () => {
        if (!heatmap) {
          heatmap = new AMap.HeatMap(map, {
            radius: 35,
            opacity: [0, 1],
            // 高饱和度热力渐变：蓝→青→绿→黄→橙→红
            gradient: {
              0.0: 'rgba(0,0,255,0)',
              0.2: 'rgba(0,180,255,0.9)',
              0.4: 'rgba(0,220,120,0.95)',
              0.6: 'rgba(200,220,0,1)',
              0.8: 'rgba(255,140,0,1)',
              1.0: 'rgba(220,0,0,1)'
            }
          });
        }
        const maxWeight = Math.max(...data.map(p => p.weight || 1), 5);
        heatmap.setDataSet({ data, max: maxWeight });
        heatmap.show();
        showToast(`热力图已更新 · ${data.length} 个数据点`, 'success');
      });
    } else {
      if (heatmap) heatmap.hide();
    }
  }

  // 刷新热力图数据（新增猫咪/打卡后调用）
  function refreshHeatmap() {
    if (heatmap && document.getElementById('chkHeatmap')?.checked) {
      const data = _buildHeatmapData();
      const maxWeight = Math.max(...data.map(p => p.weight || 1), 5);
      heatmap.setDataSet({ data, max: maxWeight });
    }
  }

  // ===== 猫咪弹窗 =====
  function showCatModal(catId) {
    const cat = DB.Cat.getById(catId); if(!cat) return;
    currentCatId = catId;
    document.getElementById('modalName').textContent     = cat.name;
    document.getElementById('modalLocation').textContent = '📍 ' + (cat.location?.address||'未知位置');
    document.getElementById('modalGender').textContent   = cat.gender==='male'?'♂ 公':cat.gender==='female'?'♀ 母':'未知';
    document.getElementById('modalColor').textContent    = cat.color||'-';
    document.getElementById('modalHealth').innerHTML     = cat.health_status==='healthy'?'<span class="tag tag-green">✅ 健康</span>':'<span class="tag tag-red">🏥 需关注</span>';
    document.getElementById('modalNeutered').textContent = cat.neutered?'✅ 已绝育':'❌ 未绝育';
    document.getElementById('modalCheckins').textContent = (cat.checkin_count||0)+' 次';
    document.getElementById('modalLastSeen').textContent = cat.last_seen?(cat.last_seen.substring(0,10)):'-';
    document.getElementById('modalDesc').textContent     = cat.description||'暂无简介';
    document.getElementById('btnDetailFromModal').href   = `pages/cat_detail.html?id=${catId}`;
    document.getElementById('modalTags').innerHTML = (cat.personality_tags||[]).map(t=>`<span class="tag">${t}</span>`).join('');
    // 头像：map.js 在根目录，直接用 images/cats/ 路径
    const avatarEl = document.getElementById('modalAvatar');
    const avatarUrl = cat.avatar ? cat.avatar : '';
    if (avatarUrl) {
      avatarEl.innerHTML = `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%" onerror="this.parentElement.textContent='${cat.gender==='female'?'😸':'😺'}'">`;
    } else {
      avatarEl.textContent = cat.gender==='female' ? '😸' : cat.gender==='male' ? '😺' : '🐱';
    }
    document.getElementById('catModal').style.display='flex';
  }

  function locateUser() {
    if(!map) return;
    AMap.plugin('AMap.Geolocation',()=>{
      const geo = new AMap.Geolocation({enableHighAccuracy:true,timeout:10000});
      map.addControl(geo);
      geo.getCurrentPosition((status,result)=>{
        if(status==='complete'){ map.setCenter([result.position.lng,result.position.lat]); map.setZoom(17); showToast('定位成功','success'); }
        else showToast('定位失败，请检查浏览器权限','error');
      });
    });
  }

  function startPickLocation(callback) {
    if(!map){ showToast('地图未加载'); return; }
    isPickingLocation=true;
    document.getElementById('mapContainer').style.cursor='crosshair';
    showToast('🎯 请点击地图选择位置');
    const h = e => {
      pickedLocation={lng:e.lnglat.getLng(),lat:e.lnglat.getLat()};
      map.off('click',h); isPickingLocation=false;
      document.getElementById('mapContainer').style.cursor='';
      if(callback) callback(pickedLocation);
    };
    map.on('click',h);
  }

  function _updateStats() {
    const cats=DB.Cat.getAll(); const today=new Date().toISOString().substring(0,10);
    const todayOK=DB.Checkin.getAll().filter(c=>c.created_at?.startsWith(today)&&c.status==='approved');
    const statTotal=document.getElementById('statTotal'); if(statTotal) statTotal.textContent=cats.length;
    const statToday=document.getElementById('statToday'); if(statToday) statToday.textContent=todayOK.length;
  }

  function doSearch(kw) {
    const results=DB.Cat.search(kw); const container=document.getElementById('searchResults');
    if(!results.length){ container.innerHTML='<p style="padding:8px;color:var(--text-3)">没有找到相关猫咪 🐾</p>'; return; }
    container.innerHTML=results.map(cat=>`
      <div class="search-result-item" onclick="MapApp.flyToCat('${cat.id}')">
        <span class="cat-icon">${cat.gender==='female'?'😸':'😺'}</span>
        <div class="cat-info">
          <div class="cat-name">${cat.name}</div>
          <div class="cat-loc">📍 ${cat.location?.address||'未知位置'}</div>
        </div>
      </div>`).join('');
  }

  function flyToCat(catId) {
    const cat=DB.Cat.getById(catId); if(!cat?.location?.lng||!map) return;
    map.setCenter([cat.location.lng,cat.location.lat]); map.setZoom(18);
    setTimeout(()=>showCatModal(catId), 500);
  }

  function _bindMapEvents() {
    map.on('click',()=>{ if(!isPickingLocation) document.getElementById('catModal').style.display='none'; });
  }

  function _bindUIEvents() {
    document.getElementById('btnToggleSidebar')?.addEventListener('click',()=>document.querySelector('.sidebar').classList.toggle('collapsed'));
    document.getElementById('chkCatMarkers')?.addEventListener('change',e=>markers.forEach(m=>e.target.checked?m.show():m.hide()));
    document.getElementById('chkHeatmap')?.addEventListener('change',e=>toggleHeatmap(e.target.checked));
    document.getElementById('btnFilter')?.addEventListener('click',()=>{ loadCatMarkers({gender:document.getElementById('filterGender').value,health:document.getElementById('filterHealth').value}); showToast('筛选已应用'); });
    document.getElementById('btnSearch')?.addEventListener('click',()=>doSearch(document.getElementById('searchInput').value.trim()));
    document.getElementById('searchInput')?.addEventListener('keydown',e=>{ if(e.key==='Enter') doSearch(e.target.value.trim()); });
    document.getElementById('btnLocate')?.addEventListener('click',locateUser);
    document.getElementById('btnReport')?.addEventListener('click',()=>{ if(!DB.Session.isLoggedIn()){showToast('请先登录','error');window.location.href='pages/login.html';return;} document.getElementById('reportModal').style.display='flex'; });
    document.getElementById('btnPickLocation')?.addEventListener('click',()=>{ document.getElementById('reportModal').style.display='none'; startPickLocation(loc=>{ document.getElementById('reportLocationText').textContent=`${loc.lng.toFixed(5)}, ${loc.lat.toFixed(5)}`; document.getElementById('reportModal').style.display='flex'; }); });
    document.getElementById('btnSubmitReport')?.addEventListener('click',_submitReport);
    document.getElementById('btnCancelReport')?.addEventListener('click',()=>document.getElementById('reportModal').style.display='none');
    document.getElementById('closeReportModal')?.addEventListener('click',()=>document.getElementById('reportModal').style.display='none');
    document.getElementById('closeCatModal')?.addEventListener('click',()=>document.getElementById('catModal').style.display='none');
    document.getElementById('btnCheckinFromModal')?.addEventListener('click',()=>{ if(!DB.Session.isLoggedIn()){showToast('请先登录','error');return;} window.location.href=`pages/checkin.html?cat_id=${currentCatId}`; });
    document.getElementById('btnFavoriteFromModal')?.addEventListener('click',()=>{ const user=DB.Session.getUser(); if(!user){showToast('请先登录','error');return;} const added=DB.User.toggleFavorite(user.id,currentCatId); showToast(added?'已收藏 ❤️':'已取消收藏',added?'success':''); });
  }

  function _bindEventsNoMap() { _bindUIEvents(); }

  function _submitReport() {
    const user=DB.Session.getUser();
    if(!pickedLocation){showToast('请先在地图上选择位置','error');return;}
    const desc=document.getElementById('reportDesc').value.trim();
    const catName=document.getElementById('reportCatName')?.value.trim()||'';
    DB.Report.create({ type:'new_cat', location:pickedLocation, description:desc, cat_name:catName, user_id:user?.id, user_nickname:user?.nickname });
    document.getElementById('reportModal').style.display='none';
    document.getElementById('reportDesc').value=''; if(document.getElementById('reportCatName')) document.getElementById('reportCatName').value='';
    pickedLocation=null; document.getElementById('reportLocationText').textContent='请点击地图选点';
    showToast('上报成功！等待管理员审核后将显示在地图上 🐱','success');
  }

  return { init, loadCatMarkers, toggleHeatmap, refreshHeatmap, flyToCat, showCatModal, startPickLocation, switchBasemap };
})();
