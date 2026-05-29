import './style.css'
import { supabase } from './supabase.js'

document.addEventListener('DOMContentLoaded', async () => {
  // Check se o usuário já fez login pela tabela profiles
  const loggedUser = localStorage.getItem('setur_user');
  
  if (loggedUser) {
    window.location.href = '/dashboard.html';
    return;
  }

  const loginForm = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const errorMsg = document.getElementById('login-error');
  const loginBtn = document.getElementById('login-btn');

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = emailInput.value;
      const password = passwordInput.value;
      
      errorMsg.classList.add('hidden');
      errorMsg.textContent = '';
      
      loginBtn.disabled = true;
      loginBtn.innerHTML = '<i data-lucide="loader" class="spin"></i> Entrando...';
      if(window.lucide) window.lucide.createIcons();

      // Login manual consultando a tabela profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .single();

      if (error || !data) {
        errorMsg.textContent = 'E-mail ou senha incorretos.';
        errorMsg.classList.remove('hidden');
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i data-lucide="log-in"></i> Entrar no Sistema';
        if(window.lucide) window.lucide.createIcons();
      } else {
        // Login success - salva no localStorage
        localStorage.setItem('setur_user', JSON.stringify(data));
        window.location.href = '/dashboard.html';
      }
    });
  }
});
