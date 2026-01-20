let user = JSON.parse(localStorage.getItem('user') || '{}');

// Get URL params for company filter
const urlParams = new URLSearchParams(window.location.search);
let filterCompanyId = urlParams.get('company_id');
let filterCompanyName = urlParams.get('company_name');

// For company admin, always filter to their company
if (user.role === 'COMPANY_ADMIN' && user.company_id) {
    filterCompanyId = user.company_id.toString();
    // Will load company name from API
}

console.log('Employee-view page - URL Params - Company ID:', filterCompanyId, 'Company Name:', filterCompanyName, 'User Role:', user.role);

let allEmployees = [];
let filteredEmployees = [];

// Helper functions for buttons
function openAddEmployeeModal() {
    window.location.href = '/add-employee.html';
}

function goToDashboard() {
    if (user.role === 'COMPANY_ADMIN') {
        window.location.href = '/dashboard-admin.html';
    } else {
        window.location.href = '/dashboard-superadmin.html';
    }
}

// Load employees on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
    try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (!response.ok) {
            window.location.href = '/login.html';
            return;
        }
        const sessionUser = await response.json();
        console.log('Employee-view page - Session user:', sessionUser);
        // Update localStorage with fresh user data
        localStorage.setItem('user', JSON.stringify(sessionUser));
        // Update user variable
        user = sessionUser;
        // Update user info in nav
        const userInfo = document.getElementById('userInfo');
        if (userInfo) {
            userInfo.textContent = `Logged in as ${sessionUser.firstName} ${sessionUser.lastName} (${sessionUser.role})`;
        }
    } catch (error) {
        window.location.href = '/login.html';
        return;
    }

    // Show/hide Terminated option based on user role
    const terminatedOption = document.getElementById('terminatedOption');
    if (terminatedOption && user.role !== 'SUPER_ADMIN') {
        terminatedOption.style.display = 'none';
    }
    
    // Update page title if filtering by company
    if (filterCompanyName) {
        const pageTitle = document.querySelector('nav .text-xl');
        if (pageTitle) {
            pageTitle.textContent = `Employees - ${decodeURIComponent(filterCompanyName)}`;
        }
    }
    
    await loadEmployees();
    
    // Setup event listeners
    const searchInput = document.getElementById('searchInput');
    const companyFilter = document.getElementById('companyFilter');
    const departmentFilter = document.getElementById('departmentFilter');
    const statusFilter = document.getElementById('statusFilter');
    const addEmployeeBtn = document.getElementById('addEmployeeBtn');
    const backBtn = document.getElementById('backBtn');
    
    if (searchInput) searchInput.addEventListener('input', filterEmployees);
    if (companyFilter) companyFilter.addEventListener('change', filterEmployees);
    if (departmentFilter) departmentFilter.addEventListener('change', filterEmployees);
    if (statusFilter) statusFilter.addEventListener('change', filterEmployees);
    if (addEmployeeBtn) addEmployeeBtn.addEventListener('click', () => {
        window.location.href = '/add-employee.html';
    });
    if (backBtn) backBtn.addEventListener('click', () => {
        history.back();
    });
});

async function loadEmployees() {
    const employeeGrid = document.getElementById('employeeGrid');
    if (!employeeGrid) {
        console.error('Employee grid element not found');
        return;
    }
    employeeGrid.innerHTML = '<div class="col-span-3 text-center py-12"><i class="fas fa-spinner fa-spin text-4xl text-blue-600"></i></div>';
    
    try {
        // Build URL with company filter if provided or if company admin
        let url = '/api/employees';
        if (filterCompanyId) {
            url += `?company_id=${filterCompanyId}`;
        }
        console.log('Employee-view page - Calling API with URL:', url);
        
        const res = await fetch(url, {
            credentials: 'include'
        });
        
        const data = await res.json();
        console.log('Employee-view page - Employees data received:', data.employees ? data.employees.length : 0, data.employees);
        if (!res.ok) throw new Error(data.error || 'Failed to load employees');
        
        allEmployees = data.employees || [];
        filteredEmployees = [...allEmployees];
        
        // Show filter info if filtering by company
        if (filterCompanyId && filterCompanyName) {
            const infoDiv = document.getElementById('companyFilterInfo');
            const companyDisplay = document.getElementById('filterCompanyDisplay');
            const employeeCount = document.getElementById('filterEmployeeCount');
            
            if (infoDiv && companyDisplay && employeeCount) {
                infoDiv.classList.remove('hidden');
                companyDisplay.textContent = decodeURIComponent(filterCompanyName);
                employeeCount.textContent = `${allEmployees.length} employee(s)`;
            }
            
            // Update page title
            const pageTitle = document.querySelector('nav .text-xl');
            if (pageTitle) {
                pageTitle.textContent = `Employees - ${decodeURIComponent(filterCompanyName)}`;
            }
            // Directly display without populating filters
            displayEmployees();
        } else {
            // Normal flow - populate filters and display
            populateFilters();
            displayEmployees();
        }
        
    } catch (err) {
        employeeGrid.innerHTML = `
            <div class="col-span-3 bg-red-50 border border-red-200 rounded-lg p-6 text-red-700 text-center">
                <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                <p>${err.message}</p>
            </div>
        `;
    }
}

