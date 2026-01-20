document.addEventListener('DOMContentLoaded', () => {
  if (document.cookie.includes('connect.sid')) {
    // Check if session exists by making a request to /api/auth/me
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.id) {
          localStorage.setItem('user', JSON.stringify(data));
          redirectToDashboard(data.role);
        }
      })
      .catch(() => {
        // Session invalid, stay on login
      });
    return;
  }

  const form = document.getElementById('loginForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    const errorText = document.getElementById('loginErrorText');
    const submitBtn = document.getElementById('submitBtn');
    
    errorDiv.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Signing in...';
    submitBtn.classList.add('opacity-75', 'cursor-not-allowed');
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Include cookies
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Success animation
      submitBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Success! Redirecting...';
      submitBtn.classList.remove('btn-gradient');
      submitBtn.classList.add('bg-green-500');
      
      // Redirect based on role
      setTimeout(() => redirectToDashboard(data.user.role), 500);
    } catch (err) {
      if (errorText) {
        errorText.textContent = err.message;
      } else {
        errorDiv.textContent = err.message;
      }
      errorDiv.classList.remove('hidden');
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Sign In</span><i class="fas fa-arrow-right"></i>';
      submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
    }
  });
});

function redirectToDashboard(role) {
  if (role === 'SUPER_ADMIN') {
    window.location.href = '/dashboard-superadmin.html';
  } else if (role === 'COMPANY_ADMIN' || role === 'HR') {
    window.location.href = '/dashboard-admin.html';
  } else {
    window.location.href = '/dashboard-admin.html';
  }
}
