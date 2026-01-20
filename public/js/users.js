// Users page functionality
const API_BASE = '/api';
let editingUserId = null;
let companies = [];

// Load on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    loadCompanies();
    loadUsers();
});

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (!response.ok) {
            window.location.href = '/login.html';
            return;
        }
        const sessionUser = await response.json();
        if (sessionUser.role !== 'SUPER_ADMIN') {
            window.location.href = '/login.html';
            return;
        }
        // Update localStorage with fresh user data
        localStorage.setItem('user', JSON.stringify(sessionUser));
    } catch (error) {
        window.location.href = '/login.html';
        return;
    }
}

// API call helper
async function apiCall(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        credentials: 'include', // Include cookies for session
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
    
    if (response.status === 401) {
        localStorage.clear();
        window.location.href = '/login.html';
        return;
    }
    
    const data = await response.json();
    if (!response.ok) {
        // Show detailed validation errors if available
        if (data.details && Array.isArray(data.details)) {
            const errorMessages = data.details.map(d => `${d.field}: ${d.message}`).join('\n');
            throw new Error(errorMessages);
        }
        throw new Error(data.error || 'Request failed');
    }
    return data;
}

// Load companies for dropdown
async function loadCompanies() {
    try {
        const data = await apiCall('/companies');
        companies = data.companies || [];
        
        const select = document.querySelector('select[name="company_id"]');
        select.innerHTML = '<option value="">Select Company</option>' +
            companies.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    } catch (error) {
        console.error('Load companies error:', error);
    }
}

// Load all users
async function loadUsers() {
    try {
        const response = await apiCall('/users');
        const users = response.data || response.users || [];
        renderUsers(users);
    } catch (error) {
        console.error('Load users error:', error);
        alert('Failed to load users: ' + error.message);
    }
}

