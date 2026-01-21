// Companies page functionality
const API_BASE = '/api';
let editingCompanyId = null;

// Load companies on page load
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    loadCompanies();
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

// Load all companies
async function loadCompanies() {
    try {
        const data = await apiCall('/companies');
        renderCompanies(data.companies || []);
    } catch (error) {
        console.error('Load companies error:', error);
        alert('Failed to load companies: ' + error.message);
    }
}

// Render companies grid
function renderCompanies(companies) {
    const grid = document.getElementById('companiesGrid');
    
    if (companies.length === 0) {
        grid.innerHTML = `
            <div class="col-span-3 text-center py-12">
                <i class="fas fa-building text-6xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">No companies found. Add your first company!</p>
            </div>
        `;
        return;
    }
    
    grid.innerHTML = companies.map(company => `
        <div class="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
            <div class="flex items-start justify-between mb-4">
                <div class="flex items-center gap-4">
                    ${company.logo_path 
                        ? `<img src="${company.logo_path}" alt="${company.name}" class="w-16 h-16 rounded-lg object-cover">`
                        : `<div class="w-16 h-16 rounded-lg bg-blue-100 flex items-center justify-center">
                             <i class="fas fa-building text-blue-600 text-2xl"></i>
                           </div>`
                    }
                    <div>
                        <h3 class="text-lg font-bold text-gray-800">${company.name}</h3>
                        <p class="text-sm text-gray-500">Code: ${company.code}</p>
                    </div>
                </div>
                <span class="px-3 py-1 rounded-full text-xs font-semibold ${company.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${company.is_active ? 'Active' : 'Inactive'}
                </span>
            </div>
            
            <div class="space-y-2 mb-4 text-sm text-gray-600">
                ${company.email ? `<div><i class="fas fa-envelope w-5"></i> ${company.email}</div>` : ''}
                ${company.phone ? `<div><i class="fas fa-phone w-5"></i> ${company.phone}</div>` : ''}
                ${company.address ? `<div><i class="fas fa-map-marker-alt w-5"></i> ${company.address}</div>` : ''}
                ${company.about ? `<div class="mt-3 p-3 bg-blue-50 rounded text-gray-700"><i class="fas fa-info-circle text-blue-600 mr-2"></i><strong>About:</strong> ${company.about}</div>` : ''}
            </div>
            
            <div class="flex items-center justify-between pt-4 border-t">
                <div class="text-sm">
                    <i class="fas fa-users text-blue-600"></i>
                    <span class="font-semibold">${company.employee_count || 0}</span> Employees
                </div>
                <div class="flex gap-2">
                    <button onclick="viewEmployees(${company.id}, '${company.name.replace(/'/g, "\\'")}')  " 
                            class="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm">
                        <i class="fas fa-users"></i> View
                    </button>
                    <button onclick="editCompany(${company.id})" 
                            class="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// View employees for a company
function viewEmployees(companyId, companyName) {
    window.location.href = `/employee-view.html?company_id=${companyId}&company_name=${encodeURIComponent(companyName)}`;
}

// Open modal for adding new company
function openAddCompanyModal() {
    editingCompanyId = null;
    document.getElementById('modalTitle').textContent = 'Add New Company';
    document.getElementById('companyForm').reset();
    document.getElementById('logoPreview').classList.add('hidden');
    document.getElementById('defaultLogoIcon').classList.remove('hidden');
    document.getElementById('companyModal').classList.remove('hidden');
}

// Edit company
async function editCompany(id) {
    try {
        const company = await apiCall(`/companies/${id}`);
        
        editingCompanyId = id;
        document.getElementById('modalTitle').textContent = 'Edit Company';
        
        // Fill form
        const form = document.getElementById('companyForm');
        form.elements.name.value = company.name;
        form.elements.code.value = company.code;
        form.elements.gst_number.value = company.gst_number || '';
        form.elements.address.value = company.address || '';
        form.elements.phone.value = company.phone || '';
        form.elements.email.value = company.email || '';
        form.elements.website.value = company.website || '';
        form.elements.is_active.value = company.is_active ? '1' : '0';
        
        // Show logo if exists
        if (company.logo_path) {
            document.getElementById('logoPreview').src = company.logo_path;
            document.getElementById('logoPreview').classList.remove('hidden');
            document.getElementById('defaultLogoIcon').classList.add('hidden');
        }
        
        document.getElementById('companyModal').classList.remove('hidden');
    } catch (error) {
        alert('Failed to load company details: ' + error.message);
    }
}

// Close modal
function closeCompanyModal() {
    document.getElementById('companyModal').classList.add('hidden');
    editingCompanyId = null;
}

// Preview logo
function previewLogo(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('logoPreview').src = e.target.result;
            document.getElementById('logoPreview').classList.remove('hidden');
            document.getElementById('defaultLogoIcon').classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
}

// Handle form submission
document.getElementById('companyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
    
    try {
        const formData = new FormData(e.target);
        
        const endpoint = editingCompanyId ? `/companies/${editingCompanyId}` : '/companies';
        const method = editingCompanyId ? 'PUT' : 'POST';
        
        await apiCall(endpoint, {
            method: method,
            body: formData
        });
        
        closeCompanyModal();
        loadCompanies();
        alert(editingCompanyId ? 'Company updated successfully!' : 'Company added successfully!');
    } catch (error) {
        alert('Failed to save company: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Save Company';
    }
});

// ==================== Export Functionality ====================
let allCompaniesData = [];

// Toggle export menu
document.addEventListener('DOMContentLoaded', () => {
    const exportBtn = document.getElementById('exportBtn');
    const exportMenu = document.getElementById('exportMenu');
    
    exportBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        exportMenu.classList.toggle('hidden');
    });
    
    document.addEventListener('click', () => {
        exportMenu?.classList.add('hidden');
    });
});

async function exportCompanies(type) {
    try {
        const data = await apiCall('/companies');
        const companies = data.companies || [];
        
        if (companies.length === 0) {
            alert('No companies to export');
            return;
        }

        // Prepare export data
        const exportData = companies.map(company => ({
            'Company Code': company.code || '-',
            'Company Name': company.name || '-',
            'GST Number': company.gst_number || '-',
            'Email': company.email || '-',
            'Phone': company.phone || '-',
            'Address': company.address || '-',
            'Website': company.website || '-',
            'Status': company.status || '-',
            'Total Employees': company.employee_count || 0,
            'Created Date': company.created_at ? new Date(company.created_at).toLocaleDateString() : '-'
        }));

        if (type === 'excel') {
            exportCompaniesToExcel(exportData);
        } else {
            exportCompaniesToPDF(exportData);
        }
    } catch (error) {
        alert('Error exporting companies: ' + error.message);
    }
}

function exportCompaniesToExcel(data) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Companies');
    
    // Auto-size columns
    const cols = Object.keys(data[0] || {}).map(key => ({ wch: Math.max(key.length, 15) }));
    worksheet['!cols'] = cols;
    
    const fileName = `companies_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}

function exportCompaniesToPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    
    // Add title
    doc.setFontSize(18);
    doc.text('Companies List', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(`Total Companies: ${data.length}`, 14, 27);
    
    // Prepare table data
    const headers = Object.keys(data[0] || {});
    const rows = data.map(company => headers.map(h => company[h]));
    
    doc.autoTable({
        head: [headers],
        body: rows,
        startY: 32,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { top: 32 }
    });
    
    const fileName = `companies_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
}
