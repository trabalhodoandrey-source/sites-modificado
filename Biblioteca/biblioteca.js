/* biblioteca.js - robusto: library UI + navigation/sidebar handlers
   Agora persiste a biblioteca por usuário (users[].library) para evitar vazamento de dados.
*/

const STORAGE_KEY = 'games'; // fallback legacy (mantive para compatibilidade)
const SIDEBAR_KEY = 'sidebarMinimized';
const USERS_KEY = 'users';
const LOGGED_KEY = 'loggedUser';

/* ================== DOM REFS (defensivas) ================== */
const favStrip = document.getElementById('favStrip');
const favEmpty = document.getElementById('favEmpty');
const gamesGrid = document.getElementById('gamesGrid');
const gridEmpty = document.getElementById('gridEmpty');

const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const btnAdd = document.getElementById('btnAdd');

const modalBg = document.getElementById('modalBg');
const modalTitle = document.getElementById('modalTitle');
const fTitle = document.getElementById('fTitle');
const fCover = document.getElementById('fCover');
const fDesc = document.getElementById('fDesc');
const btnSave = document.getElementById('btnSave');
const btnCancel = document.getElementById('btnCancel');

const detailBg = document.getElementById('detailBg');
const detailCover = document.getElementById('detailCover');
const detailName = document.getElementById('detailName');
const detailDesc = document.getElementById('detailDesc');
const detailFav = document.getElementById('detailFav');
const detailLaunch = document.getElementById('detailLaunch');
const detailClose = document.getElementById('detailClose');

function nodeExists(name, node) {
  if (!node) console.warn(`biblioteca.js: elemento "${name}" não encontrado no DOM.`);
  return !!node;
}

/* ================== Helpers usuário / storage por usuário ================== */
function safeParse(str){
  try { return JSON.parse(str); } catch(e) { return null; }
}

function getUsersList(){
  return safeParse(localStorage.getItem(USERS_KEY)) || [];
}

// retorna { user, idx } ou null se não houver sessão válida
function getLoggedUserRecord(){
  const raw = localStorage.getItem(LOGGED_KEY);
  if (!raw) return null;
  const users = getUsersList();
  const parsed = safeParse(raw);
  if (parsed && typeof parsed === 'object') {
    // buscar por id se existir
    if (parsed.id) {
      const idx = users.findIndex(u => String(u.id) === String(parsed.id));
      if (idx !== -1) return { user: users[idx], idx };
    }
    // buscar por username/email como fallback
    const idx2 = users.findIndex(u => u.username === parsed.username || u.email === parsed.email);
    if (idx2 !== -1) return { user: users[idx2], idx: idx2 };
    return null;
  } else {
    // raw é string -> procurar por username/email
    const idx = users.findIndex(u => u.username === raw || u.email === raw);
    if (idx !== -1) return { user: users[idx], idx };
    return null;
  }
}

/* ================== STORAGE HELPERS (per-user) ================== */
function loadGames(){
  // tenta carregar biblioteca do usuário logado
  const rec = getLoggedUserRecord();
  if (rec && Array.isArray(rec.user.library)) {
    // devolve cópia (para evitar mutações acidentais)
    return JSON.parse(JSON.stringify(rec.user.library));
  }
  // fallback: usar chave global 'games' (compatibilidade)
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch (err){ console.error('biblioteca.js: falha ao ler games do localStorage (fallback):', err); return []; }
}

