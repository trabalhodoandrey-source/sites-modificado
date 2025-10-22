// perfil.js - salvar tudo apenas no submit; aviso de alterações não salvas
(function () {
  const SIDEBAR_KEY = 'sidebarMinimized';
  const USERS_KEY = 'users';
  const LOGGED_KEY = 'loggedUser';
  const CFG_KEY = 'gv_config';

  function safeParse(str){
    try { return JSON.parse(str); } catch(e){ return null; }
  }

  // ---------- Recupera loggedUser do storage ----------
  function resolveLoggedUser() {
    const raw = localStorage.getItem(LOGGED_KEY);
    if (!raw) return null;
    const usersList = safeParse(localStorage.getItem(USERS_KEY)) || [];
    const parsed = safeParse(raw);

    if (parsed && typeof parsed === 'object') {
      if (parsed.id) {
        const found = usersList.find(u => String(u.id) === String(parsed.id));
        if (found) return found;
        const fallback = usersList.find(u => (u.username === parsed.username) || (u.email === parsed.email));
        return fallback || null;
      } else if (parsed.username) {
        const found = usersList.find(u => u.username === parsed.username || u.email === parsed.username);
        return found || null;
      } else {
        const found = usersList.find(u => u.email === parsed.email);
        return found || null;
      }
    } else {
      // raw é string (username ou email)
      const found = usersList.find(u => u.username === raw || u.email === raw);
      return found || null;
    }
  }

  let loggedUserObj = resolveLoggedUser();
  if (!loggedUserObj) {
    localStorage.removeItem(LOGGED_KEY);
    window.location.href = "../entrada/entrada.html";
    return;
  }

  // salva sessão leve (id + username) para consistência
  try {
    localStorage.setItem(LOGGED_KEY, JSON.stringify({ id: loggedUserObj.id, username: loggedUserObj.username }));
  } catch(e){ /* ignore */ }

  // aplica configuração do usuário (se existir)
  if (typeof window.applyConfig === 'function') {
    try { window.applyConfig(loggedUserObj.config || undefined); } catch(e){ console.warn('applyConfig erro:', e); }
  }

  // ---------- DOM refs ----------
  const bemVindo = document.getElementById('bemVindo');
  const usernameInput = document.getElementById('username'); // agora editável diretamente
  const emailInput = document.getElementById('email');
  const currentPasswordInput = document.getElementById('currentPassword');
  const newPasswordInput = document.getElementById('newPassword');
  const statusMsg = document.getElementById('statusMsg');
  const editarEmailBtn = document.getElementById('editarEmailBtn'); // pode ser null se não existente no HTML
  const toggleShowPass = document.getElementById('toggleShowPass');
  const perfilForm = document.getElementById('perfilForm');
  const logoutBtn = document.getElementById('logoutBtn');

  // flags de estado
  let editingEmail = false;
  let isDirty = false; // marca se há alterações não salvas

  // preenche campos (sem expor senha)
  if (bemVindo) bemVindo.textContent = `Bem-vindo, ${loggedUserObj.displayName || loggedUserObj.username || ''}!`;
  if (usernameInput) {
    // preencha com displayName se existir, caso contrário com username
    usernameInput.value = loggedUserObj.displayName || loggedUserObj.username || '';
    // campo agora é editável diretamente (sem botão)
    usernameInput.readOnly = false;
  }
  if (emailInput) { emailInput.value = loggedUserObj.email || ''; emailInput.readOnly = true; }
  if (currentPasswordInput) {
    currentPasswordInput.value = '';
    currentPasswordInput.placeholder = 'Digite sua senha atual para confirmar';
  }
  if (newPasswordInput) newPasswordInput.value = '';

  // ---------- helpers ----------
  function markDirty() {
    if (!isDirty) {
      isDirty = true;
      if (statusMsg) { statusMsg.textContent = 'Há alterações não salvas.'; statusMsg.style.color = 'orange'; }
    }
  }
  function clearDirty() {
    isDirty = false;
    if (statusMsg) { statusMsg.textContent = ''; }
  }

  // ---------- SIDEBAR ----------
  const sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar');
  const toggleBtn = document.getElementById('toggleSidebarBtn');

  function applySidebarState() {
    if (!sidebar) return;
    const v = localStorage.getItem(SIDEBAR_KEY);
    if (v === 'true') sidebar.classList.add('minimized');
    else sidebar.classList.remove('minimized');
  }
  applySidebarState();

  function toggleSidebar(save = true) {
    if (!sidebar) return;
    sidebar.classList.toggle('minimized');
    if (save) localStorage.setItem(SIDEBAR_KEY, sidebar.classList.contains('minimized'));
  }
  if (toggleBtn) toggleBtn.addEventListener('click', () => toggleSidebar(true));
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'm' || e.key === 'M') && (e.ctrlKey || e.metaKey)) toggleSidebar(true);
  });

  // ---------- NAV ----------
  function shouldAllowNavigation() {
    if (!isDirty) return true;
    return confirm('Você tem alterações não salvas. Deseja sair sem salvar essas alterações?');
  }

  function handleSidebarClick(ev) {
    const btn = ev.target.closest('.tab-btn');
    if (!btn) return;
    const tab = btn.dataset && btn.dataset.tab;
    if (!tab) return;

    if (!shouldAllowNavigation()) return;

    const localSection = document.getElementById(tab);
    if (localSection) {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      localSection.classList.add('active');
      history.replaceState(null, '', `#${tab}`);
      return;
    }

    const MAP = {
      dashboard: '../principal/principal.html',
      biblioteca: '../biblioteca/biblioteca.html',
      perfil: '../perfil/perfil.html',
      config: '../config/config.html'
    };

    const dest = MAP[tab];
    if (dest) {
      window.location.href = dest + (tab ? `#${tab}` : '');
    }
  }
  document.addEventListener('click', handleSidebarClick);

  // ---------- LOGOUT ----------
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (!shouldAllowNavigation()) return;
      localStorage.removeItem(LOGGED_KEY);
      window.location.href = "../entrada/entrada.html";
    });
  }

  // ---------- Mostrar/ocultar senha ----------
  if (toggleShowPass && currentPasswordInput) {
    toggleShowPass.addEventListener('change', () => {
      currentPasswordInput.type = toggleShowPass.checked ? 'text' : 'password';
    });
  }

  // ---------- detectar alterações nos inputs (marcar dirty) ----------
  if (usernameInput) usernameInput.addEventListener('input', markDirty);
  if (emailInput) emailInput.addEventListener('input', markDirty);
  if (currentPasswordInput) currentPasswordInput.addEventListener('input', markDirty);
  if (newPasswordInput) newPasswordInput.addEventListener('input', markDirty);

  // ---------- Editar e-mail: ativa edição (botão opcional) ----------
  if (editarEmailBtn && emailInput) {
    editarEmailBtn.addEventListener('click', () => {
      editingEmail = !editingEmail;
      emailInput.readOnly = !editingEmail;
      if (editingEmail) {
        emailInput.focus();
        editarEmailBtn.textContent = 'Concluir';
        if (statusMsg) { statusMsg.textContent = ''; }
      } else {
        editarEmailBtn.textContent = 'Editar e-mail';
      }
    });
  }

  // ---------- Submeter: grava todas as alterações de uma vez ----------
  if (perfilForm && usernameInput && emailInput && newPasswordInput && currentPasswordInput) {
    perfilForm.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const novoDisplayOrUsername = (usernameInput.value || '').trim();
      const novoEmail = (emailInput.value || '').trim();
      const novaSenha = newPasswordInput.value.trim();
      const senhaAtualDigitada = currentPasswordInput.value || '';

      const users = safeParse(localStorage.getItem(USERS_KEY)) || [];
      const idx = users.findIndex(u => String(u.id) === String(loggedUserObj.id) || u.username === loggedUserObj.username);

      if (idx === -1) {
        if (statusMsg) { statusMsg.textContent = 'Erro: usuário não encontrado.'; statusMsg.style.color = 'red'; }
        return;
      }

      // validações: nome/username
      if (!novoDisplayOrUsername) {
        if (statusMsg) { statusMsg.textContent = 'Nome/username não pode ficar vazio.'; statusMsg.style.color = 'red'; }
        return;
      }

      // se o usuário alterou o "username" (campo), garantimos unicidade de username
      const usernameConflict = users.find((u, i) => i !== idx && u.username === novoDisplayOrUsername);
      if (usernameConflict) {
        if (statusMsg) { statusMsg.textContent = 'Este username já está em uso por outro usuário.'; statusMsg.style.color = 'red'; }
        return;
      }

      // validações: email
      if (!novoEmail) {
        if (statusMsg) { statusMsg.textContent = 'Email não pode ficar vazio.'; statusMsg.style.color = 'red'; }
        return;
      }
      const emailConflict = users.find((u, i) => i !== idx && u.email === novoEmail);
      if (emailConflict) {
        if (statusMsg) { statusMsg.textContent = 'Este e-mail já está em uso por outro usuário.'; statusMsg.style.color = 'red'; }
        return;
      }

      // validações: senha (se estiver pedindo troca)
      if (novaSenha) {
        if (!senhaAtualDigitada) {
          if (statusMsg) { statusMsg.textContent = 'Informe sua senha atual para confirmar a alteração.'; statusMsg.style.color = 'red'; }
          return;
        }
        // comparar com senha armazenada (em produção use hash e verificação segura)
        const stored = users[idx].password || '';
        if (senhaAtualDigitada !== stored) {
          if (statusMsg) { statusMsg.textContent = 'Senha atual inválida.'; statusMsg.style.color = 'red'; }
          return;
        }
      }

      // aplicação atômica das mudanças
      try {
        // atualiza username (login) e displayName
        users[idx].username = novoDisplayOrUsername;
        users[idx].displayName = novoDisplayOrUsername;
        loggedUserObj.username = novoDisplayOrUsername;
        loggedUserObj.displayName = novoDisplayOrUsername;

        // e-mail
        users[idx].email = novoEmail;
        loggedUserObj.email = novoEmail;

        // senha (se solicitada)
        if (novaSenha) {
          users[idx].password = novaSenha;
          loggedUserObj.password = novaSenha;
        }

        // salva no storage
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        // atualiza sessão leve com novo username
        localStorage.setItem(LOGGED_KEY, JSON.stringify({ id: loggedUserObj.id, username: loggedUserObj.username }));

        // limpa campos sensíveis e encerra modos de edição
        newPasswordInput.value = '';
        currentPasswordInput.value = '';
        if (emailInput) emailInput.readOnly = true;
        editingEmail = false;
        if (editarEmailBtn) editarEmailBtn.textContent = 'Editar e-mail';

        // atualiza UI
        if (bemVindo) bemVindo.textContent = `Bem-vindo, ${loggedUserObj.displayName || loggedUserObj.username || ''}!`;
        if (statusMsg) { statusMsg.textContent = 'Alterações salvas com sucesso!'; statusMsg.style.color = 'green'; }

        // limpar estado dirty
        clearDirty();
      } catch (e) {
        console.error('Erro ao salvar perfil:', e);
        if (statusMsg) { statusMsg.textContent = 'Erro ao salvar alterações.'; statusMsg.style.color = 'red'; }
      }
    });
  }

  // ---------- Aviso ao tentar fechar/recarrregar a página ----------
  window.addEventListener('beforeunload', function (e) {
    if (!isDirty) return undefined;
    const msg = 'Você tem alterações não salvas. Se sair agora, elas serão perdidas.';
    e.preventDefault();
    e.returnValue = msg;
    return msg;
  });

  // ---------- Reaplicar config quando storage muda ----------
  window.addEventListener('storage', (ev) => {
    if (ev.key === CFG_KEY || ev.key === LOGGED_KEY || ev.key === USERS_KEY) {
      const newLogged = resolveLoggedUser();
      if (newLogged) {
        loggedUserObj = newLogged;
        if (bemVindo) bemVindo.textContent = `Bem-vindo, ${loggedUserObj.displayName || loggedUserObj.username || ''}!`;
        if (usernameInput && usernameInput.readOnly) usernameInput.value = loggedUserObj.displayName || loggedUserObj.username || '';
        if (emailInput && emailInput.readOnly) emailInput.value = loggedUserObj.email || '';
        if (typeof window.applyConfig === 'function') {
          try { window.applyConfig(loggedUserObj.config || undefined); } catch(e){ console.warn('applyConfig erro (storage):', e); }
        }
      }
    }
  });

  // ---------- Abrir aba por hash ----------
  if (window.location.hash) {
    const h = window.location.hash.replace('#', '');
    setTimeout(() => {
      const section = document.getElementById(h);
      if (section) {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        const btn = Array.from(document.querySelectorAll('.tab-btn')).find(x => x.dataset && x.dataset.tab === h);
        if (btn) btn.classList.add('active');
        section.classList.add('active');
      }
    }, 60);
  }

  console.info('perfil.js carregado — botão "Editar nome" removido; nome editável direto; submit salva tudo.');
})();