function populateFilters() {
    // Get unique companies
    const companies = [...new Set(allEmployees.map(e => e.company_name))].filter(Boolean);
    const companyFilter = document.getElementById('companyFilter');
    companyFilter.innerHTML = '<option value="">All Companies</option>';
    companies.forEach(company => {
        companyFilter.innerHTML += `<option value="${company}">${company}</option>`;
    });
    
    // Get unique departments
    const departments = [...new Set(allEmployees.map(e => e.department))].filter(Boolean);
    const departmentFilter = document.getElementById('departmentFilter');
    departmentFilter.innerHTML = '<option value="">All Departments</option>';
    departments.forEach(dept => {
        departmentFilter.innerHTML += `<option value="${dept}">${dept}</option>`;
    });
}

function filterEmployees() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const companyFilter = document.getElementById('companyFilter').value;
    const departmentFilter = document.getElementById('departmentFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    filteredEmployees = allEmployees.filter(emp => {
        const matchesSearch = !searchTerm || 
            emp.first_name?.toLowerCase().includes(searchTerm) ||
            emp.last_name?.toLowerCase().includes(searchTerm) ||
            emp.employee_id?.toLowerCase().includes(searchTerm) ||
            emp.designation?.toLowerCase().includes(searchTerm);
            
        const matchesCompany = !companyFilter || emp.company_name === companyFilter;
        const matchesDepartment = !departmentFilter || emp.department === departmentFilter;
        const matchesStatus = !statusFilter || emp.status === statusFilter;
        
        return matchesSearch && matchesCompany && matchesDepartment && matchesStatus;
    });
    
    displayEmployees();
    
    // Update employee count if filter info is visible
    const employeeCount = document.getElementById('filterEmployeeCount');
    if (employeeCount) {
        employeeCount.textContent = `${filteredEmployees.length} employee(s)`;
    }
}

function displayEmployees() {
    const employeeGrid = document.getElementById('employeeGrid');
    const terminatedSection = document.getElementById('terminatedSection');
    const terminatedGrid = document.getElementById('terminatedGrid');
    if (!employeeGrid) return;
    
    // Separate active/inactive from terminated employees
    const activeEmployees = filteredEmployees.filter(emp => emp.status !== 'Terminated');
    const terminatedEmployees = filteredEmployees.filter(emp => emp.status === 'Terminated');
    
    // Display active employees
    if (activeEmployees.length === 0 && terminatedEmployees.length === 0) {
        employeeGrid.innerHTML = `
            <div class="col-span-3 text-center py-12 text-gray-500">
                <i class="fas fa-users text-6xl mb-4 opacity-30"></i>
                <p class="text-lg">No employees found</p>
            </div>
        `;
        if (terminatedSection) terminatedSection.classList.add('hidden');
        return;
    }
    
    // Render active employees
    if (activeEmployees.length > 0) {
        employeeGrid.innerHTML = activeEmployees.map(emp => renderEmployeeCard(emp)).join('');
    } else {
        employeeGrid.innerHTML = `
            <div class="col-span-3 text-center py-12 text-gray-500">
                <i class="fas fa-users text-6xl mb-4 opacity-30"></i>
                <p class="text-lg">No active employees found</p>
            </div>
        `;
    }
    
    // Render terminated employees section (only for super admin)
    if (terminatedEmployees.length > 0 && user.role === 'SUPER_ADMIN' && terminatedSection && terminatedGrid) {
        terminatedSection.classList.remove('hidden');
        terminatedGrid.innerHTML = terminatedEmployees.map(emp => renderEmployeeCard(emp)).join('');
    } else if (terminatedSection) {
        terminatedSection.classList.add('hidden');
    }
}

