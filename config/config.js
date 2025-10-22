// config.js — salva config por usuário e atualiza fallback global
const USERS_KEY = "users";
const LOGGED_KEY = "loggedUser";
const CFG_KEY = "gv_config";
const SIDEBAR_KEY = "sidebarMinimized";

function safeParse(v){ try { return JSON.parse(v); } catch(e){ return null; } }

// retorna o usuário completo (obj) a partir do storage, ou null
function getFullLoggedUser(){
  const raw = localStorage.getItem(LOGGED_KEY);
  if(!raw) return null;
  const users = safeParse(localStorage.getItem(USERS_KEY)) || [];
  const parsed = safeParse(raw);

  if(parsed && typeof parsed === 'object'){
    if(parsed.id){
      return users.find(u => String(u.id) === String(parsed.id)) || parsed || null;
    }
    if(parsed.username){
      return users.find(u => u.username === parsed.username || u.email === parsed.username) || parsed || null;
    }
    // if parsed already looks like full user with config:
    if(parsed.config) return parsed;
    return null;
  }

  // raw is string, search users[]
  return users.find(u => u.username === raw || u.email === raw) || null;
}

function loadConfig(){
  const user = getFullLoggedUser();
  if(user && user.config && typeof user.config === 'object') return Object.assign({theme:"light",accent:"#6a11cb",notifications:false}, user.config);
  const raw = localStorage.getItem(CFG_KEY);
  if(raw) try { return JSON.parse(raw); } catch(e){}
  // legacy fallback
  const theme = localStorage.getItem("gv_theme") || "light";
  const accent = localStorage.getItem("gv_accent") || "#6a11cb";
  const notifications = localStorage.getItem("gv_notifications") === "true";
  return { theme, accent, notifications };
}

function saveConfig(cfg){
  if(!cfg || typeof cfg !== 'object') return;
  // save global fallback
  try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch(e){}

  // keep legacy keys too
  try {
    localStorage.setItem("gv_theme", cfg.theme);
    localStorage.setItem("gv_accent", cfg.accent);
    localStorage.setItem("gv_notifications", cfg.notifications ? "true" : "false");
  } catch(e){}

  // update user's config if logged
  try {
    const users = safeParse(localStorage.getItem(USERS_KEY)) || [];
    const rawLogged = localStorage.getItem(LOGGED_KEY);
    const parsed = safeParse(rawLogged);
    let idx = -1;

    if(parsed && typeof parsed === 'object' && parsed.id) idx = users.findIndex(u => String(u.id) === String(parsed.id));
    if(idx === -1 && parsed && typeof parsed === 'object' && parsed.username) idx = users.findIndex(u => u.username === parsed.username || u.email === parsed.username);
    if(idx === -1 && typeof rawLogged === 'string') idx = users.findIndex(u => u.username === rawLogged || u.email === rawLogged);

    if(idx !== -1){
      users[idx].config = Object.assign({}, users[idx].config || {}, cfg);
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      // store a lightweight loggedUser (id + username) to avoid big objects but keep resolvable
      try {
        localStorage.setItem(LOGGED_KEY, JSON.stringify({ id: users[idx].id, username: users[idx].username }));
      } catch(e){}
      // trigger storage event for other tabs (setItem above already does)
    }
  } catch(e){
    console.warn("saveConfig: could not persist to user (non-fatal)", e);
  }

  // apply immediately
  if(typeof window.applyConfig === 'function'){
    try { window.applyConfig(cfg); } catch(e){ console.warn("applyConfig failed on save", e); }
  }
}

// optional: migrate users[] to include config from gv_config if missing (run once)
function migrateUsersConfigFromGlobal(){
  try {
    const users = safeParse(localStorage.getItem(USERS_KEY)) || [];
    const global = safeParse(localStorage.getItem(CFG_KEY));
    if(!global) return;
    let changed = false;
    for(const u of users){
      if(!u.config || typeof u.config !== 'object'){
        u.config = Object.assign({theme:"light",accent:"#6a11cb",notifications:false}, global);
        changed = true;
      }
    }
    if(changed) localStorage.setItem(USERS_KEY, JSON.stringify(users));
  } catch(e){ console.warn("migrateUsersConfigFromGlobal failed", e); }
}

