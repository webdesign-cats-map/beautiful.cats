/**
 * 校园流浪猫系统 - localStorage 数据存储模块
 * 河海大学江宁校区 (118.7567, 31.9097)
 */

// ===== 全局：猫咪头像路径解析（自动适配根目录和pages/子目录） =====
function catAvatarUrl(avatar) {
  if (!avatar) return '';
  if (avatar.startsWith('http') || avatar.startsWith('data:')) return avatar;
  // 判断当前页面深度：pages/ 下需要加 ../
  const isSubPage = location.pathname.includes('/pages/');
  const base = isSubPage ? '../' : '';
  return base + avatar;
}

// ===== 全局工具 =====
function showToast(msg, type = '') {
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  el.innerHTML = (type === 'success' ? '✅ ' : type === 'error' ? '❌ ' : type === 'warning' ? '⚠️ ' : '🐱 ') + msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

const DB = (() => {
  const VERSION = '7'; // 升版本号强制重置

  function init() {
    if (localStorage.getItem('ccat_version') !== VERSION) {
      Object.keys(localStorage).filter(k => k.startsWith('ccat_')).forEach(k => localStorage.removeItem(k));
      _set('cats',     _defaultCats());
      _set('checkins', _defaultCheckins());
      _set('reports',  []);
      _set('comments', _defaultComments());
      _set('users',    _defaultUsers());
      localStorage.setItem('ccat_version', VERSION);
    }
  }

  function _set(k, v)  { localStorage.setItem('ccat_' + k, JSON.stringify(v)); }
  function _get(k)     { try { const v = localStorage.getItem('ccat_'+k); return v ? JSON.parse(v) : null; } catch(e) { return null; } }
  function _now()      { return new Date().toISOString().replace('T',' ').substring(0,19); }
  function _uuid()     { return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2,9); }
  function _hashPwd(p) { let h=5381; for(let i=0;i<p.length;i++){h=((h<<5)+h)^p.charCodeAt(i);h=h>>>0;} return 'h3_'+h.toString(16).padStart(8,'0'); }
  function _safeUser(u){ const {password,...s}=u; return s; }

  // ===== 默认用户 =====
  function _defaultUsers() {
    return [
      { id:'admin_001', username:'admin', password:_hashPwd('admin123'), nickname:'管理员', email:'admin@hhu.edu.cn', role:'admin', avatar:'', created_at:_now(), checkin_count:5, favorites:['cat_001','cat_003'] },
      { id:'user_001',  username:'demo',  password:_hashPwd('demo123'),  nickname:'喵星人守护者', email:'demo@hhu.edu.cn', role:'user',  avatar:'', created_at:_now(), checkin_count:8, favorites:['cat_002','cat_005','cat_008'] }
    ];
  }

  // ===== 15只猫咪，坐标均在河海大学江宁校区内 (118.785863, 31.914453) =====
  // 图片使用本地生成的 SVG，无需网络，100% 可用
  function _defaultCats() {
    const img = id => `../images/cats/${id}.svg`;   // 相对路径，pages/ 下使用
    const imgR = id => `images/cats/${id}.svg`;      // index.html 根目录使用
    const I = id => `images/cats/${id}.svg`;         // 统一用根路径，各页面按需处理
    return [
      { id:'cat_001', name:'橘墩墩', gender:'male',   color:'橙色虎斑', personality_tags:['亲人','贪吃','傲娇'],  health_status:'healthy', neutered:true,  avatar:'images/cats/1.jpg',  location:{lng:118.7838, lat:31.9152, address:'图书馆西侧花坛'},   description:'校园里最有名的橘猫，体型圆润，自带贵族气质，见到零食立刻化身舔狗。每天上午10点准时在图书馆西侧晒太阳。', checkin_count:28, last_seen:_now(), created_at:_now(), updated_at:_now() },
      { id:'cat_002', name:'雪团',   gender:'female', color:'纯白',     personality_tags:['社恐','优雅','怕生'],  health_status:'healthy', neutered:true,  avatar:'images/cats/2.jpg',  location:{lng:118.7878, lat:31.9158, address:'1号食堂后门'},      description:'纯白色长毛猫，像一团棉花糖。平时喜欢躲在食堂后门附近，只接受轻声细语靠近。', checkin_count:15, last_seen:_now(), created_at:_now(), updated_at:_now() },
      { id:'cat_003', name:'黑珍珠', gender:'female', color:'纯黑',     personality_tags:['活泼','调皮','话多'],  health_status:'healthy', neutered:true,  avatar:'images/cats/3.jpg',  location:{lng:118.7822, lat:31.9131, address:'操场看台下方'},     description:'全身乌黑发亮，眼睛是琥珀色，会学人说"喵喵喵"。喜欢在操场边追同学的鞋带玩。', checkin_count:19, last_seen:_now(), created_at:_now(), updated_at:_now() },
      { id:'cat_004', name:'花生',   gender:'male',   color:'三花',     personality_tags:['温柔','爱撒娇','懒'],  health_status:'healthy', neutered:false, avatar:'images/cats/4.jpg',  location:{lng:118.7895, lat:31.9145, address:'2号宿舍楼C栋门口'}, description:'三花配色的公猫（比较罕见），脾气超级好，最喜欢蹭宿舍楼保安叔叔的腿。', checkin_count:22, last_seen:_now(), created_at:_now(), updated_at:_now() },
      { id:'cat_005', name:'小灰灰', gender:'male',   color:'蓝灰色',   personality_tags:['高冷','聪明','独行'],  health_status:'healthy', neutered:true,  avatar:'images/cats/5.jpg',  location:{lng:118.7848, lat:31.9122, address:'行政楼台阶'},       description:'灰色短毛，眼神深邃。经常一个人坐在行政楼台阶上凝视远方，有种"我在思考宇宙"的气质。', checkin_count:11, last_seen:_now(), created_at:_now(), updated_at:_now() },
      { id:'cat_006', name:'豆腐',   gender:'female', color:'奶白',     personality_tags:['软糯','爱睡觉','胆小'], health_status:'injured', neutered:true,  avatar:'images/cats/6.jpg',  location:{lng:118.7865, lat:31.9165, address:'3号教学楼连廊'},    description:'奶白色短毛猫，右前爪轻微受伤已在恢复中，由志愿者定期检查。非常温顺，喜欢被抱着睡觉。', checkin_count:9,  last_seen:_now(), created_at:_now(), updated_at:_now() },
      { id:'cat_007', name:'大王',   gender:'male',   color:'棕色虎斑', personality_tags:['霸气','护食','友善'],   health_status:'healthy', neutered:false, avatar:'images/cats/7.jpg',  location:{lng:118.7812, lat:31.9148, address:'南门保卫室旁'},     description:'体型最大的校园猫，俨然校园猫王。守着南门附近的地盘，对人类相当友善。', checkin_count:17, last_seen:_now(), created_at:_now(), updated_at:_now() },
      { id:'cat_008', name:'奶糖',   gender:'female', color:'奶牛',     personality_tags:['甜甜','爱蹭人','黏人'],  health_status:'healthy', neutered:true,  avatar:'images/cats/8.jpg',  location:{lng:118.7902, lat:31.9137, address:'校医院走廊'},       description:'黑白奶牛花纹，是校园里最爱蹭人的猫咪。只要站着不动超过3秒，她就会来蹭你的裤腿。', checkin_count:31, last_seen:_now(), created_at:_now(), updated_at:_now() },
      { id:'cat_009', name:'咖喱',   gender:'male',   color:'姜黄色',   personality_tags:['热情','好奇','馋嘴'],   health_status:'healthy', neutered:true,  avatar:'images/cats/9.jpg',  location:{lng:118.7832, lat:31.9175, address:'北区超市门口'},     description:'姜黄色短毛，对任何食物都极其感兴趣。经常坐在超市门口用期盼眼神望着每个出来的同学。', checkin_count:24, last_seen:_now(), created_at:_now(), updated_at:_now() },
      { id:'cat_010', name:'薄荷',   gender:'female', color:'银灰渐变', personality_tags:['文静','爱干净','神秘'],  health_status:'healthy', neutered:true,  avatar:'images/cats/10.jpg', location:{lng:118.7858, lat:31.9118, address:'人工湖畔凉亭'},     description:'银灰色渐变毛，总是把自己打理得一尘不染。喜欢待在人工湖边的凉亭里看水中倒影。', checkin_count:13, last_seen:_now(), created_at:_now(), updated_at:_now() },
      { id:'cat_011', name:'红豆',   gender:'male',   color:'棕红色',   personality_tags:['勇敢','讲义气','爱玩'],  health_status:'healthy', neutered:false, avatar:'images/cats/11.jpg', location:{lng:118.7845, lat:31.9162, address:'篮球场边灌木丛'},   description:'棕红色短毛，鼻子有个小白点。在篮球场边安家，经常追赶球滚动的声音。', checkin_count:8,  last_seen:_now(), created_at:_now(), updated_at:_now() },
      { id:'cat_012', name:'泡芙',   gender:'female', color:'玳瑁',     personality_tags:['嘴甜','话多','爱炫耀'],  health_status:'healthy', neutered:true,  avatar:'images/cats/12.jpg', location:{lng:118.7888, lat:31.9172, address:'4号宿舍楼天台'},    description:'玳瑁花色，叫声特别悦耳，像在唱歌。宿舍楼的同学给她取名泡芙是因为叫声酥软得像甜品。', checkin_count:20, last_seen:_now(), created_at:_now(), updated_at:_now() },
      { id:'cat_013', name:'墨墨',   gender:'male',   color:'黑白',     personality_tags:['憨厚','老实','容易满足'], health_status:'healthy', neutered:true,  avatar:'images/cats/13.jpg', location:{lng:118.7826, lat:31.9140, address:'后勤楼垃圾房附近'}, description:'黑白双色，表情总是憨憨的样子。是最好养的一只，给什么吃什么，摸哪里都不躲。', checkin_count:16, last_seen:_now(), created_at:_now(), updated_at:_now() },
      { id:'cat_014', name:'芝麻',   gender:'female', color:'灰白混色', personality_tags:['机灵','善解人意','跟人'],  health_status:'healthy', neutered:true,  avatar:'images/cats/14.jpg', location:{lng:118.7872, lat:31.9147, address:'主干道路灯旁'},     description:'灰白混色，毛色像撒了芝麻。会跟着人走很远，像只导盲犬一样带路。目测是被遗弃的宠物猫。', checkin_count:25, last_seen:_now(), created_at:_now(), updated_at:_now() },
      { id:'cat_015', name:'糯米',   gender:'female', color:'白底橘斑', personality_tags:['圆滚滚','能吃','爱晒太阳'], health_status:'healthy', neutered:true,  avatar:'images/cats/15.jpg', location:{lng:118.7855, lat:31.9155, address:'图书馆东侧草坪'},   description:'白底橘斑，体型圆润像个糯米团子。每天下午2-4点必定出现在图书馆东侧草坪晒太阳，非常守时。', checkin_count:18, last_seen:_now(), created_at:_now(), updated_at:_now() }
    ];
  }

  // ===== 默认打卡（已审核，用于热力图） =====
  function _defaultCheckins() {
    const approved = [
      {cat_id:'cat_001', type:'feed',      user_id:'user_001', user_nickname:'喵星人守护者', location:{lng:118.7838, lat:31.9152}, note:'喂了半包猫粮'},
      {cat_id:'cat_001', type:'encounter', user_id:'admin_001',user_nickname:'管理员',       location:{lng:118.7840, lat:31.9154}, note:'在晒太阳'},
      {cat_id:'cat_001', type:'feed',      user_id:'admin_001',user_nickname:'管理员',       location:{lng:118.7836, lat:31.9150}, note:''},
      {cat_id:'cat_002', type:'feed',      user_id:'user_001', user_nickname:'喵星人守护者', location:{lng:118.7878, lat:31.9158}, note:''},
      {cat_id:'cat_002', type:'encounter', user_id:'admin_001',user_nickname:'管理员',       location:{lng:118.7880, lat:31.9160}, note:''},
      {cat_id:'cat_003', type:'encounter', user_id:'user_001', user_nickname:'喵星人守护者', location:{lng:118.7822, lat:31.9131}, note:'追球玩'},
      {cat_id:'cat_004', type:'feed',      user_id:'admin_001',user_nickname:'管理员',       location:{lng:118.7895, lat:31.9145}, note:''},
      {cat_id:'cat_004', type:'encounter', user_id:'user_001', user_nickname:'喵星人守护者', location:{lng:118.7897, lat:31.9147}, note:'在蹭保安叔叔'},
      {cat_id:'cat_005', type:'encounter', user_id:'user_001', user_nickname:'喵星人守护者', location:{lng:118.7848, lat:31.9122}, note:'在发呆'},
      {cat_id:'cat_007', type:'encounter', user_id:'admin_001',user_nickname:'管理员',       location:{lng:118.7812, lat:31.9148}, note:'在巡视地盘'},
      {cat_id:'cat_008', type:'feed',      user_id:'user_001', user_nickname:'喵星人守护者', location:{lng:118.7902, lat:31.9137}, note:'超黏人'},
      {cat_id:'cat_008', type:'encounter', user_id:'admin_001',user_nickname:'管理员',       location:{lng:118.7904, lat:31.9139}, note:''},
      {cat_id:'cat_009', type:'encounter', user_id:'admin_001',user_nickname:'管理员',       location:{lng:118.7832, lat:31.9175}, note:''},
      {cat_id:'cat_009', type:'feed',      user_id:'user_001', user_nickname:'喵星人守护者', location:{lng:118.7834, lat:31.9173}, note:'等在超市门口'},
      {cat_id:'cat_010', type:'encounter', user_id:'user_001', user_nickname:'喵星人守护者', location:{lng:118.7858, lat:31.9118}, note:'在湖边发呆'},
      {cat_id:'cat_012', type:'encounter', user_id:'user_001', user_nickname:'喵星人守护者', location:{lng:118.7888, lat:31.9172}, note:'在叫歌'},
      {cat_id:'cat_014', type:'feed',      user_id:'admin_001',user_nickname:'管理员',       location:{lng:118.7872, lat:31.9147}, note:'跟人走'},
      {cat_id:'cat_015', type:'encounter', user_id:'user_001', user_nickname:'喵星人守护者', location:{lng:118.7855, lat:31.9155}, note:'准时晒太阳'},
      {cat_id:'cat_015', type:'feed',      user_id:'admin_001',user_nickname:'管理员',       location:{lng:118.7857, lat:31.9153}, note:''},
    ];
    return approved.map((c,i) => ({
      id: 'ck_default_' + i, ...c, cat_name: '',
      photo: '', status: 'approved', created_at: _now(), approved_at: _now()
    }));
  }

  // ===== 默认评论 =====
  function _defaultComments() {
    return {
      cat_001: [
        { id:'cm_001', cat_id:'cat_001', user_id:'user_001', user_nickname:'喵星人守护者', content:'橘墩墩今天居然主动爬上我的腿睡着了，感觉被选中了！', created_at:_now() },
        { id:'cm_002', cat_id:'cat_001', user_id:'admin_001', user_nickname:'管理员', content:'已完成本月健康检查，一切正常～', created_at:_now() }
      ],
      cat_002: [
        { id:'cm_003', cat_id:'cat_002', user_id:'user_001', user_nickname:'喵星人守护者', content:'雪团今天居然让我摸了耳朵！超级进步！', created_at:_now() }
      ],
      cat_008: [
        { id:'cm_004', cat_id:'cat_008', user_id:'user_001', user_nickname:'喵星人守护者', content:'奶糖真的是全校最黏人的猫，站在她地盘里30秒就被贴上来了哈哈', created_at:_now() }
      ]
    };
  }

  // ===== 用户 =====
  const User = {
    getAll()            { return _get('users') || []; },
    getById(id)         { return this.getAll().find(u => u.id === id) || null; },
    getByUsername(name) { return this.getAll().find(u => u.username === name) || null; },
    register({ username, password, nickname, email }) {
      if (!username || !password) return { success:false, msg:'用户名和密码不能为空' };
      const users = this.getAll();
      if (users.find(u => u.username === username)) return { success:false, msg:'用户名已被占用' };
      const user = { id:_uuid(), username, password:_hashPwd(password), nickname:nickname||username, email:email||'', role:'user', avatar:'', created_at:_now(), checkin_count:0, favorites:[] };
      users.push(user); _set('users', users);
      return { success:true, user:_safeUser(user) };
    },
    login(username, password) {
      if (!username||!password) return { success:false, msg:'请填写用户名和密码' };
      const user = this.getByUsername(username);
      if (!user) return { success:false, msg:'用户不存在' };
      if (user.password !== _hashPwd(password)) return { success:false, msg:'密码错误' };
      return { success:true, user:_safeUser(user) };
    },
    update(id, data) {
      const users = this.getAll(); const idx = users.findIndex(u => u.id === id);
      if (idx<0) return { success:false, msg:'用户不存在' };
      users[idx] = { ...users[idx], ...data }; _set('users', users);
      return { success:true, user:_safeUser(users[idx]) };
    },
    toggleFavorite(userId, catId) {
      const users = this.getAll(); const user = users.find(u => u.id === userId);
      if (!user) return false;
      const idx = user.favorites.indexOf(catId);
      if (idx>=0) user.favorites.splice(idx,1); else user.favorites.push(catId);
      _set('users', users); return idx < 0;
    }
  };

  // ===== 猫咪 =====
  const Cat = {
    getAll()    { return _get('cats') || []; },
    getById(id) { return this.getAll().find(c => c.id === id) || null; },
    create(data) {
      const cats = this.getAll();
      const cat  = { id:_uuid(), name:data.name||'未命名', gender:data.gender||'unknown', color:data.color||'', personality_tags:data.personality_tags||[], health_status:data.health_status||'healthy', neutered:!!data.neutered, location:data.location||{}, description:data.description||'', avatar:data.avatar||'', checkin_count:0, last_seen:_now(), created_at:_now(), updated_at:_now() };
      cats.push(cat); _set('cats', cats); return cat;
    },
    update(id, data) {
      const cats = this.getAll(); const idx = cats.findIndex(c => c.id === id);
      if (idx<0) return null;
      cats[idx] = { ...cats[idx], ...data, updated_at:_now() }; _set('cats', cats); return cats[idx];
    },
    delete(id) { _set('cats', this.getAll().filter(c => c.id !== id)); },
    search(kw) {
      if (!kw) return this.getAll();
      const k = kw.toLowerCase();
      return this.getAll().filter(c => c.name.toLowerCase().includes(k) || (c.color||'').includes(kw) || (c.personality_tags||[]).some(t=>t.includes(kw)));
    },
    getStats() {
      const cats = this.getAll();
      return { total:cats.length, male:cats.filter(c=>c.gender==='male').length, female:cats.filter(c=>c.gender==='female').length, neutered:cats.filter(c=>c.neutered).length, healthy:cats.filter(c=>c.health_status==='healthy').length, injured:cats.filter(c=>c.health_status==='injured').length };
    }
  };

  // ===== 打卡 =====
  const Checkin = {
    getAll()          { return _get('checkins') || []; },
    getByCat(catId)   { return this.getAll().filter(c => c.cat_id === catId); },
    getByUser(userId) { return this.getAll().filter(c => c.user_id === userId); },
    getPending()      { return this.getAll().filter(c => c.status === 'pending'); },
    create(data) {
      const list = this.getAll();
      const ck   = { id:_uuid(), cat_id:data.cat_id, cat_name:data.cat_name||'', type:data.type||'encounter', location:data.location||{}, photo:data.photo||'', note:data.note||'', user_id:data.user_id, user_nickname:data.user_nickname||'', status:'pending', created_at:_now(), approved_at:null };
      list.push(ck); _set('checkins', list); return ck;
    },
    approve(id, approved=true) {
      const list = this.getAll(); const item = list.find(c => c.id === id);
      if (!item) return null;
      item.status = approved ? 'approved' : 'rejected'; item.approved_at = _now();
      _set('checkins', list);
      if (approved && item.cat_id) {
        const cats = _get('cats')||[]; const cat = cats.find(c=>c.id===item.cat_id);
        if (cat) { cat.checkin_count=(cat.checkin_count||0)+1; cat.last_seen=_now(); if(item.location?.lng) cat.location=item.location; _set('cats', cats); }
        const users=_get('users')||[]; const user=users.find(u=>u.id===item.user_id);
        if (user) { user.checkin_count=(user.checkin_count||0)+1; _set('users', users); }
      }
      return item;
    },
    getHeatmapData() {
      return this.getAll().filter(c=>c.status==='approved'&&c.location?.lng).map(c=>({ lng:c.location.lng, lat:c.location.lat, weight:1 }));
    },
    getStats() {
      const all=this.getAll();
      return { total:all.length, pending:all.filter(c=>c.status==='pending').length, approved:all.filter(c=>c.status==='approved').length, encounter:all.filter(c=>c.type==='encounter').length, feed:all.filter(c=>c.type==='feed').length };
    }
  };

  // ===== 评论 =====
  const Comment = {
    getByCat(catId) { return (_get('comments')||{})[catId]||[]; },
    add(catId, data) {
      const all=_get('comments')||{}; if(!all[catId]) all[catId]=[];
      const c={ id:_uuid(), cat_id:catId, user_id:data.user_id, user_nickname:data.user_nickname||'匿名', content:data.content, created_at:_now() };
      all[catId].unshift(c); _set('comments', all); return c;
    },
    delete(catId, commentId) {
      const all=_get('comments')||{}; if(all[catId]){ all[catId]=all[catId].filter(c=>c.id!==commentId); _set('comments',all); }
    }
  };

  // ===== 上报 =====
  const Report = {
    getAll()     { return _get('reports')||[]; },
    getPending() { return this.getAll().filter(r=>r.status==='pending'); },
    create(data) {
      const list=this.getAll();
      const r={ id:_uuid(), type:data.type||'new_cat', cat_id:data.cat_id||null, location:data.location||{}, photo:data.photo||'', description:data.description||'', user_id:data.user_id, user_nickname:data.user_nickname||'', status:'pending', created_at:_now() };
      list.push(r); _set('reports', list); return r;
    },
    approve(id, approved=true) {
      const list=this.getAll(); const r=list.find(r=>r.id===id);
      if(r){ r.status=approved?'approved':'rejected'; _set('reports',list); }
      // 上报通过自动创建猫咪
      if (approved && r && r.type === 'new_cat' && !r.cat_id) {
        const newCat = Cat.create({
          name: r.cat_name || '待命名猫咪',
          location: r.location,
          description: r.description,
          gender: r.gender || 'unknown'
        });
        r.cat_id = newCat.id;
        _set('reports', list);
      }
      return r;
    }
  };

  // ===== Session =====
  const Session = {
    setUser(u)   { sessionStorage.setItem('ccat_user', JSON.stringify(u)); },
    getUser()    { try { const u=sessionStorage.getItem('ccat_user'); return u?JSON.parse(u):null; } catch(e){ return null; } },
    clear()      { sessionStorage.removeItem('ccat_user'); },
    isLoggedIn() { return !!this.getUser(); },
    isAdmin()    { return this.getUser()?.role === 'admin'; }
  };

  return { init, User, Cat, Checkin, Comment, Report, Session };
})();

DB.init();