function saveGames(list){
  const rec = getLoggedUserRecord();
  if (rec) {
    // atualiza users[idx].library e salva lista inteira de users
    const users = getUsersList();
    users[rec.idx] = users[rec.idx] || {};
    users[rec.idx].library = list;
    try { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
    catch (err){ console.error('biblioteca.js: falha ao salvar biblioteca no users[]:', err); }
  } else {
    // fallback global
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
    catch (err){ console.error('biblioteca.js: falha ao salvar games no localStorage (fallback):', err); }
  }
}

function genId(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

/* ================== NORMALIZE / SAMPLE ================== */
function placeholderCover(){ return 'https://via.placeholder.com/400x240?text=Cover'; }

function normalizeAndFix(){
  const list = loadGames() || [];
  let changed = false;
  for (let g of list) {
    if (!g.id) { g.id = genId(); changed = true; }
    if (typeof g.favorite === 'undefined') { g.favorite = false; changed = true; }
    if (!g.created) { g.created = Date.now(); changed = true; }
    g.title = g.title || 'Sem título';
    g.cover = g.cover || placeholderCover();
    g.desc = g.desc || '';
  }
  if (changed) saveGames(list);
  return list;
}

/*
  IMPORTANTE: removi a criação automática de amostras aqui - a biblioteca do usuário
  não é mais populada com jogos de teste. Se a lista estiver vazia, ficará vazia
  até o usuário adicionar manualmente.
*/
function ensureSampleData(){
  // apenas normaliza e retorna a lista existente; não cria registros de teste
  return normalizeAndFix();
}

/* ================== UTIL ================== */
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/* ================== RENDER ================== */
function renderFavorites(list){
  if (!favStrip) return;
  const favs = list.filter(g => g.favorite);
  favStrip.innerHTML = '';
  if (favs.length === 0) {
    if (favEmpty) favEmpty.style.display = 'block';
    favStrip.style.display = 'none';
    return;
  } else {
    if (favEmpty) favEmpty.style.display = 'none';
    favStrip.style.display = 'flex';
  }
  favs.forEach(g => {
    const div = document.createElement('div');
    div.className = 'fav-card';
    div.innerHTML = `
      <img src="${escapeHtml(g.cover)}" alt="${escapeHtml(g.title)}" />
      <div class="fav-body"><div class="title">${escapeHtml(g.title)}</div></div>
      <div class="fav-star" data-id="${g.id}" title="${g.favorite ? 'Remover favorito' : 'Marcar favorito'}" aria-label="Toggle favorito">★</div>
    `;
    const favBody = div.querySelector('.fav-body');
    if (favBody) favBody.addEventListener('click', () => openDetails(g.id));
    favStrip.appendChild(div);
  });
}

function renderGrid(list, filters = {q:'', sort:'fav'}) {
  if (!gamesGrid) return;
  const q = (filters.q || '').toLowerCase().trim();
  let result = list.filter(g => {
    if (!q) return true;
    return (g.title && g.title.toLowerCase().includes(q)) || (g.desc && g.desc.toLowerCase().includes(q));
  });

  const sort = filters.sort || 'fav';
  if (sort === 'az') result.sort((a,b)=> (a.title||'').localeCompare(b.title||''));
  else if (sort === 'za') result.sort((a,b)=> (b.title||'').localeCompare(a.title||''));
  else if (sort === 'recent') result.sort((a,b)=> (b.created||0) - (a.created||0));
  else result.sort((a,b)=> (b.favorite?1:0) - (a.favorite?1:0));

  gamesGrid.innerHTML = '';
  if (result.length === 0) {
    if (gridEmpty) gridEmpty.style.display = 'block';
    return;
  } else if (gridEmpty) gridEmpty.style.display = 'none';

  result.forEach(g => {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.setAttribute('role','listitem');
    card.innerHTML = `
      <img src="${escapeHtml(g.cover)}" alt="${escapeHtml(g.title)}" />
      <div class="game-info">
        <div class="game-title">${escapeHtml(g.title)}</div>
        <div class="card-actions">
          <button class="star ${g.favorite ? '' : 'inactive'}" data-id="${g.id}" title="${g.favorite ? 'Remover favorito' : 'Marcar favorito'}">★</button>
          <button class="btn small open" data-id="${g.id}">Detalhes</button>
          <button class="btn small edit" data-id="${g.id}">Editar</button>
          <button class="btn small del" data-id="${g.id}">Apagar</button>
        </div>
      </div>
    `;
    const img = card.querySelector('img');
    if (img) img.addEventListener('click', () => openDetails(g.id));
    gamesGrid.appendChild(card);
  });
}

/* ================== AÇÕES / DELEGATION ================== */
function attachDelegation(){
  if (favStrip) {
    favStrip.addEventListener('click', (e) => {
      const id = e.target.dataset?.id;
      if (!id) return;
      toggleFavorite(id);
    });
  }

  if (gamesGrid) {
    gamesGrid.addEventListener('click', (e) => {
      const t = e.target;
      const id = t.dataset?.id;
      if (!t.classList) return;

      if (t.classList.contains('star')) { if (id) toggleFavorite(id); }
      else if (t.classList.contains('open')) { if (id) openDetails(id); }
      else if (t.classList.contains('edit')) { if (id) openEditor(id); }
      else if (t.classList.contains('del')) { if (id) deleteGame(id); }
    });
  }
}

/* Toggle favorite, delete, editor, details */
function toggleFavorite(id){
  if (!id) return;
  const list = loadGames();
  const g = list.find(x=>x.id === id);
  if(!g) return;
  g.favorite = !g.favorite;
  saveGames(list);
  refresh();
}

function deleteGame(id){
  if(!id) return;
  if(!confirm('Apagar jogo da biblioteca?')) return;
  let list = loadGames();
  list = list.filter(x=>x.id !== id);
  saveGames(list);
  refresh();
}

let editingId = null;
function openEditor(id = null){
  editingId = id;
  if (!modalBg) return;
  if (id) {
    const g = loadGames().find(x=>x.id === id);
    if(!g) return alert('Jogo não encontrado');
    if (modalTitle) modalTitle.textContent = 'Editar jogo';
    if (fTitle) fTitle.value = g.title || '';
    if (fCover) fCover.value = g.cover || '';
    if (fDesc) fDesc.value = g.desc || '';
  } else {
    if (modalTitle) modalTitle.textContent = 'Adicionar jogo';
    if (fTitle) fTitle.value = '';
    if (fCover) fCover.value = '';
    if (fDesc) fDesc.value = '';
  }
  modalBg.style.display = 'flex';
  modalBg.setAttribute('aria-hidden','false');
  if (fTitle) fTitle.focus();
}
function closeEditor(){
  if (!modalBg) return;
  modalBg.style.display = 'none';
  modalBg.setAttribute('aria-hidden','true');
  editingId = null;
}

if (btnSave) {
  btnSave.addEventListener('click', ()=> {
    const title = (fTitle?.value || '').trim();
    const cover = (fCover?.value || '').trim();
    const desc = (fDesc?.value || '').trim();
    if(!title){ alert('Informe o nome do jogo.'); return; }
    const list = loadGames();
    if (editingId) {
      const idx = list.findIndex(x=>x.id === editingId);
      if(idx === -1) return alert('Registro não encontrado');
      list[idx].title = title; list[idx].cover = cover || placeholderCover(); list[idx].desc = desc;
    } else {
      list.push({ id: genId(), title, cover: cover || placeholderCover(), desc, favorite: false, created: Date.now() });
    }
    saveGames(list);
    closeEditor();
    refresh();
  });
}
if (btnCancel) btnCancel.addEventListener('click', closeEditor);

function openDetails(id){
  if (!detailBg) return;
  const g = loadGames().find(x=>x.id === id);
  if(!g) return alert('Jogo não encontrado');
  if (detailCover) detailCover.src = g.cover || placeholderCover();
  if (detailCover) detailCover.alt = g.title || 'Capa';
  if (detailName) detailName.textContent = g.title || '';
  if (detailDesc) detailDesc.textContent = g.desc || 'Sem descrição.';
  if (detailFav) { detailFav.textContent = g.favorite ? 'Desfavoritar' : 'Favoritar'; detailFav.dataset.id = g.id; }
  if (detailLaunch) detailLaunch.dataset.id = g.id;
  detailBg.style.display = 'flex';
  detailBg.setAttribute('aria-hidden','false');
}
if (detailClose) detailClose.addEventListener('click', ()=>{ detailBg.style.display='none'; detailBg.setAttribute('aria-hidden','true'); });

if (detailFav) {
  detailFav.addEventListener('click', (e)=> {
    const id = e.target.dataset.id;
    if(!id) return;
    toggleFavorite(id);
    const g = loadGames().find(x=>x.id === id);
    if(g) e.target.textContent = g.favorite ? 'Desfavoritar' : 'Favoritar';
  });
}
if (detailLaunch) {
  detailLaunch.addEventListener('click', (e)=> {
    const id = e.target.dataset.id;
    alert('Abrindo jogo (simulação): ' + id);
  });
}

/* ================== SEARCH & SORT ================== */
function attachSearchSort(){
  if (searchInput) searchInput.addEventListener('input', () => refresh());
  if (sortSelect) sortSelect.addEventListener('change', () => refresh());
}

/* ================== REFRESH ================== */
function refresh(){
  const list = normalizeAndFix();
  const q = searchInput?.value || '';
  const sort = sortSelect?.value || 'fav';
  renderFavorites(list);
  renderGrid(list, { q, sort });
}

/* ================== GLOBAL HANDLERS (modal close, Esc) ================== */
function attachGlobalHandlers(){
  window.addEventListener('click', (e) => {
    if (modalBg && e.target === modalBg) closeEditor();
    if (detailBg && e.target === detailBg) { detailBg.style.display='none'; detailBg.setAttribute('aria-hidden','true'); }
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (modalBg && modalBg.style.display === 'flex') closeEditor();
      if (detailBg && detailBg.style.display === 'flex') { detailBg.style.display='none'; detailBg.setAttribute('aria-hidden','true'); }
    }
  });
}

/* ================== INIT (não chamar antes do DOM ready) ================== */
function init(){
  // aplica config do usuário (se existe applyConfig)
  if (typeof window.applyConfig === 'function') {
    try { window.applyConfig(); } catch(e) { /* ignore */ }
  }

  // NÃO cria dados de teste — apenas normaliza os registros existentes
  normalizeAndFix();

  attachDelegation();
  attachSearchSort();
  attachGlobalHandlers();
  if (btnAdd) btnAdd.addEventListener('click', ()=> openEditor(null));
  refresh();
  console.info('Biblioteca inicializada. games count =', loadGames().length);
}

/* ================== NAVIGATION / SIDEBAR HANDLERS ================== */
function attachNavHandlers(){
  try {
    const tabContainer = document.querySelector('.sidebar-tabs');
    const tabs = Array.from(document.querySelectorAll('.tab-btn'));
    const contents = Array.from(document.querySelectorAll('.tab-content'));
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.getElementById('toggleSidebarBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    function openTab(tabId){
      if(!tabId) return;
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      const btn = tabs.find(t => t.dataset && t.dataset.tab === tabId);
      if(btn) btn.classList.add('active');
      const cont = document.getElementById(tabId);
      if(cont) cont.classList.add('active');
    }

    const BIB_PAGE = '../biblioteca/biblioteca.html';

    if(tabContainer){
      tabContainer.addEventListener('click', (ev) => {
        const btn = ev.target.closest('.tab-btn');
        if(!btn) return;
        const tab = btn.dataset && btn.dataset.tab;
        if(!tab) return;

        if(tab === 'dashboard'){
          window.location.href = "../principal/principal.html";
          return;
        }

        if(tab === 'config'){
          window.location.href = "../config/config.html";
          return;
        }

        if(tab === 'biblioteca'){
          const localSection = document.getElementById('biblioteca');
          if(localSection){ openTab('biblioteca'); history.replaceState(null,'','#biblioteca'); return; }
          else { window.location.href = BIB_PAGE; return; }
        }

        if(tab === 'perfil'){ window.location.href = "../perfil/perfil.html"; return; }

        const section = document.getElementById(tab);
        if(section){ openTab(tab); history.replaceState(null,'',`#${tab}`); }
        else { window.location.href = `../principal/principal.html#${tab}`; }
      });
    } else {
      tabs.forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = btn.dataset && btn.dataset.tab;
          if(!tab) return;
          if(tab === 'dashboard'){ window.location.href = "../principal/principal.html"; return; }
          if(tab === 'biblioteca'){ const localSection = document.getElementById('biblioteca'); if(localSection){ openTab('biblioteca'); history.replaceState(null,'','#biblioteca'); return; } else { window.location.href = BIB_PAGE; return; } }
          if(tab === 'perfil'){ window.location.href = "../perfil/perfil.html"; return; }
          const section = document.getElementById(tab);
          if(section){ openTab(tab); history.replaceState(null,'',`#${tab}`); } else window.location.href = `../principal/principal.html#${tab}`;
        });
      });
    }

    if(window.location.hash){
      const h = window.location.hash.replace('#','');
      setTimeout(()=> { if(document.getElementById(h)) openTab(h); }, 30);
    }

    // Apply sidebar saved state (persistência)
    function applySidebarState(){
      if(!sidebar) return;
      const v = localStorage.getItem(SIDEBAR_KEY);
      if(v === 'true') sidebar.classList.add('minimized');
      else sidebar.classList.remove('minimized');
    }
    applySidebarState();

    function toggleSidebar(save = true){
      if(!sidebar) return;
      sidebar.classList.toggle('minimized');
      if(save) localStorage.setItem(SIDEBAR_KEY, sidebar.classList.contains('minimized'));
    }
    if(toggleBtn) toggleBtn.addEventListener('click', ()=> toggleSidebar(true));

    document.addEventListener('keydown', (e) => {
      if((e.key === 'm' || e.key === 'M') && (e.altKey || e.ctrlKey)) toggleSidebar(true);
    });

    if(logoutBtn){
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('loggedUser');
        window.location.href = "../entrada/entrada.html";
      });
    }

    console.info('biblioteca.js: handlers de navegação/sidebar instalados.');
  } catch (err) {
    console.error('biblioteca.js: erro ao instalar handlers de navegação:', err);
  }
}

/* ================== DOMContentLoaded: inicializa tudo ================== */
document.addEventListener('DOMContentLoaded', () => {
  attachNavHandlers();
  init();

  // proteção extra: botão Início
  const btnInicio = document.querySelector('[data-tab="dashboard"]');
  if (btnInicio) {
    btnInicio.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      window.location.href = "../principal/principal.html";
    });
  }
});

/* expose refresh para debug */
window.Biblioteca = window.Biblioteca || {};
window.Biblioteca.refresh = refresh;