// ----------------- UI Init (document ready) -----------------
document.addEventListener('DOMContentLoaded', ()=>{

  // migrate once (safe)
  migrateUsersConfigFromGlobal();

  // DOM refs (guards)
  const themeToggle = document.getElementById("themeToggle");
  const themeLabel = document.getElementById("themeLabel");
  const accentColor = document.getElementById("accentColor");
  const accentPreview = document.getElementById("accentPreview");
  const notifToggle = document.getElementById("notifToggle");
  const testNotifBtn = document.getElementById("testNotifBtn");
  const resetBtn = document.getElementById("resetConfigBtn");
  const showDeleteBox = document.getElementById("showDeleteBox");
  const deleteBox = document.getElementById("deleteBox");
  const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
  const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  const confirmDeletePassword = document.getElementById("confirmDeletePassword");
  const deleteMsg = document.getElementById("deleteMsg");
  const logoutBtn = document.getElementById("logoutBtn");
  const sidebar = document.querySelector(".sidebar");
  const toggleSidebarBtn = document.getElementById("toggleSidebarBtn");
  const tabs = Array.from(document.querySelectorAll(".tab-btn"));
  const contents = Array.from(document.querySelectorAll(".tab-content"));
  const userDisplay = document.getElementById("userDisplay");

  const fullUser = getFullLoggedUser();
  if(!fullUser){
    // no user -> redirect
    try { localStorage.removeItem(LOGGED_KEY); } catch(e){}
    window.location.href = "../entrada/entrada.html";
    return;
  }

  if(userDisplay) {
    const name = fullUser.displayName || fullUser.username || fullUser.email || "";
    userDisplay.textContent = `Bem-vindo, ${name}!`;
  }

  // load config (prioritizes user)
  let cfg = loadConfig();

  if(typeof window.applyConfig === 'function'){
    try { window.applyConfig(cfg); } catch(e){ console.warn("applyConfig error init", e); }
  }

  // populate UI
  if(themeToggle){ themeToggle.checked = (cfg.theme === "dark"); if(themeLabel) themeLabel.textContent = cfg.theme === "dark" ? "Modo escuro" : "Modo claro"; }
  if(accentColor){ accentColor.value = cfg.accent || "#6a11cb"; if(accentPreview) accentPreview.style.background = cfg.accent || "#6a11cb"; }
  if(notifToggle) notifToggle.checked = !!cfg.notifications;

  // listeners
  themeToggle?.addEventListener("change", ()=>{
    cfg.theme = themeToggle.checked ? "dark" : "light";
    if(themeLabel) themeLabel.textContent = cfg.theme === "dark" ? "Modo escuro" : "Modo claro";
    saveConfig(cfg);
  });

  accentColor?.addEventListener("input", ()=>{
    cfg.accent = accentColor.value;
    if(accentPreview) accentPreview.style.background = cfg.accent;
    saveConfig(cfg);
    try { document.documentElement.style.setProperty("--accent", cfg.accent); if(document.body) document.body.style.setProperty("--accent", cfg.accent); } catch(e){}
  });

  notifToggle?.addEventListener("change", ()=>{
    cfg.notifications = notifToggle.checked;
    saveConfig(cfg);
    showSnackbar(cfg.notifications ? "Notificações ativadas" : "Notificações desativadas");
  });

  testNotifBtn?.addEventListener("click", ()=> showSnackbar(cfg.notifications ? "Notificação de teste (simulada)" : "Ative notificações primeiro"));

  resetBtn?.addEventListener("click", ()=>{
    if(!confirm("Restaurar padrão?")) return;
    // reset global and user
    localStorage.removeItem(CFG_KEY);
    localStorage.removeItem("gv_theme");
    localStorage.removeItem("gv_accent");
    localStorage.removeItem("gv_notifications");

    try {
      const users = safeParse(localStorage.getItem(USERS_KEY)) || [];
      const logged = getFullLoggedUser();
      if(logged){
        const idx = users.findIndex(u => u.id && logged.id && String(u.id) === String(logged.id) || u.username === logged.username);
        if(idx !== -1){
          users[idx].config = {theme:"light",accent:"#6a11cb",notifications:false};
          localStorage.setItem(USERS_KEY, JSON.stringify(users));
          localStorage.setItem(LOGGED_KEY, JSON.stringify({ id: users[idx].id, username: users[idx].username }));
        }
      }
    } catch(e){ console.warn("reset: updating users failed", e); }

    cfg = loadConfig();
    if(typeof window.applyConfig === 'function') window.applyConfig(cfg);
    if(themeToggle){ themeToggle.checked = (cfg.theme === "dark"); if(themeLabel) themeLabel.textContent = cfg.theme === "dark" ? "Modo escuro" : "Modo claro"; }
    if(accentColor) { accentColor.value = cfg.accent || "#6a11cb"; if(accentPreview) accentPreview.style.background = cfg.accent || "#6a11cb"; }
    if(notifToggle) notifToggle.checked = !!cfg.notifications;
    showSnackbar("Configurações restauradas.");
  });

  // delete user / logout handlers (keeps previous behavior but safe)
  showDeleteBox?.addEventListener("click", ()=>{ if(deleteBox) deleteBox.style.display = "block"; if(confirmDeletePassword) confirmDeletePassword.value = ""; if(deleteMsg) deleteMsg.textContent = ""; });
  cancelDeleteBtn?.addEventListener("click", ()=>{ if(deleteBox) deleteBox.style.display = "none"; if(confirmDeletePassword) confirmDeletePassword.value = ""; if(deleteMsg) deleteMsg.textContent = ""; });

  confirmDeleteBtn?.addEventListener("click", ()=>{
    const senha = (confirmDeletePassword?.value || "");
    const users = safeParse(localStorage.getItem(USERS_KEY)) || [];
    const idx = users.findIndex(u => u.id && fullUser.id && String(u.id) === String(fullUser.id));
    if(idx === -1){ if(deleteMsg) deleteMsg.textContent = "Usuário não encontrado"; return; }
    if(users[idx].password !== senha){ if(deleteMsg) deleteMsg.textContent = "Senha incorreta"; return; }
    if(!confirm("Confirma exclusão permanente?")) return;
    users.splice(idx,1);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.removeItem(LOGGED_KEY);
    showSnackbar("Conta apagada, redirecionando...");
    setTimeout(()=> window.location.href = "../entrada/entrada.html", 1200);
  });

  logoutBtn?.addEventListener("click", ()=>{ localStorage.removeItem(LOGGED_KEY); window.location.href = "../entrada/entrada.html"; });

  // sidebar / tabs (same behavior as before)
  const applySidebarState = ()=> {
    if(!sidebar) return;
    if(localStorage.getItem(SIDEBAR_KEY) === 'true') sidebar.classList.add('minimized');
    else sidebar.classList.remove('minimized');
  };
  applySidebarState();

  toggleSidebarBtn?.addEventListener("click", ()=>{
    if(!sidebar) return;
    sidebar.classList.toggle("minimized");
    localStorage.setItem(SIDEBAR_KEY, sidebar.classList.contains("minimized"));
  });

  document.addEventListener('keydown', (e)=> {
    if((e.key === 'm' || e.key === 'M') && (e.ctrlKey || e.altKey)){
      if(!sidebar) return;
      sidebar.classList.toggle("minimized");
      localStorage.setItem(SIDEBAR_KEY, sidebar.classList.contains("minimized"));
    }
  });

  const openTab = (tabId) => {
    if(!tabId) return;
    tabs.forEach(t=>t.classList.remove("active"));
    contents.forEach(c=>c.classList.remove("active"));
    const btn = tabs.find(t => t.dataset.tab === tabId);
    if(btn) btn.classList.add("active");
    const cont = document.getElementById(tabId);
    if(cont) cont.classList.add("active");
  };

  tabs.forEach(btn => {
    btn.addEventListener("click", ()=>{
      const tab = btn.dataset.tab;
      if(!tab) return;
      if(tab === "biblioteca") { window.location.href = "../biblioteca/biblioteca.html"; return; }
      if(tab === "perfil") { window.location.href = "../perfil/perfil.html"; return; }
      if(tab === "config") { return; }
      const section = document.getElementById(tab);
      if(section){ openTab(tab); history.replaceState(null,"",`#${tab}`); } else { window.location.href = `../principal/principal.html#${tab}`; }
    });
  });

  if(window.location.hash) setTimeout(()=> openTab(window.location.hash.replace("#","")), 60);

  console.info("config.js iniciado — configs por-usuario em uso.");
});
