// Main app navigation and initialization

function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.add('page-hidden');
    });
    
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Show selected page
    document.getElementById(`${pageName}Page`).classList.remove('page-hidden');
    
    // Add active class to clicked nav item
    event.target.closest('.nav-item')?.classList.add('active');
    
    // Update page title
    const titles = {
        dashboard: 'Dashboard',
        companies: 'Companies',
        employees: 'Employees',
        documents: 'Documents',
        users: 'Users',
        logs: 'Activity Logs'
    };
    
    document.getElementById('pageTitle').textContent = titles[pageName] || pageName;
    
    // Load page content
    switch(pageName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'companies':
            loadCompanies();
            break;
        case 'employees':
            loadEmployees();
            break;
        case 'documents':
            loadDocuments();
            break;
        case 'users':
            loadUsers();
            break;
        case 'logs':
            loadLogs();
            break;
    }
}

async function loadCompanyFilter() {
    try {
        const companies = await apiCall('/companies/list');
        const select = document.getElementById('companyFilter');
        select.innerHTML = '<option value="">All Companies</option>';
        companies.forEach(company => {
            select.innerHTML += `<option value="${company.id}">${company.name}</option>`;
        });
    } catch (error) {
        console.error('Failed to load companies:', error);
    }
}

// Initialize tooltips and other UI elements
document.addEventListener('DOMContentLoaded', () => {
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });
    
    // ESC key closes modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.show').forEach(modal => {
                modal.classList.remove('show');
            });
        }
    });
});

// Export to Excel helper
function exportToExcel(data, filename) {
    // This is a simplified version - in production, use a library like SheetJS
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
}

function convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csv = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
            const value = row[header];
            return typeof value === 'string' && value.includes(',') 
                ? `"${value}"` 
                : value;
        }).join(','))
    ];
    
    return csv.join('\n');
}

// Print helper
function printContent(elementId) {
    const content = document.getElementById(elementId).innerHTML;
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Print</title>');
    printWindow.document.write('<link href="https://cdn.tailwindcss.com" rel="stylesheet">');
    printWindow.document.write('</head><body>');
    printWindow.document.write(content);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.print();
}

// Confirm dialog
function confirmAction(message, callback) {
    if (confirm(message)) {
        callback();
    }
}
