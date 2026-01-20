// Logs page functionality
const API_BASE = '/api';
let currentTab = 'activity';
let currentActivityLogs = [];
let currentLoginLogs = [];

// Load on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    loadLogs();
});

// Switch between tabs
function switchTab(tab) {
    currentTab = tab;
    
    // Get elements
    const activityTab = document.getElementById('activityTab');
    const loginTab = document.getElementById('loginTab');
    const activityFilters = document.getElementById('activityFilters');
    const loginFilters = document.getElementById('loginFilters');
    const activityTable = document.getElementById('activityTable');
    const loginTable = document.getElementById('loginTable');
    
    // Check if all elements exist
    if (!activityTab || !loginTab || !activityFilters || !loginFilters || !activityTable || !loginTable) {
        console.error('Missing required elements for tab switching');
        return;
    }
    
    // Update tab buttons
    activityTab.className = tab === 'activity' 
        ? 'px-6 py-3 font-semibold border-b-2 border-blue-600 text-blue-600'
        : 'px-6 py-3 font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700';
    
    loginTab.className = tab === 'login'
        ? 'px-6 py-3 font-semibold border-b-2 border-blue-600 text-blue-600'
        : 'px-6 py-3 font-semibold border-b-2 border-transparent text-gray-500 hover:text-gray-700';
    
    // Show/hide filters
    activityFilters.style.display = tab === 'activity' ? 'block' : 'none';
    loginFilters.style.display = tab === 'login' ? 'block' : 'none';
    
    // Show/hide tables
    activityTable.style.display = tab === 'activity' ? 'block' : 'none';
    loginTable.style.display = tab === 'login' ? 'block' : 'none';
    
    // Load logs for the selected tab
    loadLogs();
}

// Check authentication
async function checkAuth() {
    try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (!response.ok) {
            window.location.href = '/login.html';
            return;
        }
        const sessionUser = await response.json();
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
    if (!response.ok) throw new Error(data.error || 'Request failed');
    return data;
}

// Load logs with filters
async function loadLogs() {
    try {
        if (currentTab === 'activity') {
            const search = document.getElementById('searchInput').value;
            const action = document.getElementById('actionFilter').value;
            const entityType = document.getElementById('entityFilter').value;
            
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (action) params.append('action', action);
            if (entityType) params.append('entity_type', entityType);
            
            const data = await apiCall(`/logs/activity?${params.toString()}`);
            currentActivityLogs = data.data || [];
            renderActivityLogs(currentActivityLogs);
        } else {
            const status = document.getElementById('statusFilter').value;
            const email = document.getElementById('emailFilter').value;
            
            const params = new URLSearchParams();
            if (status) params.append('status', status);
            if (email) params.append('email', email);
            
            const data = await apiCall(`/logs/login?${params.toString()}`);
            currentLoginLogs = data.data || [];
            renderLoginLogs(currentLoginLogs);
        }
    } catch (error) {
        console.error('Load logs error:', error);
        alert('Failed to load logs: ' + error.message);
    }
}