function renderEmployeeCard(emp) {
        const initials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase();
        const profilePhoto = emp.profile_photo ? `/${emp.profile_photo}` : null;
        
        return `
            <div class="bg-white rounded-lg shadow hover:shadow-xl transition-shadow duration-300 overflow-hidden cursor-pointer" 
                 onclick="viewEmployee(${emp.id})">
                <!-- Gradient Header -->
                <div class="h-20 bg-gradient-to-r from-blue-500 to-blue-600"></div>
                
                <!-- Profile Section -->
                <div class="relative px-6 pb-6">
                    <!-- Profile Photo -->
                    <div class="absolute -top-12 left-1/2 transform -translate-x-1/2">
                        ${profilePhoto ? 
                            `<img src="${profilePhoto}" alt="${emp.first_name}" 
                                 class="w-24 h-24 rounded-full border-4 border-white object-cover">` :
                            `<div class="w-24 h-24 rounded-full border-4 border-white bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                                <span class="text-2xl font-bold text-white">${initials}</span>
                            </div>`
                        }
                    </div>
                    
                    <!-- Employee Info -->
                    <div class="pt-14 text-center">
                        <h3 class="text-xl font-bold text-gray-800 mb-1">
                            ${emp.first_name} ${emp.last_name || ''}
                        </h3>
                        <p class="text-blue-600 font-medium mb-2">${emp.designation || 'N/A'}</p>
                        <p class="text-sm text-gray-600 mb-3">
                            <i class="fas fa-id-badge mr-1"></i>${emp.employee_id}
                        </p>
                        
                        <!-- Status Badge -->
                        <div class="mb-3">
                            <span class="px-3 py-1 rounded-full text-xs font-semibold ${
                                emp.status === 'Active' ? 'bg-green-100 text-green-800' : 
                                emp.status === 'Terminated' ? 'bg-red-100 text-red-800' :
                                'bg-gray-100 text-gray-800'
                            }">
                                ${emp.status}
                            </span>
                        </div>
                        
                        <!-- Reactivate Button for Terminated Employees (Super Admin Only) -->
                        ${emp.status === 'Terminated' && user.role === 'SUPER_ADMIN' ? `
                            <button onclick="event.stopPropagation(); reactivateEmployee(${emp.id}, '${emp.first_name} ${emp.last_name || ''}')" 
                                    class="mb-2 px-4 py-2 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors">
                                <i class="fas fa-undo-alt mr-1"></i>Reactivate Employee
                            </button>
                        ` : ''}
                        
                        <!-- Additional Info -->
                        <div class="border-t pt-3 text-sm text-gray-600">
                            <div class="flex items-center justify-center mb-1">
                                <i class="fas fa-building w-4 mr-2"></i>
                                <span>${emp.company_name || 'N/A'}</span>
                            </div>
                            ${emp.department ? `
                                <div class="flex items-center justify-center">
                                    <i class="fas fa-briefcase w-4 mr-2"></i>
                                    <span>${emp.department}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
}

function viewEmployee(id) {
    window.location.href = `/employee-details.html?id=${id}`;
}

// ==================== Export Functionality ====================
let exportType = 'excel';

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

function openExportModal(type) {
    exportType = type;
    const modal = document.getElementById('exportModal');
    const title = document.getElementById('exportModalTitle');
    const buttonText = document.getElementById('exportButtonText');
    
    title.textContent = type === 'excel' ? 'Export to Excel' : 'Export to PDF';
    buttonText.textContent = type === 'excel' ? 'Export to Excel' : 'Export to PDF';
    
    modal.classList.remove('hidden');
}

function closeExportModal() {
    document.getElementById('exportModal').classList.add('hidden');
}

function selectAllFields() {
    document.querySelectorAll('input[name="exportField"]').forEach(cb => cb.checked = true);
}

function deselectAllFields() {
    document.querySelectorAll('input[name="exportField"]').forEach(cb => cb.checked = false);
}

