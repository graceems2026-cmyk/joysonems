// Authentication functions

async function login(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    const submitBtn = event.target.querySelector('button[type="submit"]');
    
    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="loading mr-2"></div> Signing in...';
        errorDiv.classList.add('hidden');
        
        const data = await apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        currentUser = data.user;
        localStorage.setItem('user', JSON.stringify(currentUser));
        
        showMainApp();
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.classList.remove('hidden');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Sign In';
    }
}

function showMainApp() {
    document.getElementById('loginPage').classList.add('page-hidden');
    document.getElementById('mainApp').classList.remove('page-hidden');
    
    // Set user info
    document.getElementById('userName').textContent = currentUser.firstName;
    document.getElementById('userRole').textContent = currentUser.role.replace('_', ' ');
    
    // Hide company navigation for non-super admins
    if (currentUser.role !== 'SUPER_ADMIN') {
        document.getElementById('navCompanies').style.display = 'none';
        document.getElementById('navUsers').style.display = 'none';
        document.getElementById('companyFilter').style.display = 'none';
    } else {
        loadCompanyFilter();
    }
    
    // Set current date
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    loadDashboard();
}

async function logout() {
    try {
        await apiCall('/auth/logout', { method: 'POST' });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    authToken = null;
    currentUser = null;
    
    document.getElementById('mainApp').classList.add('page-hidden');
    document.getElementById('loginPage').classList.remove('page-hidden');
    document.getElementById('loginForm').reset();
}

async function checkAuth() {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        try {
            authToken = token;
            currentUser = JSON.parse(user);
            
            // Verify token is still valid
            await apiCall('/auth/verify');
            showMainApp();
        } catch (error) {
            console.error('Auth verification failed:', error);
            logout();
        }
    }
}

// Initialize login form
document.getElementById('loginForm')?.addEventListener('submit', login);

// Check authentication on page load
window.addEventListener('DOMContentLoaded', checkAuth);
