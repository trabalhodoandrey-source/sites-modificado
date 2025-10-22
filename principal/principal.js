// principal.js - painel principal (completo com loja Steam-like)
(function(){
  const SIDEBAR_KEY = 'sidebarMinimized';
  const LOGGED_KEY = 'loggedUser';
  const USERS_KEY = 'users';
  const STORE_KEY = 'storeGames';

  // utils
  function safeParse(v){ try { return JSON.parse(v); } catch(e){ return null; } }
  function isObject(v){ return v && typeof v === 'object' && !Array.isArray(v); }
  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // users helper
  function getUsersArray(){ return safeParse(localStorage.getItem(USERS_KEY)) || []; }
  function persistUsers(arr){ try { localStorage.setItem(USERS_KEY, JSON.stringify(arr)); } catch(e){ console.warn('persistUsers', e); } }

  function getFullLoggedUser(){
    try {
      const raw = localStorage.getItem(LOGGED_KEY);
      if(!raw) return null;
      const parsed = safeParse(raw);
      const users = getUsersArray();
      if(isObject(parsed)){
        if(parsed.id) return users.find(u=>String(u.id)===String(parsed.id)) || parsed;
        if(parsed.username) return users.find(u=>u.username===parsed.username || u.email===parsed.username) || parsed;
        if(parsed.email) return users.find(u=>u.email===parsed.email) || parsed;
        return parsed;
      }
      return users.find(u=>u.username===raw || u.email===raw) || raw;
    } catch(e){ console.warn('getFullLoggedUser', e); return null; }
  }

  // UI: username display
  function renderUserDisplayName(userLike){
    const el = document.getElementById('userDisplay');
    if(!el) return;
    let name = '';
    if(!userLike) name = '';
    else if(isObject(userLike)) name = userLike.displayName || userLike.username || userLike.email || '';
    else name = String(userLike);
    el.textContent = name ? `Bem-vindo, ${name}!` : 'Bem-vindo!';
  }

  // sidebar
  function applySidebarState(){
    const sidebar = document.querySelector('.sidebar');
    if(!sidebar) return;
    const v = localStorage.getItem(SIDEBAR_KEY);
    if (v === 'true') sidebar.classList.add('minimized'); else sidebar.classList.remove('minimized');
  }

  // tabs helpers
  function activateLocalTab(tabId){
    if(!tabId) return;
    const btns = Array.from(document.querySelectorAll('.tab-btn'));
    const contents = Array.from(document.querySelectorAll('.tab-content'));
    btns.forEach(b => b.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    const btn = btns.find(x => x.dataset && x.dataset.tab === tabId);
    if(btn) btn.classList.add('active');
    const section = document.getElementById(tabId);
    if(section) section.classList.add('active');
    try { history.replaceState(null,'', `#${tabId}`); } catch(e){}
  }

  function restoreDefaultIfNoActive(){
    try {
      const anyActive = Array.from(document.querySelectorAll('.tab-content')).some(c => c.classList.contains('active'));
      if(anyActive) return false;
      let def = document.getElementById('loja') || document.getElementById('dashboard') || document.querySelector('.tab-content');
      if(def){
        document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
        const btn = Array.from(document.querySelectorAll('.tab-btn')).find(x => x.dataset && x.dataset.tab === def.id);
        if(btn) btn.classList.add('active');
        def.classList.add('active');
        return true;
      }
    } catch(e){ console.warn('restoreDefaultIfNoActive', e); }
    return false;
  }

  function refreshUI(){
    const fullUser = getFullLoggedUser() || safeParse(localStorage.getItem(LOGGED_KEY)) || localStorage.getItem(LOGGED_KEY);
    renderUserDisplayName(fullUser);
    applySidebarState();
    try { window.dispatchEvent(new CustomEvent('gamevault.refresh')); } catch(e){}
    setTimeout(restoreDefaultIfNoActive, 50);
  }

  // idempotent listener attach
  let listenersAttached = false;
  function attachListenersOnce(){
    if(listenersAttached) return;
    listenersAttached = true;

    const tabs = Array.from(document.querySelectorAll('.tab-btn'));
    const contents = Array.from(document.querySelectorAll('.tab-content'));

    function openTabLocal(tabId){
      if(!tabId) return;
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      const btn = tabs.find(t => t.dataset && t.dataset.tab === tabId);
      if(btn) btn.classList.add('active');
      const sec = document.getElementById(tabId);
      if(sec) sec.classList.add('active');
      setTimeout(()=> restoreDefaultIfNoActive(), 40);
    }

    tabs.forEach(btn => {
      if(!btn._pv_attached){
        btn.addEventListener('click', (e) => {
          e.preventDefault(); e.stopPropagation();
          const tab = btn.dataset && btn.dataset.tab;
          if(!tab) return;
          if(btn.classList.contains('active')){
            const sec = document.getElementById(tab);
            if(sec && !sec.classList.contains('active')) sec.classList.add('active');
            return;
          }
          // external pages
          if(tab === 'biblioteca'){ window.location.href = "../biblioteca/biblioteca.html"; return; }
          if(tab === 'perfil'){ window.location.href = "../perfil/perfil.html"; return; }
          if(tab === 'config'){ window.location.href = "../config/config.html"; return; }
          // local
          const section = document.getElementById(tab);
          if(section){ openTabLocal(tab); refreshUI(); } else { window.location.href = `../principal/principal.html#${tab}`; }
        });
        btn._pv_attached = true;
      }
    });

    // toggle sidebar
    const toggleBtn = document.getElementById('toggleSidebarBtn');
    if(toggleBtn && !toggleBtn._pv_attached){
      toggleBtn.addEventListener('click', ()=> {
        const sidebar = document.querySelector('.sidebar');
        if(!sidebar) return;
        sidebar.classList.toggle('minimized');
        localStorage.setItem(SIDEBAR_KEY, sidebar.classList.contains('minimized'));
      });
      toggleBtn._pv_attached = true;
    }

    // logout
    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn && !logoutBtn._pv_attached){
      logoutBtn.addEventListener('click', ()=> {
        localStorage.removeItem(LOGGED_KEY);
        window.location.href = "../entrada/entrada.html";
      });
      logoutBtn._pv_attached = true;
    }

    // search -> biblioteca (local filter handled by store system)
    const searchInput = document.getElementById('principalSearch');
    if(searchInput && !searchInput._pv_attached){
      searchInput.addEventListener('keydown', (e)=> {
        if(e.key === 'Enter'){
          const q = (searchInput.value||'').trim();
          const url = "../biblioteca/biblioteca.html" + (q ? ("?q="+encodeURIComponent(q)) : "");
          window.location.href = url;
        } else {
          // live filter — dispatch event that store system listens to
          try { window.dispatchEvent(new CustomEvent('gamevault.search', { detail: { q: searchInput.value || '' } })); } catch(e){}
        }
      });
      // also emit on input for immediate filtering
      searchInput.addEventListener('input', ()=> {
        try { window.dispatchEvent(new CustomEvent('gamevault.search', { detail: { q: searchInput.value || '' } })); } catch(e){}
      });
      searchInput._pv_attached = true;
    }

    // storage events
    window.addEventListener('storage', (ev) => {
      if(!ev.key) return;
      if(ev.key === SIDEBAR_KEY) { applySidebarState(); return; }
      if([USERS_KEY, LOGGED_KEY, STORE_KEY].includes(ev.key)) refreshUI();
    });

    window.addEventListener('pageshow', refreshUI);
    window.addEventListener('focus', refreshUI);
    window.addEventListener('hashchange', ()=> {
      const h = window.location.hash.replace('#','');
      if(h) activateLocalTab(h);
      setTimeout(restoreDefaultIfNoActive, 40);
      refreshUI();
    });
  }

  // ==================== LOJA COMPLETA ====================
  function getStoreGames(){ return safeParse(localStorage.getItem(STORE_KEY)) || []; }
  function findStoreGame(id){ return getStoreGames().find(g => String(g.id) === String(id)) || null; }

  // Initialize sample games if none exist
  function ensureSampleStore(){
    const current = getStoreGames();
    if (current && current.length > 0) return current;

    const sampleGames = [
  // RPGs e Ação-Aventura
  {
    id: '1',
    title: 'Elden Ring',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1245620/header.jpg?t=1748630546',
    desc: 'Um RPG de ação em mundo aberto ambientado em um universo fantástico criado por Hidetaka Miyazaki e George R. R. Martin.',
    featured: true,
    onSale: false,
    popularity: 98,
    prices: { steam: 249.99, epic: 239.99, xbox: 259.99 }
  },
  {
    id: '2', 
    title: 'The Witcher 3: Wild Hunt',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/292030/ad9240e088f953a84aee814034c50a6a92bf4516/header.jpg?t=1758877408',
    desc: 'Enquanto a guerra assola todos os Reinos do Norte, você enfrenta o maior conflito de sua vida.',
    featured: true,
    onSale: true,
    popularity: 94,
    prices: { steam: 129.99, epic: 99.96, xbox: 190.00 }
  },
  {
    id: '3',
    title: 'Cyberpunk 2077',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1091500/e9047d8ec47ae3d94bb8b464fb0fc9e9972b4ac7/header.jpg?t=1756209867',
    desc: 'Um RPG de mundo aberto ambientado em Night City, uma megalópole obcecada por poder, glamour e modificações corporais.',
    featured: true,
    onSale: true,
    popularity: 94,
    prices: { steam: 199.99, epic: 189.99, xbox: 219.99 }
  },
  {
    id: '4',
    title: 'Baldur\'s Gate 3',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1086940/48a2fcbda8565bb45025e98fd8ebde8a7203f6a0/header.jpg?t=1759825106',
    desc: 'é um RPG de fantasia que se passa no universo de Dungeons & Dragons, onde os jogadores criam um personagem e embarcam em uma jornada para remover uma larva parasita de suas cabeças',
    featured: true,
    onSale: false,
    popularity: 99,
    prices: { steam: 199.99, epic: 149.99, xbox: 169.99 }
  },
  {
    id: '5',
    title: 'Skyrim Special Edition',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/489830/header.jpg?t=1753715778',
    desc: 'O vencedor de mais de 200 prêmios de Jogo do Ano, Skyrim chega em uma edição especial com gráficos remasterizados.',
    featured: false,
    onSale: true,
    popularity: 95,
    prices: { steam: 99.99, epic: 89.99, xbox: 119.99 }
  },

  // Indies e Jogos Únicos
  {
    id: '6',
    title: 'Hollow Knight',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/367520/header.jpg?t=1695270428',
    desc: 'Uma aventura de ação clássica em estilo 2D em um vasto mundo interligado de insetos e heróis.',
    featured: true,
    onSale: true,
    popularity: 96,
    prices: { steam: 46.99, epic: null, xbox: 46.99 }
  },
  {
    id: '7',
    title: 'Stardew Valley',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/413150/capsule_184x69.jpg?t=1754692865',
    desc: 'Um jogo de simulação de fazenda onde você herda a antiga fazenda de seu avô.',
    featured: false,
    onSale: true,
    popularity: 95,
    prices: { steam: 24.99, epic: 24.99, xbox: 29.00 }
  },
  {
    id: '8',
    title: 'Hades',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1145360/header.jpg?t=1758127023',
    desc: 'Roguelike de ação que coloca você no papel do imortal Príncipe do Submundo.',
    featured: false,
    onSale: true,
    popularity: 93,
    prices: { steam: 73.99, epic: 73.99, xbox: 97.22 }
  },
  {
    id: '9',
    title: 'Celeste',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/504230/header.jpg?t=1714089525',
    desc: 'Um jogo de plataforma sobre escalar uma montanha, da desenvolvedora de TowerFall.',
    featured: true,
    onSale: true,
    popularity: 92,
    prices: { steam: 59.99, epic: 36.99, xbox: 41.01 }
  },
  {
    id: '10',
    title: 'Undertale',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/391540/header.jpg?t=1757349115',
    desc: 'Um RPG onde você não precisa matar ninguém. O mundo está cheio de monstros e suas escolhas importam.',
    featured: false,
    onSale: true,
    popularity: 91,
    prices: { steam: 5.99, epic: null, xbox: null }
  },

  // Ação e Aventura AAA
  {
    id: '11',
    title: 'God of War',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1593500/header.jpg?t=1750949016',
    desc: 'Com a vingança contra os Deuses do Olimpo no passado, Kratos agora vive no reino das divindades e monstros nórdicos.',
    featured: true,
    onSale: false,
    popularity: 99,
    prices: { steam: 199.99, epic: 249.90, xbox: 209.99 }
  },
  {
    id: '12',
    title: 'Red Dead Redemption 2',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1174180/capsule_231x87.jpg?t=1759502961',
    desc: 'América, 1899. Arthur Morgan e a gangue Van der Linde são forçados a fugir.',
    featured: true,
    onSale: false,
    popularity: 98,
    prices: { steam: 299.90, epic: 299, xbox: 198.90 }
  },
  {
    id: '13',
    title: 'Grand Theft Auto V',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/3240220/a318bd9affe8eee32984b18794b273c256e9b2d6/capsule_231x87.jpg?t=1753974947',
    desc: 'Um mundo aberto gigantesco onde três criminosos muito diferentes lidam com pressões da vida.',
    featured: false,
    onSale: true,
    popularity: 97,
    prices: { steam: 149.90, epic: 149.90, xbox: 149.90 }
  },
  {
    id: '14',
    title: 'Marvel\'s Spider-Man Remastered',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1817070/header.jpg?t=1750955096',
    desc: 'O Homem-Aranha da Marvel está de volta em uma aventura eletrizante.',
    featured: true,
    onSale: false,
    popularity: 96,
    prices: { steam: 249.90, epic: 249.90, xbox: null }
  },
  {
    id: '15',
    title: 'Horizon Zero Dawn™ Remastered',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2561580/header.jpg?t=1750952943',
    desc: 'Em um mundo pós-apocalíptico dominado por máquinas, uma caçadora chamada Aloy embarca em uma jornada.',
    featured: false,
    onSale: true,
    popularity: 94,
    prices: { steam: 249.50, epic: null, xbox: null }
  },

  // FPS e Tiro
  {
    id: '16',
    title: 'DOOM Eternal',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/782330/header.jpg?t=1755109910',
    desc: 'Os exércitos do inferno invadiram a Terra. Torne-se o Slayer em uma campanha épica em vários mundos.',
    featured: false,
    onSale: true,
    popularity: 93,
    prices: { steam: 149.00, epic: 149.00, xbox: 149.00 }
  },
  {
    id: '17',
    title: 'Call of Duty: Modern Warfare II',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/3595230/ce4d5e53b36cb9d3c4309d1df72bf8663bbbc7ef/header.jpg?t=1755227025',
    desc: 'A sequência do relançamento de 2019 que apresenta uma campanha cinematográfica e multiplayer inovador.',
    featured: true,
    onSale: false,
    popularity: 95,
    prices: { steam: 299.99, epic: 289.99, xbox: 309.99 }
  },
  {
    id: '18',
    title: 'Counter-Strike 2',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/730/header.jpg?t=1749053861',
    desc: 'A maior evolução técnica na história do Counter-Strike, com overhaul completo do motor gráfico.',
    featured: false,
    onSale: false,
    popularity: 99,
    prices: { steam: 0, epic: null, xbox: null }
  },
  {
    id: '19',
    title: 'Overwatch 2',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2357570/087a8e54a6fa8cd090cf4d40316938d4791b4440/header_alt_assets_17.jpg?t=1760464802',
    desc: 'Um FPS de heróis em equipe gratuito, com um elenco diversificado de heróis poderosos.',
    featured: false,
    onSale: false,
    popularity: 92,
    prices: { steam: 0, epic: 0, xbox: 0 }
  },
  {
    id: '20',
    title: 'Apex Legends',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1172470/eafea59b59bc43fdfe4c7baeeadf45f26a4872b7/header.jpg?t=1754578148',
    desc: 'Um battle royale gratuito onde combatentes lendários com habilidades poderosas lutam pela fama.',
    featured: false,
    onSale: false,
    popularity: 96,
    prices: { steam: 0, epic: null, xbox: 0 }
  },

  // Estratégia e Simulação
  {
    id: '21',
    title: 'Civilization VI',
    cover: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/289070/header.jpg?t=1740607040',
    desc: 'Construa um império para resistir ao teste do tempo no maior jogo de estratégia da Civilization.',
    featured: false,
    onSale: true,
    popularity: 90,
    prices: { steam: 129.99, epic: 129.99, xbox: 129.99 }
  },
  {
    id: '22',
    title: 'Cities: Skylines',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/255710/header.jpg?t=1758712642',
    desc: 'Simulador de cidades moderno que levanta novas questões sobre engenharia e administração.',
    featured: false,
    onSale: true,
    popularity: 89,
    prices: { steam: 107.99, epic: 107.99, xbox: 147.45 }
  },
  {
    id: '23',
    title: 'Total War: Warhammer III',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1142710/header.jpg?t=1756465756',
    desc: 'A batalha épica pela sobrevivência chega ao seu clímax nesta conclusão da trilogia Total War: WARHAMMER.',
    featured: false,
    onSale: false,
    popularity: 91,
    prices: { steam: 229.99, epic: 219.99, xbox: 239.99 }
  },
  {
    id: '24',
    title: 'XCOM 2',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/268500/header.jpg?t=1646157374',
    desc: 'A humanidade perdeu a guerra contra os alienígenas. Agora é a resistência contra a ocupação.',
    featured: false,
    onSale: true,
    popularity: 88,
    prices: { steam: 99.90, epic: 99.90, xbox: 360.00 }
  },
  {
    id: '25',
    title: 'Crusader Kings III',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1158310/header.jpg?t=1759928394',
    desc: 'Amor, guerra, traição e intriga. Escreva a história de sua própria dinastia medieval.',
    featured: false,
    onSale: true,
    popularity: 87,
    prices: { steam: 179.99, epic: null, xbox: 184.95 }
  },

  // Esportes e Corrida
  {
    id: '26',
    title: 'Half-Life',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/70/header.jpg?t=1745368462',
    desc: 'o título de estreia da Valve combina ação e aventura com uma tecnologia premiada para criar um mundo assustadoramente realístico onde os jogadores devem pensar para sobreviver.',
    featured: true,
    onSale: true,
    popularity: 89,
    prices: { steam: 20.69, epic: null, xbox: null }
  },
  {
    id: '27',
    title: 'Rocket League',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/252950/fdbbfa1aa74c0c52df114e5a4b50253d4bedc761/header_alt_assets_13.jpg?t=1758121340',
    desc: 'Futebol com carros movidos a foguete! Jogue futebol, basquete e hóquei com veículos personalizáveis.',
    featured: false,
    onSale: false,
    popularity: 94,
    prices: { steam: 0, epic: 0, xbox: 0 }
  },
  {
    id: '28',
    title: 'Forza Horizon 5',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1551360/header.jpg?t=1746471508',
    desc: 'Sua maior aventura automotiva te espera! Explore o mundo aberto vibrante do México.',
    featured: true,
    onSale: false,
    popularity: 95,
    prices: { steam: 249.99, epic: null, xbox: 249.99 }
  },
  {
    id: '29',
    title: 'Hollow Knight: Silksong',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1030300/7983574d464e6559ac7e24275727f73a8bcca1f3/header.jpg?t=1756994410',
    desc: 'Descubra um reino vasto e amaldiçoado em Hollow Knight: Silksong! Explore, lute e sobreviva enquanto você ascende ao pico de uma terra governada pela seda e por canções.',
    featured: true,
    onSale: true,
    popularity: 99,
    prices: { steam: 59.99, epic: null, xbox: 59.99 }
  },
  {
    id: '30',
    title: 'OMORI',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1150690/header.jpg?t=1671584768',
    desc: 'Explore um mundo estranho cheio de amigos e inimigos coloridos. Quando chegar a hora, o caminho que você escolher determinará seu destino... e talvez o destino de outros também.',
    featured: true,
    onSale: true,
    popularity: 96,
    prices: { steam: 37.99, epic: null, xbox: null }
  },

  // Terror e Suspense
  {
    id: '31',
    title: 'Resident Evil 4',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2050650/header.jpg?t=1736385712',
    desc: 'Sobrevivência é apenas o começo. Seis anos se passaram desde o desastre biológico em Raccoon City. Leon S. Kennedy, um dos sobreviventes, segue o rastro da raptada filha do presidente até uma vila europeia isolada, onde há algo terrivelmente errado com os habitantes.',
    featured: false,
    onSale: false,
    popularity: 97,
    prices: { steam: 169.00, epic: null, xbox: 196.00 }
  },
  {
    id: '32',
    title: 'Dead Space',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1693980/header.jpg?t=1749125590',
    desc: 'O clássico de terror de sobrevivência e ficção científica está de volta, totalmente reformulado para oferecer uma experiência ainda mais imersiva, incluindo aprimoramentos visuais, de áudio e de jogabilidade, ao mesmo tempo em que se mantém fiel à emocionante visão do jogo original.',
    featured: false,
    onSale: false,
    popularity: 96,
    prices: { steam: 249.00, epic: 249, xbox: 339 }
  },
  {
    id: '33',
    title: 'The Last of Us Part I',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1888930/header.jpg?t=1750959031',
    desc: 'Reconstruído para PC, vivencie a emocionante história de Joel e Ellie em um mundo pós-apocalíptico.',
    featured: true,
    onSale: false,
    popularity: 98,
    prices: { steam: 249.90, epic: 249.90, xbox: null }
  },
  {
    id: '34',
    title: 'Alien: Isolation',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/214490/header.jpg?t=1728557065',
    desc: 'Terror de sobrevivência em primeira pessoa que captura o medo e tensão do filme original.',
    featured: false,
    onSale: true,
    popularity: 90,
    prices: { steam: 179.00, epic: 179, xbox: 179.00 }
  },
  {
    id: '35',
    title: 'Outlast',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/238320/header.jpg?t=1666817106',
    desc: 'Terror de sobrevivência em primeira pessoa onde você está completamente indefeso.',
    featured: false,
    onSale: true,
    popularity: 87,
    prices: { steam: 46.99, epic: 37.99, xbox: 57.99 }
  },

  // Mundo Aberto e Exploração
  {
    id: '36',
    title: 'Assassin\'s Creed Valhalla',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2208920/header.jpg?t=1754572990',
    desc: 'Torne-se Eivor, um lendário saqueador viking, e leve seu clã da Noruega para um novo começo na Inglaterra.',
    featured: false,
    onSale: true,
    popularity: 93,
    prices: { steam: 199.99, epic: 199.99, xbox: 279.95 }
  },
  {
    id: '37',
    title: 'No, I\'m not a Human',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/3180070/fadebc14211b17b5a6603926612ead9294cad9ce/header.jpg?t=1759743870',
    desc: 'ATENÇÃO. Não saias. Tranca a porta. Fecha as persianas. Deixa entrar apenas humanos. Elimina todos os Visitantes. Um horror angustiante sobre a paranoia do fim dos tempos.',
    featured: false,
    onSale: false,
    popularity: 99,
    prices: { steam: 46.99, epic: null, xbox: null }
  },
  {
    id: '38',
    title: 'Ghost of Tsushima',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/2215430/header.jpg?t=1759934400',
    desc: 'Em 1274, os mongóis lançam uma invasão brutal à ilha de Tsushima.',
    featured: true,
    onSale: false,
    popularity: 97,
    prices: { steam: 249.99, epic: 239.99, xbox: null }
  },
  {
    id: '39',
    title: 'Death Stranding',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1850570/header.jpg?t=1750697259',
    desc: 'Do aclamado criador Hideo Kojima, uma experiência que desafia gêneros em um mundo aberto pós-apocalíptico.',
    featured: false,
    onSale: true,
    popularity: 89,
    prices: { steam: 39.99, epic: 47.99, xbox: 159.00 }
  },
  {
    id: '40',
    title: 'No Man\'s Sky',
    cover: 'https://store-images.s-microsoft.com/image/apps.8628.68818099466568894.391e0700-449d-4430-a634-7339176aa70e.7a6198eb-67f2-4e83-99de-8ac8f185f01b?q=90&w=177&h=265',
    desc: 'Explore um universo infinito onde cada estrela é um sol iluminando um planeta que você pode visitar.',
    featured: false,
    onSale: true,
    popularity: 88,
    prices: { steam: 162.00, epic: null, xbox: 222.45 }
  },

  // Cooperativo e Multijogador
  {
    id: '41',
    title: 'It Takes Two',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1426210/header.jpg?t=1749142249',
    desc: 'Aventure-se no jogo cooperativo mais aclamado, feito exclusivamente para duas pessoas.',
    featured: true,
    onSale: true,
    popularity: 95,
    prices: { steam: 199.00, epic: 199, xbox: 199.00 }
  },
  {
    id: '42',
    title: 'Valheim',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/892970/de0bdcf6c008c508a79d8e75eb91fc67f4bebd5d/header.jpg?t=1757486247',
    desc: 'Um jogo de exploração e sobrevivência inspirado na mitologia viking para 1-10 jogadores.',
    featured: false,
    onSale: true,
    popularity: 94,
    prices: { steam: 79.09, epic: null, xbox: 79.95 }
  },
  {
    id: '43',
    title: 'Deep Rock Galactic',
    cover: 'https://store-images.s-microsoft.com/image/apps.52173.13626568325427111.b79d00fc-6d85-4196-a23a-681bd2582706.49ab59ce-747c-46b6-aaf1-336f25a2636a?q=90&w=177&h=265',
    desc: 'Jogo cooperativo de mineração e combate para 1-4 anões espaciais.',
    featured: false,
    onSale: true,
    popularity: 92,
    prices: { steam: 57.99, epic: null, xbox: 57.45 }
  },
  {
    id: '44',
    title: 'Sea of Thieves',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1172620/header.jpg?t=1755260861',
    desc: 'Aventura multijogador onde você e seus amigos se tornam piratas em busca de tesouros.',
    featured: false,
    onSale: false,
    popularity: 91,
    prices: { steam: 179.00, epic: null, xbox: 199.99 }
  },
  {
    id: '45',
    title: 'Fall Guys',
    cover: 'https://store-images.s-microsoft.com/image/apps.9916.14285042010965430.749d90f0-b4ea-409c-9c82-00ed83f65c96.96222148-9510-4dad-9cda-0570627fd146?q=90&w=177&h=265',
    desc: 'Battle royale gratuito e caótico onde você compete com outros jogadores em rounds absurdos.',
    featured: false,
    onSale: false,
    popularity: 90,
    prices: { steam: 0, epic: 0, xbox: 0 }
  },

  // Clássicos e Remasters
  {
    id: '46',
    title: 'Final Fantasy VII Remake',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1462040/header.jpg?t=1746070920',
    desc: 'A reimaginação do clássico RPG que redefine um ícone para uma nova geração.',
    featured: true,
    onSale: false,
    popularity: 96,
    prices: { steam: 174.90, epic: 174.90, xbox: 299.90 }
  },
  {
    id: '47',
    title: 'Mass Effect Legendary Edition',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1328670/header.jpg?t=1748949885',
    desc: 'A trilogia Mass Effect remasterizada com todos os DLCs em uma única coleção.',
    featured: false,
    onSale: true,
    popularity: 94,
    prices: { steam: 249.00, epic: 253.26, xbox: 299.00 }
  },
  {
    id: '48',
    title: 'GRIS',
    cover: 'https://store-images.s-microsoft.com/image/apps.47826.13625693263060421.b5379d86-b985-4508-ad2a-8af4b40a9fcd.d94da6c9-4a9d-4b6f-bad7-b0fe27da32bb?q=90&w=80&h=128',
    desc: 'Inclui BioShock, BioShock 2 e BioShock Infinite com todo o conteúdo single-player.',
    featured: false,
    onSale: true,
    popularity: 94,
    prices: { steam: 49.99, epic: null, xbox: 62.45 }
  },
  {
    id: '49',
    title: 'Half-Life: Alyx',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/546560/header.jpg?t=1673391297',
    desc: 'O retorno de Half-Life em realidade virtual, ambientado entre os eventos de Half-Life e Half-Life 2.',
    featured: true,
    onSale: false,
    popularity: 98,
    prices: { steam: 162, epic: null, xbox: null }
  },
  {
    id: '50',
    title: 'Portal 2',
    cover: 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/620/header.jpg?t=1745363004',
    desc: 'Sequel do aclamado Portal, com nova jogabilidade, história e modo cooperativo.',
    featured: true,
    onSale: true,
    popularity: 98,
    prices: { steam: 32.99, epic: null, xbox: 69.00 }
  }
];

    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(sampleGames));
    } catch(e) {
      console.warn('Could not save sample games to localStorage', e);
    }
    
    return sampleGames;
  }

  // Utility functions for store
  function formatPrice(price) {
    if (price === null || typeof price === 'undefined') return '—';
    if (Number(price) === 0) return 'Gratuito';
    const n = Number(price);
    if (Number.isNaN(n)) return '—';
    return 'R$ ' + n.toFixed(2).replace('.', ',');
  }

  function getLowestPrice(pricesObj) {
    if (!pricesObj || typeof pricesObj !== 'object') return null;
    const vals = Object.values(pricesObj)
      .map(v => (v === null || typeof v === 'undefined' ? NaN : Number(v)))
      .filter(v => !Number.isNaN(v));
    if (!vals.length) return null;
    return Math.min(...vals);
  }

  // ==================== HERO CAROUSEL ====================
  let heroState = {
    index: 0,
    slides: [],
    autoplayTimer: null,
    resumeTimer: null,
    isPausedByUser: false
  };

  function buildHeroCarousel() {
    const heroContainer = document.getElementById('heroCarousel');
    if (!heroContainer) return;

    const featuredGames = getStoreGames().filter(game => game.featured).slice(0, 50);
    if (featuredGames.length === 0) return;

    heroContainer.innerHTML = '';
    heroState.slides = [];
    
    featuredGames.forEach((game, index) => {
      const slide = document.createElement('div');
      slide.className = 'hero-slide';
      slide.style.display = index === 0 ? 'block' : 'none';
      slide.style.position = 'relative';
      slide.style.width = '100%';
      slide.style.height = '400px';
      slide.style.borderRadius = '12px';
      slide.style.overflow = 'hidden';
      slide.style.cursor = 'pointer';

      const img = document.createElement('img');
      img.src = game.cover;
      img.alt = game.title;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';

      const overlay = document.createElement('div');
      overlay.style.position = 'absolute';
      overlay.style.bottom = '0';
      overlay.style.left = '0';
      overlay.style.right = '0';
      overlay.style.padding = '24px';
      overlay.style.background = 'linear-gradient(transparent, rgba(0,0,0,0.8))';
      overlay.style.color = 'white';

      const title = document.createElement('h3');
      title.textContent = game.title;
      title.style.margin = '0 0 8px 0';
      title.style.fontSize = '2rem';
      title.style.fontWeight = 'bold';

      const desc = document.createElement('p');
      desc.textContent = game.desc;
      desc.style.margin = '0';
      desc.style.fontSize = '1.1rem';
      desc.style.opacity = '0.9';
      desc.style.maxWidth = '70%';

      overlay.appendChild(title);
      overlay.appendChild(desc);
      slide.appendChild(img);
      slide.appendChild(overlay);

      // Click handler
      slide.addEventListener('click', () => {
        openGamePopupById(game.id);
      });

      heroContainer.appendChild(slide);
      heroState.slides.push(slide);
    });

    setupHeroNavigation();
    startAutoplay();
  }

  function setupHeroNavigation() {
    const prevBtn = document.getElementById('heroPrev');
    const nextBtn = document.getElementById('heroNext');

    if (prevBtn && !prevBtn._pv_attached) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        goToSlide(heroState.index - 1);
        pauseAutoplayTemporarily();
      });
      prevBtn._pv_attached = true;
    }

    if (nextBtn && !nextBtn._pv_attached) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        goToSlide(heroState.index + 1);
        pauseAutoplayTemporarily();
      });
      nextBtn._pv_attached = true;
    }

    // Keyboard navigation (only attach once)
    if (!document._pv_hero_keydown) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
          goToSlide(heroState.index - 1);
          pauseAutoplayTemporarily();
        } else if (e.key === 'ArrowRight') {
          goToSlide(heroState.index + 1);
          pauseAutoplayTemporarily();
        }
      });
      document._pv_hero_keydown = true;
    }
  }

  function goToSlide(index) {
    if (heroState.slides.length === 0) return;
    
    const totalSlides = heroState.slides.length;
    heroState.index = (index + totalSlides) % totalSlides;
    
    heroState.slides.forEach((slide, i) => {
      slide.style.display = i === heroState.index ? 'block' : 'none';
    });
  }

  function startAutoplay() {
    stopAutoplay();
    heroState.autoplayTimer = setInterval(() => {
      if (!heroState.isPausedByUser) {
        goToSlide(heroState.index + 1);
      }
    }, 5000);
  }

  function stopAutoplay() {
    if (heroState.autoplayTimer) {
      clearInterval(heroState.autoplayTimer);
      heroState.autoplayTimer = null;
    }
  }

  function pauseAutoplayTemporarily() {
    heroState.isPausedByUser = true;
    stopAutoplay();
    
    if (heroState.resumeTimer) {
      clearTimeout(heroState.resumeTimer);
    }
    
    heroState.resumeTimer = setTimeout(() => {
      heroState.isPausedByUser = false;
      startAutoplay();
    }, 8000);
  }

  // ==================== HORIZONTAL LISTS ====================
  function renderHorizontalLists() {
    const games = getStoreGames();
    
    // Recommended (mix of popular and recent)
    const recommended = [...games]
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 50);
    renderGameList('rec-list', recommended);
    
    // Popular (by popularity score)
    const popular = [...games]
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 50);
    renderGameList('pop-list', popular);
    
    // On Sale
    const onSale = games
      .filter(game => game.onSale)
      .slice(0, 50);
    renderGameList('sale-list', onSale);
    
    setupHorizontalNavigation();
  }

  function renderGameList(containerId, games) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    games.forEach(game => {
      const card = document.createElement('div');
      card.className = 'store-card';
      card.style.minWidth = '200px';
      card.style.flex = '0 0 auto';
      card.style.background = 'var(--card-bg)';
      card.style.borderRadius = '8px';
      card.style.overflow = 'hidden';
      card.style.cursor = 'pointer';
      card.style.transition = 'transform 0.2s ease, box-shadow 0.2s ease';
      
      card.innerHTML = `
        <div style="position: relative;">
          <img src="${game.cover}" alt="${escapeHtml(game.title)}" 
               style="width: 100%; height: 120px; object-fit: cover; display: block;">
          ${game.onSale ? '<div style="position: absolute; top: 8px; right: 8px; background: #e74c3c; color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: bold;">PROMOÇÃO</div>' : ''}
        </div>
        <div style="padding: 12px;">
          <h4 style="margin: 0 0 8px 0; font-size: 0.95rem; line-height: 1.3; color: var(--text);">${escapeHtml(game.title)}</h4>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.85rem; color: var(--muted);">${game.popularity}% popular</span>
            <span style="font-weight: bold; color: var(--accent); font-size: 0.9rem;">${formatPrice(getLowestPrice(game.prices))}</span>
          </div>
        </div>
      `;
      
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-4px)';
        card.style.boxShadow = '0 8px 16px rgba(0,0,0,0.3)';
      });
      
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
      });
      
      card.addEventListener('click', () => {
        openGamePopupById(game.id);
      });
      
      container.appendChild(card);
    });
  }

  function setupHorizontalNavigation() {
    const prevButtons = document.querySelectorAll('.h-prev');
    const nextButtons = document.querySelectorAll('.h-next');
    
    prevButtons.forEach(btn => {
      if (!btn._pv_attached) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const target = btn.getAttribute('data-target');
          const list = document.getElementById(target);
          if (list) {
            list.scrollBy({ left: -300, behavior: 'smooth' });
          }
        });
        btn._pv_attached = true;
      }
    });
    
    nextButtons.forEach(btn => {
      if (!btn._pv_attached) {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const target = btn.getAttribute('data-target');
          const list = document.getElementById(target);
          if (list) {
            list.scrollBy({ left: 300, behavior: 'smooth' });
          }
        });
        btn._pv_attached = true;
      }
    });
  }

  // ==================== SEARCH FILTERING ====================
  function setupSearchFiltering() {
    const searchInput = document.getElementById('principalSearch');
    if (!searchInput) return;
    
    let searchTimeout;
    
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        filterStoreContent(e.target.value);
      }, 300);
    });
    
    // Clear search when input is emptied
    searchInput.addEventListener('change', (e) => {
      if (!e.target.value.trim()) {
        filterStoreContent('');
      }
    });
  }

  function filterStoreContent(searchTerm) {
    const games = getStoreGames();
    const term = searchTerm.toLowerCase().trim();
    
    if (!term) {
      // Reset to normal view
      renderHorizontalLists();
      buildHeroCarousel();
      return;
    }
    
    const filteredGames = games.filter(game => 
      game.title.toLowerCase().includes(term) ||
      game.desc.toLowerCase().includes(term)
    );
    
    // Hide hero carousel when searching
    const heroContainer = document.getElementById('heroCarousel');
    if (heroContainer) {
      heroContainer.style.display = 'none';
    }
    
    // Hide section headers when searching
    document.querySelectorAll('.h-section .h-header').forEach(header => {
      header.style.display = 'none';
    });
    
    // Show all filtered games in a single section
    const sections = document.querySelectorAll('.h-section');
    sections.forEach((section, index) => {
      const list = section.querySelector('.h-list');
      if (list) {
        if (index === 0) {
          // Use first section for search results
          list.id = 'search-results';
          renderGameList('search-results', filteredGames);
          const header = section.querySelector('.h-header h3');
          if (header) {
            header.textContent = `Resultados da busca: "${searchTerm}" (${filteredGames.length} jogos)`;
            header.parentElement.parentElement.style.display = 'block';
          }
        } else {
          // Hide other sections
          section.style.display = 'none';
        }
      }
    });
  }

  function resetStoreView() {
    // Show all sections
    document.querySelectorAll('.h-section').forEach(section => {
      section.style.display = 'block';
    });
    
    document.querySelectorAll('.h-section .h-header').forEach(header => {
      header.style.display = 'block';
    });
    
    const heroContainer = document.getElementById('heroCarousel');
    if (heroContainer) {
      heroContainer.style.display = 'block';
    }
    
    // Restore original list IDs and content
    renderHorizontalLists();
  }

  // ==================== GAME POPUP ====================
  function openGamePopupById(id) {
    const game = findStoreGame(id);
    if (!game) return;
    
    const popup = document.getElementById('gamePopup');
    const img = document.getElementById('popupImage');
    const title = document.getElementById('popupTitle');
    const desc = document.getElementById('popupDesc');
    const prices = document.getElementById('popupPrices');
    
    if (img) img.src = game.cover;
    if (title) title.textContent = game.title;
    if (desc) desc.textContent = game.desc;
    
    if (prices) {
      prices.innerHTML = '';
      Object.entries(game.prices).forEach(([platform, price]) => {
        const priceEl = document.createElement('div');
        priceEl.className = 'popup-price-line';
        priceEl.innerHTML = `<strong>${platform.toUpperCase()}</strong>: ${formatPrice(price)}`;
        prices.appendChild(priceEl);
      });
    }
    
    // Reset platform selection
    const radios = document.querySelectorAll('input[name="platform"]');
    radios.forEach(radio => {
      radio.checked = false;
      const priceVal = game.prices ? game.prices[radio.value] : undefined;
      radio.disabled = (priceVal === null || typeof priceVal === 'undefined');
    });
    
    // Reset buttons
    const addBtn = document.getElementById('addToLibraryBtn');
    const favBtn = document.getElementById('favBtn');
    if (addBtn) addBtn.disabled = true;
    if (favBtn) {
      favBtn.classList.remove('active');
      favBtn.setAttribute('aria-pressed', 'false');
    }
    
    if (popup) {
      popup.classList.remove('hidden');
      currentGame = game;
    }
    
    setupPopupListeners();
  }

  function closeGamePopup() {
    const popup = document.getElementById('gamePopup');
    if (popup) {
      popup.classList.add('hidden');
      currentGame = null;
    }
  }

  let currentGame = null;

  function setupPopupListeners() {
    const closeBtn = document.getElementById('closePopup');
    const addBtn = document.getElementById('addToLibraryBtn');
    const favBtn = document.getElementById('favBtn');
    const platformRadios = document.querySelectorAll('input[name="platform"]');
    
    if (closeBtn && !closeBtn._pv_attached) {
      closeBtn.addEventListener('click', closeGamePopup);
      closeBtn._pv_attached = true;
    }
    
    if (addBtn && !addBtn._pv_attached) {
      addBtn.addEventListener('click', () => {
        if (!currentGame) return;
        
        const selectedPlatform = Array.from(platformRadios).find(r => r.checked)?.value;
        if (!selectedPlatform) {
          alert('Por favor, selecione uma plataforma.');
          return;
        }
        
        // Add to library logic here
        const fullUser = getFullLoggedUser();
        const isFav = favBtn ? favBtn.classList.contains('active') : false;
        const result = saveGameToUserLibrary(fullUser, currentGame, selectedPlatform, isFav);
        
        if (result.ok) {
          alert(`"${currentGame.title}" adicionado à sua biblioteca!`);
          closeGamePopup();
        } else {
          alert('Erro ao adicionar jogo à biblioteca.');
        }
      });
      addBtn._pv_attached = true;
    }
    
    if (favBtn && !favBtn._pv_attached) {
      favBtn.addEventListener('click', () => {
        favBtn.classList.toggle('active');
        favBtn.setAttribute('aria-pressed', favBtn.classList.contains('active').toString());
      });
      favBtn._pv_attached = true;
    }
    
    platformRadios.forEach(radio => {
      if (!radio._pv_attached) {
        radio.addEventListener('change', () => {
          const addBtn = document.getElementById('addToLibraryBtn');
          if (addBtn) {
            addBtn.disabled = !Array.from(platformRadios).some(r => r.checked);
          }
        });
        radio._pv_attached = true;
      }
    });
    
    // Close popup when clicking outside
    const popup = document.getElementById('gamePopup');
    if (popup && !popup._pv_attached) {
      popup.addEventListener('click', (e) => {
        if (e.target === popup) {
          closeGamePopup();
        }
      });
      popup._pv_attached = true;
    }
    
    // Close popup with Escape key
    if (!document._pv_popup_escape) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && popup && !popup.classList.contains('hidden')) {
          closeGamePopup();
        }
      });
      document._pv_popup_escape = true;
    }
  }

  function saveGameToUserLibrary(user, game, platform, isFavorite) {
    // Simplified implementation - you can expand this
    try {
      const users = getUsersArray();
      const userIndex = users.findIndex(u => u.id === user?.id || u.username === user?.username);
      
      if (userIndex !== -1) {
        users[userIndex].library = users[userIndex].library || [];
        users[userIndex].library.push({
          id: game.id,
          title: game.title,
          platform: platform,
          addedAt: new Date().toISOString(),
          favorite: isFavorite,
          cover: game.cover
        });
        
        persistUsers(users);
        return { ok: true };
      }
      
      return { ok: false, error: 'User not found' };
    } catch (error) {
      console.error('Error saving to library:', error);
      return { ok: false, error: error.message };
    }
  }

  // ==================== INITIALIZATION ====================
  function initStore() {
    ensureSampleStore();
    buildHeroCarousel();
    renderHorizontalLists();
    setupSearchFiltering();
    setupPopupListeners();
    
    // Pause autoplay when window loses focus
    window.addEventListener('blur', () => {
      heroState.isPausedByUser = true;
      stopAutoplay();
    });
    
    window.addEventListener('focus', () => {
      heroState.isPausedByUser = false;
      startAutoplay();
    });
  }

  // Main init function
  function init(){
    attachListenersOnce();
    const raw = localStorage.getItem(LOGGED_KEY);
    const fullUser = getFullLoggedUser() || safeParse(raw) || raw;
    if(!fullUser){ 
      console.info('sem sessão -> redirecionando'); 
      window.location.href = "../entrada/entrada.html"; 
      return; 
    }
    
    renderUserDisplayName(fullUser);
    applySidebarState();
    initStore();
    
    setTimeout(()=> { 
      restoreDefaultIfNoActive(); 
      refreshUI(); 
    }, 120);
    
    console.info('principal.js iniciado com loja completa');
  }

  if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }

})();
