// Redirecionamento Login e Cadastro
const btnLogin = document.getElementById('btnLogin');
const btnCadastro = document.getElementById('btnCadastro');

if (btnLogin) {
  btnLogin.addEventListener('click', () => {
    // Redireciona para a pasta login/login.html
    window.location.href = '../login/login.html';
  });
}

if (btnCadastro) {
  btnCadastro.addEventListener('click', () => {
    // Redireciona para a pasta cadastro/cadastro.html
    window.location.href = '../cadastro/cadastro.html';
  });
}

// Voltar pra aba inicial clicando no logo
function mostrarHome() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(b => b.classList.remove('active'));
  const homeTab = document.querySelector('[data-tab="home"]');
  if (homeTab) homeTab.classList.add('active');
}

// Redirecionamento "Saiba Mais" via link no footer
const saibaMaisLink = document.querySelector('.about-link a');
if (saibaMaisLink) {
  saibaMaisLink.addEventListener('click', (e) => {
    e.preventDefault(); // evita abrir de forma padrão
    window.location.href = '../saiba_mais/saiba_mais.html';
  });
}
