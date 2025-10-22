// cadastro.js
(function(){
  const USERS_KEY = "users";
  const LOGGED_KEY = "loggedUser";

  function genId(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
  function safeParse(s){ try { return JSON.parse(s); } catch(e){ return null; } }

  document.getElementById('cadastroForm')?.addEventListener('submit', function(e){
    e.preventDefault();
    const username = (document.getElementById('username')?.value || '').trim();
    const email = (document.getElementById('email')?.value || '').trim();
    const password = (document.getElementById('password')?.value || '');
    const msgSuccess = document.querySelector('.msg.success');
    const msgError = document.querySelector('.msg.error');

    if(!username || !email || !password){
      if(msgError){ msgError.innerText = "Preencha todos os campos!"; msgError.style.display = "block"; }
      if(msgSuccess) msgSuccess.style.display = "none";
      return;
    }

    let users = safeParse(localStorage.getItem(USERS_KEY)) || [];

    if(users.some(u => (u.username||'').toLowerCase() === username.toLowerCase() || (u.email||'').toLowerCase() === email.toLowerCase())){
      if(msgError){ msgError.innerText = "Usuário ou e-mail já cadastrado!"; msgError.style.display = "block"; }
      if(msgSuccess) msgSuccess.style.display = "none";
      return;
    }

    const id = genId();
    const newUser = {
      id,
      username,
      email,
      password,
      config: { theme: "light", accent: "#6a11cb", notifications: false },
      library: [],
      favorites: []
    };

    users.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));

    // salva loggedUser leve (apenas id + username)
    localStorage.setItem(LOGGED_KEY, JSON.stringify({ id, username }));

    // tenta aplicar config imediatamente
    if (typeof window.applyConfig === 'function') {
      try { window.applyConfig(newUser.config); } catch(e){ /* ignore */ }
    }

    if(msgSuccess){
      msgSuccess.innerText = "Cadastro realizado! Redirecionando...";
      msgSuccess.style.display = "block";
    }
    if(msgError) msgError.style.display = "none";

    setTimeout(()=> window.location.href = "../principal/principal.html", 900);
  });

  document.getElementById('btnClear')?.addEventListener('click', ()=>{
    if(confirm('Deseja realmente apagar todos os cadastros?')){
      localStorage.removeItem(USERS_KEY);
      alert('Todos os cadastros foram apagados!');
    }
  });
})();
