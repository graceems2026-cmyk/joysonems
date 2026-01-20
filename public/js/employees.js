// Employees page

let currentEmployeePage = 1;
let employeeFilters = {};

async function loadEmployees(page = 1) {
    currentEmployeePage = page;
    showLoading('employeesContent');
    
    try {
        const params = new URLSearchParams({
            page,
            limit: 10,
            ...employeeFilters
        });
        
        const data = await apiCall(`/employees?${params}`);
        renderEmployees(data);
    } catch (error) {
        showError('Failed to load employees: ' + error.message, 'employeesContent');
    }
}

function renderEmployees(data) {
    let html = `
        <div class="mb-6 flex justify-between items-center flex-wrap gap-4">
            <div class="flex gap-4 items-center">
                <div class="relative w-64">
                    <input type="text" id="employeeSearch" placeholder="Search employees..." 
                           class="pl-10" onkeyup="searchEmployees(this.value)">
                    <i class="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                </div>
                <select id="statusFilter" class="px-4 py-2 border rounded-lg" onchange="filterEmployees()">
                    <option value="">All Status</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="On Leave">On Leave</option>
                </select>
                <select id="departmentFilter" class="px-4 py-2 border rounded-lg" onchange="filterEmployees()">
                    <option value="">All Departments</option>
                </select>
            </div>
            <div class="flex gap-2">
                <button onclick="exportEmployees()" class="px-4 py-2 border border-primary text-primary rounded-lg hover:bg-primary hover:text-white">
                    <i class="fas fa-file-excel mr-2"></i> Export
                </button>
                <button onclick="showAddEmployeeModal()" class="btn-primary">
                    <i class="fas fa-plus mr-2"></i> Add Employee
                </button>
            </div>
        </div>
        
        <div class="card">
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>ID</th>
                            <th>Department</th>
                            <th>Designation</th>
                            <th>Joined</th>
                            <th>Salary</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    data.data.forEach(emp => {
        html += `
            <tr>
                <td>
                    <div class="flex items-center">
                        ${emp.profile_photo ? 
                            `<img src="/${emp.profile_photo}" class="w-10 h-10 rounded-full mr-3" alt="${emp.full_name}">` :
                            `<div class="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center mr-3">
                                ${emp.first_name.charAt(0)}
                            </div>`
                        }
                        <div>
                            <div class="font-medium">${emp.full_name}</div>
                            <div class="text-sm text-gray-500">${emp.email || emp.mobile}</div>
                        </div>
                    </div>
                </td>
                <td><span class="badge badge-info">${emp.employee_id}</span></td>
                <td>${emp.department || '-'}</td>
                <td>${emp.designation || '-'}</td>
                <td>${formatDate(emp.date_of_joining)}</td>
                <td>${formatCurrency(emp.gross_salary)}</td>
                <td>${getStatusBadge(emp.status)}</td>
                <td>
                    <button onclick="viewEmployee(${emp.id})" class="text-blue-600 hover:text-blue-800 mr-3" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="editEmployee(${emp.id})" class="text-green-600 hover:text-green-800 mr-3" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="manageDocuments(${emp.id})" class="text-purple-600 hover:text-purple-800 mr-3" title="Documents">
                        <i class="fas fa-folder"></i>
                    </button>
                    <button onclick="deleteEmployee(${emp.id})" class="text-red-600 hover:text-red-800" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    if (data.data.length === 0) {
        html += `
            <tr>
                <td colspan="8" class="text-center py-8 text-gray-500">
                    <i class="fas fa-users text-4xl mb-2"></i>
                    <p>No employees found</p>
                </td>
            </tr>
        `;
    }
    
    html += `
                    </tbody>
                </table>
            </div>
        </div>
        ${renderPagination(data.pagination, 'loadEmployees')}
    `;
    
    document.getElementById('employeesContent').innerHTML = html;
    loadDepartmentFilter();
}

const searchEmployees = debounce((value) => {
    employeeFilters.search = value;
    loadEmployees(1);
}, 500);

function filterEmployees() {
    const status = document.getElementById('statusFilter').value;
    const department = document.getElementById('departmentFilter').value;
    
    employeeFilters = { ...employeeFilters, status, department };
    loadEmployees(1);
}

async function loadDepartmentFilter() {
    try {
        const departments = await apiCall('/employees/metadata/departments');
        const select = document.getElementById('departmentFilter');
        departments.forEach(dept => {
            select.innerHTML += `<option value="${dept}">${dept}</option>`;
        });
    } catch (error) {
        console.error('Failed to load departments:', error);
    }
}

async function viewEmployee(id) {
    try {
        const emp = await apiCall(`/employees/${id}`);
        alert(`Employee: ${emp.first_name} ${emp.last_name}\nID: ${emp.employee_id}\nSalary: ${formatCurrency(emp.gross_salary)}`);
    } catch (error) {
        showError('Failed to load employee: ' + error.message);
    }
}

async function deleteEmployee(id) {
    confirmAction('Are you sure you want to delete this employee?', async () => {
        try {
            await apiCall(`/employees/${id}`, { method: 'DELETE' });
            showSuccess('Employee deleted successfully');
            loadEmployees(currentEmployeePage);
        } catch (error) {
            showError('Failed to delete employee: ' + error.message);
        }
    });
}

async function exportEmployees() {
    try {
        const params = new URLSearchParams(employeeFilters);
        window.open(`${API_BASE_URL}/employees/export/excel?${params}`, '_blank');
        showSuccess('Export started');
    } catch (error) {
        showError('Failed to export: ' + error.message);
    }
}

function showAddEmployeeModal() {
    showSuccess('Add employee form - to be implemented');
}

function editEmployee(id) {
    showSuccess('Edit employee form - to be implemented');
}

function manageDocuments(id) {
    showSuccess('Document management - to be implemented');
}
