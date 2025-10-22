// applyConfig.js — aplica config priorizando o usuário logado; defensivo e re-aplica em storage events
(function(){
  const USERS_KEY = "users";
  const LOGGED_KEY = "loggedUser";
  const SIDEBAR_KEY = "sidebarMinimized";

  const DEFAULT = { theme: "light", accent: "#6a11cb", notifications: false };

  function safeParse(v){
    try { return JSON.parse(v); } catch(e){ return null; }
  }

  function resolveFullUserFromStorage(){
    const raw = localStorage.getItem(LOGGED_KEY);
    if(!raw) return null;
    const users = safeParse(localStorage.getItem(USERS_KEY)) || [];
    const parsed = safeParse(raw);

    if(parsed && typeof parsed === 'object'){
      if(parsed.id){
        const found = users.find(u => String(u.id) === String(parsed.id));
        if(found) return found;
      }
      if(parsed.username || parsed.email){
        const found = users.find(u => u.username === parsed.username || u.email === parsed.email);
        if(found) return found;
      }
      if(parsed.config) return parsed;
      return null;
    }

    return users.find(u => u.username === raw || u.email === raw) || null;
  }

  function resolveConfig(provided){
    if(provided && typeof provided === 'object') return provided;
    const user = resolveFullUserFromStorage();
    if(user && user.config && typeof user.config === 'object') return user.config;
    return DEFAULT;
  }

  function applyVariables(isDark, accent){
    try { document.documentElement.style.setProperty("--accent", accent); } catch(e){}
    try {
      if(isDark){
        document.documentElement.style.setProperty("--bg", "#202124");
        document.documentElement.style.setProperty("--surface", "#2b2b2b");
        document.documentElement.style.setProperty("--panel", "#111218");
        document.documentElement.style.setProperty("--text", "#e8eaed");
        document.documentElement.style.setProperty("--muted", "#b0b0b0");
        document.documentElement.style.setProperty("--card-bg", "linear-gradient(180deg,#151626 0%, #0f1115 100%)");
      } else {
        document.documentElement.style.setProperty("--bg", "#ffffff");
        document.documentElement.style.setProperty("--surface", "#ffffff");
        document.documentElement.style.setProperty("--panel", "#f6f6f6");
        document.documentElement.style.setProperty("--text", "#202124");
        document.documentElement.style.setProperty("--muted", "#6b6b6b");
        document.documentElement.style.setProperty("--card-bg", "linear-gradient(180deg,#ffffff 0%, #f7f7f7 100%)");
      }
    } catch(e){}
    if(document.body){
      if(isDark) document.body.classList.add("dark");
      else document.body.classList.remove("dark");
      try { document.body.style.setProperty("--accent", accent); } catch(e){}
    }
  }

  function applySidebarState(){
    const sidebar = document.querySelector(".sidebar");
    if(!sidebar) return;
    const v = localStorage.getItem(SIDEBAR_KEY);
    if(v === 'true') sidebar.classList.add("minimized");
    else sidebar.classList.remove("minimized");
  }

  window.applyConfig = function(cfg){
    const resolved = resolveConfig(cfg);
    const accent = resolved.accent || DEFAULT.accent;
    const isDark = (resolved.theme === "dark");

    applyVariables(isDark, accent);
    applySidebarState();
    return true;
  };

  // reaplica ao detectar mudanças no usuário ou no sidebar
  window.addEventListener('storage', (ev) => {
    if(!ev.key) return;
    if(ev.key === USERS_KEY || ev.key === LOGGED_KEY || ev.key === SIDEBAR_KEY){
      try { window.applyConfig(); } catch(e){ console.warn("applyConfig reapply failed", e); }
    }
  });

  if(document.readyState === 'complete' || document.readyState === 'interactive'){
    try { window.applyConfig(); } catch(e){}
  } else {
    document.addEventListener('DOMContentLoaded', ()=>{ try{ window.applyConfig(); }catch(e){} }, { once:true });
  }
})();
