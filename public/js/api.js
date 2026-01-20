// Global configuration
const API_BASE_URL = window.location.origin + '/api';
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');

// API Helper function
async function apiCall(endpoint, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        credentials: 'include', // Include cookies for session
        ...options
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        
        if (response.status === 401) {
            localStorage.clear();
            window.location.href = '/login.html';
            return;
        }
        
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// File upload helper
async function uploadFile(endpoint, formData) {
    const config = {
        method: 'POST',
        headers: {
            // No Authorization header for sessions
        },
        credentials: 'include', // Include cookies for session
        body: formData
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (response.status === 401) {
        localStorage.clear();
        window.location.href = '/login.html';
        return;
    }
    
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
    }

    return data;
}

// Show loading indicator
function showLoading(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = '<div class="flex items-center justify-center py-12"><div class="loading"></div></div>';
    }
}

// Show error message
function showError(message, elementId = null) {
    const errorHTML = `
        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <i class="fas fa-exclamation-circle mr-2"></i>${message}
        </div>
    `;
    
    if (elementId) {
        document.getElementById(elementId).innerHTML = errorHTML;
    } else {
        alert(message);
    }
}

// Show success message
function showSuccess(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    toast.innerHTML = `<i class="fas fa-check-circle mr-2"></i>${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'fadeIn 0.3s reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Format date
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Format currency
function formatCurrency(amount) {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

// Format number
function formatNumber(num) {
    if (!num) return '0';
    return new Intl.NumberFormat('en-IN').format(num);
}

// Get status badge
function getStatusBadge(status) {
    const badges = {
        'Active': 'badge-success',
        'Inactive': 'badge-danger',
        'On Leave': 'badge-warning',
        'Terminated': 'badge-danger',
        'Resigned': 'badge-danger',
        'Probation': 'badge-info'
    };
    return `<span class="badge ${badges[status] || 'badge-info'}">${status}</span>`;
}

// Modal helpers
function showModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// Pagination helper
function renderPagination(pagination, onPageChange) {
    if (!pagination || pagination.totalPages <= 1) return '';
    
    let html = '<div class="flex items-center justify-between mt-6">';
    html += `<div class="text-sm text-gray-600">
        Showing ${((pagination.page - 1) * pagination.limit) + 1} to 
        ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} results
    </div>`;
    
    html += '<div class="flex space-x-2">';
    
    // Previous button
    html += `<button onclick="${onPageChange}(${pagination.page - 1})" 
             ${!pagination.hasPrev ? 'disabled' : ''} 
             class="px-3 py-1 rounded border ${pagination.hasPrev ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}">
             <i class="fas fa-chevron-left"></i>
             </button>`;
    
    // Page numbers
    for (let i = Math.max(1, pagination.page - 2); i <= Math.min(pagination.totalPages, pagination.page + 2); i++) {
        html += `<button onclick="${onPageChange}(${i})" 
                 class="px-3 py-1 rounded border ${i === pagination.page ? 'bg-primary text-white' : 'hover:bg-gray-50'}">
                 ${i}
                 </button>`;
    }
    
    // Next button
    html += `<button onclick="${onPageChange}(${pagination.page + 1})" 
             ${!pagination.hasNext ? 'disabled' : ''} 
             class="px-3 py-1 rounded border ${pagination.hasNext ? 'hover:bg-gray-50' : 'opacity-50 cursor-not-allowed'}">
             <i class="fas fa-chevron-right"></i>
             </button>`;
    
    html += '</div></div>';
    return html;
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