async function performExport() {
    const selectedFields = Array.from(document.querySelectorAll('input[name="exportField"]:checked'))
        .map(cb => cb.value);
    
    if (selectedFields.length === 0) {
        alert('Please select at least one field to export');
        return;
    }

    // Fetch full employee data with all fields
    const token = localStorage.getItem('token');
    let url = '/api/employees?limit=10000'; // Get all employees
    
    try {
        const res = await fetch(url, {
            credentials: 'include'
        });
        const data = await res.json();
        const employees = data.data || data.employees || [];

        // Filter employees based on current filters
        const employeesToExport = filteredEmployees.length > 0 ? filteredEmployees : employees;

        if (employeesToExport.length === 0) {
            alert('No employees to export');
            return;
        }

        // Prepare data for export
        const exportData = employeesToExport.map(emp => {
            // Use gross_salary from database if available, otherwise calculate from allowances
            if (!emp.gross_salary || emp.gross_salary === 0) {
                const basic = parseFloat(emp.basic_salary) || 0;
                const home = parseFloat(emp.home_allowance) || 0;
                const food = parseFloat(emp.food_allowance) || 0;
                const transport = parseFloat(emp.transport_allowance) || 0;
                const medical = parseFloat(emp.medical_allowance) || 0;
                const special = parseFloat(emp.special_allowance) || 0;
                emp.gross_salary = basic + home + food + transport + medical + special;
            }
            
            const row = {};
            const fieldLabels = {
                employee_id: 'Employee ID',
                first_name: 'First Name',
                last_name: 'Last Name',
                gender: 'Gender',
                date_of_birth: 'Date of Birth',
                blood_group: 'Blood Group',
                mobile: 'Mobile',
                email: 'Email',
                temp_address: 'Temporary Address',
                perm_address: 'Permanent Address',
                emergency_contact_phone: 'Emergency Contact',
                company_name: 'Company',
                designation: 'Designation',
                department: 'Department',
                date_of_joining: 'Date of Joining',
                status: 'Status',
                education_qualification: 'Education',
                gross_salary: 'Gross Salary',
                basic_salary: 'Basic Salary',
                home_allowance: 'Home Allowance',
                food_allowance: 'Food Allowance',
                transport_allowance: 'Transport Allowance',
                medical_allowance: 'Medical Allowance',
                special_allowance: 'Special Allowance',
                father_or_guardian: 'Father/Guardian',
                mother_name: 'Mother Name',
                marital_status: 'Marital Status',
                spouse_name: 'Spouse Name',
                bank_name: 'Bank Name',
                bank_ifsc: 'IFSC Code',
                account_holder_name: 'Account Holder',
                bank_account: 'Bank Account Number'
            };

            selectedFields.forEach(field => {
                const label = fieldLabels[field] || field;
                let value = emp[field] || '-';
                
                // Format dates
                if (field === 'date_of_birth' || field === 'date_of_joining') {
                    value = value ? new Date(value).toLocaleDateString() : '-';
                }
                
                // Handle salary and numeric fields - convert formatted strings to clean numbers for PDF
                if (exportType === 'pdf') {
                    if (field === 'basic_salary' || field === 'home_allowance' || field === 'food_allowance' || 
                        field === 'transport_allowance' || field === 'medical_allowance' || field === 'special_allowance' || 
                        field === 'gross_salary') {
                        if (value && value !== '-') {
                            // Remove ₹ symbol and convert formatted number back to plain number
                            value = value.toString().replace('₹', '').replace(/,/g, '');
                            // Convert to number and keep as plain string for PDF compatibility
                            const numValue = parseFloat(value);
                            value = isNaN(numValue) ? '-' : numValue.toString();
                        }
                    } else if (field === 'bank_account' && value && value !== '-') {
                        // Handle masked bank account numbers for PDF
                        value = value.toString().replace(/&/g, '').trim();
                    }
                }
                
                row[label] = value;
            });
            
            return row;
        });

        if (exportType === 'excel') {
            exportToExcel(exportData);
        } else {
            exportToPDF(exportData);
        }

        closeExportModal();
    } catch (error) {
        alert('Error exporting data: ' + error.message);
    }
}

function exportToExcel(data) {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
    
    // Auto-size columns
    const cols = Object.keys(data[0] || {}).map(key => ({ wch: Math.max(key.length, 15) }));
    worksheet['!cols'] = cols;
    
    const fileName = `employees_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}

async function reactivateEmployee(id, name) {
    if (!confirm(`Are you sure you want to reactivate ${name}? This will change their status back to Active and clear termination details.`)) {
        return;
    }

    try {
        const res = await fetch(`/api/employees/${id}/reactivate`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Failed to reactivate employee');
        }

        alert(`${name} has been successfully reactivated!`);
        loadEmployees(); // Reload the employee list
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function exportToPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    
    // Set UTF-8 encoding for proper character handling
    doc.setProperties({
        title: 'Employee List',
        subject: 'Employee Export',
        author: 'Employee Management System'
    });
    
    // Add title
    doc.setFontSize(18);
    doc.text('Employee List', 14, 15);
    
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toISOString().split('T')[0]} ${new Date().toTimeString().split(' ')[0]}`, 14, 22);
    doc.text(`Total Employees: ${data.length}`, 14, 27);
    
    // Prepare table data
    const headers = Object.keys(data[0] || {});
    const rows = data.map(emp => headers.map(h => {
        let value = emp[h];
        // Ensure proper string conversion for PDF
        if (typeof value === 'string') {
            // Replace any problematic characters
            value = value.replace(/₹/g, 'Rs ').replace(/&/g, 'and');
        }
        return value;
    }));
    
    doc.autoTable({
        head: [headers],
        body: rows,
        startY: 32,
        styles: { 
            fontSize: 8, 
            cellPadding: 2,
            font: 'helvetica' // Use standard font for better compatibility
        },
        headStyles: { fillColor: [37, 99, 235], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { top: 32 },
        tableWidth: 'auto',
        columnStyles: {
            // Ensure numeric columns are right-aligned
            'Basic Salary': { halign: 'right' },
            'Home Allowance': { halign: 'right' },
            'Food Allowance': { halign: 'right' },
            'Gross Salary': { halign: 'right' }
        }
    });
    
    const fileName = `employees_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
}
