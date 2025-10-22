// login.js
(function(){
  const USERS_KEY = "users";
  const LOGGED_KEY = "loggedUser";

  function safeParse(s){ try { return JSON.parse(s); } catch(e){ return null; } }

  document.getElementById('loginForm')?.addEventListener('submit', function(e){
    e.preventDefault();
    const userOrEmail = (document.getElementById('userOrEmail')?.value || '').trim();
    const password = (document.getElementById('password')?.value || '');
    const msgSuccess = document.querySelector('.msg.success');
    const msgError = document.querySelector('.msg.error');

    const users = safeParse(localStorage.getItem(USERS_KEY)) || [];
    const user = users.find(u =>
      (u.username||'').toLowerCase() === userOrEmail.toLowerCase() ||
      (u.email||'').toLowerCase() === userOrEmail.toLowerCase()
    );

    if(user && user.password === password){
      // grava apenas id+username
      localStorage.setItem(LOGGED_KEY, JSON.stringify({ id: user.id, username: user.username }));

      // aplica config individual (usa a config do usuário encontrado)
      if (typeof window.applyConfig === 'function') {
        try { window.applyConfig(user.config); } catch(e){ /* ignore */ }
      }

      if(msgSuccess){
        msgSuccess.innerText = `Bem-vindo, ${user.username}!`;
        msgSuccess.style.display = "block";
      }
      if(msgError) msgError.style.display = "none";

      setTimeout(()=> window.location.href = "../principal/principal.html", 800);
    } else {
      if(msgError){ msgError.innerText = "Usuário ou senha incorretos."; msgError.style.display = "block"; }
      if(msgSuccess) msgSuccess.style.display = "none";
    }
  });
})();