// Render activity logs table
function renderActivityLogs(logs) {
    const tbody = document.getElementById('logsTable');
    
    if (logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-clipboard-list text-6xl text-gray-300 mb-4"></i>
                    <p>No activity logs found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = logs.map(log => {
        // Parse the datetime string as local time
        const dateStr = log.created_at.replace(' ', 'T');
        const date = new Date(dateStr);
        
        const actionColors = {
            'CREATE': 'bg-green-100 text-green-800',
            'UPDATE': 'bg-blue-100 text-blue-800',
            'DELETE': 'bg-red-100 text-red-800',
            'LOGIN': 'bg-purple-100 text-purple-800',
            'LOGOUT': 'bg-gray-100 text-gray-800'
        };
        
        // Detect termination from description and override action display
        let displayAction = log.action;
        let actionColor = actionColors[log.action] || 'bg-gray-100 text-gray-800';
        
        if (log.description && log.description.toLowerCase().includes('terminated employee')) {
            displayAction = 'TERMINATED';
            actionColor = 'bg-red-100 text-red-800';
        }
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 text-sm text-gray-700">
                    <div>${date.toLocaleDateString()}</div>
                    <div class="text-xs text-gray-500">${date.toLocaleTimeString()}</div>
                </td>
                <td class="px-6 py-4">
                    <div class="font-semibold text-gray-800">${log.first_name || 'System'} ${log.last_name || ''}</div>
                    <div class="text-xs text-gray-500">${log.email || '-'}</div>
                </td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 rounded-full text-xs font-semibold ${actionColor}">
                        ${displayAction}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-700">${log.entity_type || '-'}</td>
                <td class="px-6 py-4 text-sm text-gray-700">${log.description || '-'}</td>
                <td class="px-6 py-4 text-sm text-gray-500">${log.ip_address || '-'}</td>
            </tr>
        `;
    }).join('');
}

// Render login logs table
function renderLoginLogs(logs) {
    const tbody = document.getElementById('loginLogsTable');
    
    if (logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-6 py-12 text-center text-gray-500">
                    <i class="fas fa-sign-in-alt text-6xl text-gray-300 mb-4"></i>
                    <p>No login logs found</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = logs.map(log => {
        // Parse the datetime string as local time
        const dateStr = log.created_at.replace(' ', 'T');
        const date = new Date(dateStr);
        
        const statusColor = log.status === 'SUCCESS' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800';
        
        const userName = log.first_name && log.last_name 
            ? `${log.first_name} ${log.last_name}` 
            : '-';
        
        const userAgent = log.user_agent || '-';
        const shortAgent = userAgent.length > 50 
            ? userAgent.substring(0, 50) + '...' 
            : userAgent;
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 text-sm text-gray-700">
                    <div>${date.toLocaleDateString()}</div>
                    <div class="text-xs text-gray-500">${date.toLocaleTimeString()}</div>
                </td>
                <td class="px-6 py-4 text-sm text-gray-700">
                    ${log.email}
                </td>
                <td class="px-6 py-4">
                    <div class="font-semibold text-gray-800">${userName}</div>
                    ${log.role ? `<div class="text-xs text-gray-500">${log.role}</div>` : ''}
                    ${log.company_name ? `<div class="text-xs text-gray-500">${log.company_name}</div>` : ''}
                </td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 rounded-full text-xs font-semibold ${statusColor}">
                        ${log.status}
                    </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-700">
                    ${log.ip_address || '-'}
                </td>
                <td class="px-6 py-4 text-xs text-gray-600" title="${userAgent}">
                    ${shortAgent}
                </td>
                <td class="px-6 py-4 text-sm ${log.failure_reason ? 'text-red-600' : 'text-gray-500'}">
                    ${log.failure_reason || '-'}
                </td>
            </tr>
        `;
    }).join('');
}

// Export logs to Excel
function exportLogsToExcel() {
    let data = [];
    let fileName = '';
    
    if (currentTab === 'activity') {
        if (currentActivityLogs.length === 0) {
            alert('No activity logs to export');
            return;
        }
        
        data = currentActivityLogs.map(log => {
            const date = new Date(log.created_at.replace(' ', 'T'));
            let action = log.action;
            if (log.description && log.description.toLowerCase().includes('terminated employee')) {
                action = 'TERMINATED';
            }
            return {
                'Date': date.toLocaleDateString(),
                'Time': date.toLocaleTimeString(),
                'User': `${log.first_name || 'System'} ${log.last_name || ''}`.trim(),
                'Email': log.email || '-',
                'Action': action,
                'Entity Type': log.entity_type || '-',
                'Description': log.description || '-',
                'IP Address': log.ip_address || '-'
            };
        });
        fileName = `activity_logs_${new Date().toISOString().split('T')[0]}.xlsx`;
    } else {
        if (currentLoginLogs.length === 0) {
            alert('No login logs to export');
            return;
        }
        
        data = currentLoginLogs.map(log => {
            const date = new Date(log.created_at.replace(' ', 'T'));
            return {
                'Date': date.toLocaleDateString(),
                'Time': date.toLocaleTimeString(),
                'Email': log.email || '-',
                'User': log.first_name && log.last_name ? `${log.first_name} ${log.last_name}` : '-',
                'Role': log.role || '-',
                'Company': log.company_name || '-',
                'Status': log.status,
                'IP Address': log.ip_address || '-',
                'Failure Reason': log.failure_reason || '-'
            };
        });
        fileName = `login_logs_${new Date().toISOString().split('T')[0]}.xlsx`;
    }
    
    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, currentTab === 'activity' ? 'Activity Logs' : 'Login Logs');
    
    // Set column widths
    const cols = Object.keys(data[0] || {}).map(key => ({ wch: Math.max(key.length, 15) }));
    worksheet['!cols'] = cols;
    
    // Download
    XLSX.writeFile(workbook, fileName);
}
