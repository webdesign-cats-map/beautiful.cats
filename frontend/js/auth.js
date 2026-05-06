const Auth = {
  updateNav() {
    const navUser = document.getElementById('navUser'); if(!navUser) return;
    const user = DB.Session.getUser();
    const isRoot = location.pathname.endsWith('index.html') || location.pathname === '/' || location.pathname.endsWith('/');
    const base   = isRoot ? 'pages/' : '';
    if (user) {
      navUser.innerHTML = `
        <span style="font-size:13px;color:var(--text-2)">Hi，<strong style="color:var(--primary)">${user.nickname}</strong></span>
        <a href="${base}profile.html" class="btn btn-sm btn-outline">👤 个人中心</a>
        ${user.role==='admin'?`<a href="${base}admin.html" class="btn btn-sm btn-warning">⚙️ 管理</a>`:''}
        <button class="btn btn-sm btn-danger" onclick="Auth.logout()">退出</button>`;
    } else {
      navUser.innerHTML = `<a href="${base}login.html" class="btn btn-sm">登录</a><a href="${base}register.html" class="btn btn-sm btn-primary">注册</a>`;
    }
  },
  logout() {
    DB.Session.clear(); showToast('已退出登录 👋');
    setTimeout(()=>{
      const isRoot = location.pathname.endsWith('index.html')||location.pathname==='/'||location.pathname.endsWith('/');
      window.location.replace(isRoot?'pages/login.html':'login.html');
    }, 600);
  },
  requireLogin() {
    if(!DB.Session.isLoggedIn()){ window.location.replace('login.html?redirect='+encodeURIComponent(location.href)); return false; } return true;
  },
  requireAdmin() {
    if(!DB.Session.isAdmin()){ showToast('需要管理员权限','error'); setTimeout(()=>window.location.replace('../index.html'),800); return false; } return true;
  }
};