// Render users table
function renderUsers(users) {
    const tbody = document.getElementById('usersTable');
    
    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-users text-6xl text-gray-300 mb-4"></i>
                    <p>No users found. Add your first user!</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = users.map(user => {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
        return `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                        <i class="fas fa-user text-blue-600"></i>
                    </div>
                    <div>
                        <div class="font-semibold text-gray-800">${fullName || 'N/A'}</div>
                        <div class="text-sm text-gray-500">ID: ${user.id}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 text-gray-700">${user.email}</td>
            <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-full text-xs font-semibold ${
                    user.role === 'SUPER_ADMIN' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                }">
                    ${user.role.replace('_', ' ')}
                </span>
            </td>
            <td class="px-6 py-4 text-gray-700">${user.company_name || '-'}</td>
            <td class="px-6 py-4">
                <span class="px-3 py-1 rounded-full text-xs font-semibold ${
                    user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }">
                    ${user.is_active ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td class="px-6 py-4">
                <div class="flex gap-2 flex-wrap">
                    <button onclick="viewPassword(${user.id}, '${fullName.replace(/'/g, "\\'")}', '${user.email}')" class="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm">
                        <i class="fas fa-eye"></i> View Password
                    </button>
                    <button onclick="openChangePasswordModal(${user.id}, '${fullName.replace(/'/g, "\\'")}', '${user.email}')" class="px-3 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 text-sm">
                        <i class="fas fa-key"></i> Change Password
                    </button>
                    <button onclick="editUser(${user.id})" class="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="deleteUser(${user.id}, '${fullName.replace(/'/g, "\\'")}' )" class="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// Toggle company field based on role
function toggleCompanyField(role) {
    const companyField = document.getElementById('companyField');
    const companySelect = document.querySelector('select[name="company_id"]');
    
    if (role === 'COMPANY_ADMIN') {
        companyField.classList.remove('hidden');
        companySelect.required = true;
    } else {
        companyField.classList.add('hidden');
        companySelect.required = false;
        companySelect.value = '';
    }
}

// Open modal for adding new user
function openAddUserModal() {
    editingUserId = null;
    document.getElementById('modalTitle').textContent = 'Add New User';
    document.getElementById('userForm').reset();
    document.getElementById('passwordField').classList.remove('hidden');
    document.querySelector('input[name="password"]').required = true;
    document.getElementById('companyField').classList.add('hidden');
    document.getElementById('userModal').classList.remove('hidden');
}

// Edit user
async function editUser(id) {
    try {
        const response = await apiCall(`/users/${id}`);
        const user = response.user || response;
        
        editingUserId = id;
        document.getElementById('modalTitle').textContent = 'Edit User';
        document.getElementById('passwordField').classList.add('hidden');
        document.querySelector('input[name="password"]').required = false;
        
        // Fill form
        const form = document.getElementById('userForm');
        form.elements.first_name.value = user.first_name;
        form.elements.last_name.value = user.last_name || '';
        form.elements.email.value = user.email;
        form.elements.role.value = user.role;
        form.elements.is_active.value = user.is_active ? '1' : '0';
        
        if (user.role === 'COMPANY_ADMIN') {
            toggleCompanyField('COMPANY_ADMIN');
            form.elements.company_id.value = user.company_id || '';
        }
        
        document.getElementById('userModal').classList.remove('hidden');
    } catch (error) {
        alert('Failed to load user details: ' + error.message);
    }
}

// Close modal
function closeUserModal() {
    document.getElementById('userModal').classList.add('hidden');
    editingUserId = null;
}

// Handle form submission
document.getElementById('userForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
    
    try {
        const formData = new FormData(e.target);
        const data = {
            first_name: formData.get('first_name'),
            last_name: formData.get('last_name') || null,
            email: formData.get('email'),
            role: formData.get('role'),
            is_active: formData.get('is_active') === '1'
        };
        
        if (formData.get('password')) {
            data.password = formData.get('password');
        }
        
        if (formData.get('role') === 'COMPANY_ADMIN') {
            data.company_id = parseInt(formData.get('company_id'));
        }
        
        const endpoint = editingUserId ? `/users/${editingUserId}` : '/users';
        const method = editingUserId ? 'PUT' : 'POST';
        
        await apiCall(endpoint, {
            method: method,
            body: JSON.stringify(data)
        });
        
        closeUserModal();
        loadUsers();
        alert(editingUserId ? 'User updated successfully!' : 'User added successfully!');
    } catch (error) {
        alert('Failed to save user: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Save User';
    }
});

// Delete user
async function deleteUser(id, username) {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
        return;
    }
    
    try {
        await apiCall(`/users/${id}`, { method: 'DELETE' });
        loadUsers();
        alert('User deleted successfully!');
    } catch (error) {
        alert('Failed to delete user: ' + error.message);
    }
}

// View Password
let currentPasswordUserId = null;
async function viewPassword(id, username, email) {
    try {
        currentPasswordUserId = id;
        const response = await apiCall(`/users/${id}/password`);
        
        document.getElementById('viewPasswordUser').textContent = `${username} (${email})`;
        
        // Check if password is available or note exists
        if (response.note) {
            // Password not available (old user before encryption)
            document.getElementById('viewPasswordValue').value = response.note;
            document.getElementById('viewPasswordValue').type = 'text';
            document.getElementById('viewPasswordValue').classList.add('text-red-600', 'font-semibold');
            document.querySelector('#viewPasswordModal button[onclick=\"togglePasswordVisibility()\"]').classList.add('hidden');
            document.querySelector('#viewPasswordModal button[onclick=\"copyPassword()\"]').classList.add('hidden');
        } else {
            // Password available - show decrypted password
            document.getElementById('viewPasswordValue').value = response.password;
            document.getElementById('viewPasswordValue').type = 'password';
            document.getElementById('viewPasswordValue').classList.remove('text-red-600', 'font-semibold');
            document.querySelector('#viewPasswordModal button[onclick=\"togglePasswordVisibility()\"]').classList.remove('hidden');
            document.querySelector('#viewPasswordModal button[onclick=\"copyPassword()\"]').classList.remove('hidden');
        }
        
        document.getElementById('viewPasswordIcon').className = 'fas fa-eye';
        document.getElementById('viewPasswordModal').classList.remove('hidden');
    } catch (error) {
        alert('Failed to retrieve password: ' + error.message);
    }
}

function closeViewPasswordModal() {
    document.getElementById('viewPasswordModal').classList.add('hidden');
    currentPasswordUserId = null;
}

function togglePasswordVisibility() {
    const input = document.getElementById('viewPasswordValue');
    const icon = document.getElementById('viewPasswordIcon');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

function copyPassword() {
    const input = document.getElementById('viewPasswordValue');
    input.type = 'text';
    input.select();
    document.execCommand('copy');
    
    alert('Password copied to clipboard!');
    input.type = 'password';
}

// Change Password
let changingPasswordUserId = null;
function openChangePasswordModal(id, username, email) {
    changingPasswordUserId = id;
    document.getElementById('changePasswordUser').textContent = `${username} (${email})`;
    document.getElementById('changePasswordForm').reset();
    document.getElementById('newPassword').type = 'password';
    document.getElementById('newPasswordIcon').className = 'fas fa-eye';
    document.getElementById('changePasswordModal').classList.remove('hidden');
}

function closeChangePasswordModal() {
    document.getElementById('changePasswordModal').classList.add('hidden');
    changingPasswordUserId = null;
}

function toggleNewPasswordVisibility() {
    const input = document.getElementById('newPassword');
    const icon = document.getElementById('newPasswordIcon');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.className = 'fas fa-eye-slash';
    } else {
        input.type = 'password';
        icon.className = 'fas fa-eye';
    }
}

// Handle change password form submission
document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newPassword !== confirmPassword) {
        alert('Passwords do not match!');
        return;
    }
    
    const submitBtn = document.getElementById('changePasswordBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class=\"fas fa-spinner fa-spin mr-2\"></i>Changing...';
    
    try {
        await apiCall(`/users/${changingPasswordUserId}/password`, {
            method: 'PUT',
            body: JSON.stringify({ password: newPassword })
        });
        
        closeChangePasswordModal();
        alert('Password changed successfully!');
    } catch (error) {
        alert('Failed to change password: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class=\"fas fa-key mr-2\"></i>Change Password';
    }
});
