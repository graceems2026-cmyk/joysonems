let currentPage = 'dashboard';
const user = JSON.parse(localStorage.getItem('user') || '{}');

document.addEventListener('DOMContentLoaded', async () => {
  // Check if session is valid
  try {
    const response = await fetch('/api/auth/me', { credentials: 'include' });
    if (!response.ok) {
      window.location.href = '/login.html';
      return;
    }
    const sessionUser = await response.json();
    if (sessionUser.id) {
      // Update localStorage with fresh user data
      localStorage.setItem('user', JSON.stringify(sessionUser));
    }
  } catch (error) {
    window.location.href = '/login.html';
    return;
  }

  // Setup event listeners
  document.getElementById('logoutBtn').onclick = logout;
  document.getElementById('menuToggle')?.addEventListener('click', toggleSidebar);
  document.getElementById('closeSidebar')?.addEventListener('click', toggleSidebar);
  
  // Navigation
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const page = e.currentTarget.getAttribute('href').substring(1);
      loadPage(page);
      if (window.innerWidth < 768) toggleSidebar();
    });
  });

  loadPage('dashboard');
  
  // Leave Modal Listeners
  document.getElementById('addLeaveBtn')?.addEventListener('click', openLeaveModal);
  document.getElementById('cancelLeaveBtn')?.addEventListener('click', closeLeaveModal);
  document.getElementById('leaveForm')?.addEventListener('submit', handleLeaveSubmit);

  loadLeaveRecords();
});

// Leave Records Modal and Logic
async function openLeaveModal() {
    const leaveModal = document.getElementById('leaveModal');
    if (!leaveModal) return;

    // Populate employees dropdown
    const employeeSelect = leaveModal.querySelector('#employeeId');
    employeeSelect.innerHTML = '<option>Loading...</option>';
    try {
        const res = await fetch('/api/employees', { credentials: 'include' });
        const data = await res.json();
        const employees = data.employees || [];
        employeeSelect.innerHTML = '<option value="">Select Employee</option>';
        employees.forEach(emp => {
            const option = document.createElement('option');
            option.value = emp.id;
            option.textContent = `${emp.first_name} ${emp.last_name || ''} (${emp.employee_id})`;
            employeeSelect.appendChild(option);
        });
    } catch (error) {
        employeeSelect.innerHTML = '<option>Failed to load employees</option>';
        console.error('Failed to fetch employees for leave modal:', error);
    }

    leaveModal.classList.remove('hidden');
}


function closeLeaveModal() {
  const modal = document.getElementById('leaveModal');
  if (modal) {
    modal.classList.add('hidden');
    document.getElementById('leaveForm').reset();
  }
}

async function handleLeaveSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  if (!data.employee_id) {
    alert('Please select an employee.');
    return;
  }

  try {
    const res = await fetch(`/api/employees/${data.employee_id}/leave`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        type: data.leave_type,
        from_date: data.from_date,
        to_date: data.to_date,
        reason: data.reason
      })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to add leave record');
    
    closeLeaveModal();
    loadLeaveRecords();
    alert('Leave record added successfully!');
  } catch (err) {
    alert(`Error: ${err.message}`);
    console.error('Leave submission error:', err);
  }
}

async function loadLeaveRecords() {
  const tableBody = document.querySelector('#leaveRecordsTable tbody');
  if (!tableBody) return;

  tableBody.innerHTML = '<tr><td colspan="6" class="text-center text-gray-400 py-2">Loading...</td></tr>';
  
  try {
    const res = await fetch('/api/employees/all/leaves', { credentials: 'include' });
    if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch leave records');
    }
    const leaves = await res.json();
    
    if (!Array.isArray(leaves)) {
        throw new Error("Unexpected response format from server.");
    }
    
    let rows = leaves.map(rec => `
      <tr>
        <td>${rec.first_name} ${rec.last_name || ''}</td>
        <td>${rec.type}</td>
        <td>${rec.from_date}</td>
        <td>${rec.to_date}</td>
        <td>${rec.reason || ''}</td>
        <td>
          <span class="badge ${rec.status === 'Approved' ? 'badge-green' : rec.status === 'Rejected' ? 'badge-red' : 'badge-blue'}">
            ${rec.status || 'Pending'}
          </span>
        </td>
      </tr>
    `).join('');
    
    tableBody.innerHTML = rows.length ? rows : '<tr><td colspan="6" class="text-center text-gray-400 py-2">No leave records found.</td></tr>';
  } catch (err) {
    console.error('Error loading leave records:', err);
    tableBody.innerHTML = `<tr><td colspan="6" class="text-center text-red-400 py-2">Error: ${err.message}</td></tr>`;
  }
}


function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('hidden-mobile');
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}

async function loadPage(page) {
  currentPage = page;
  const pageTitle = document.getElementById('pageTitle');
  
  switch(page) {
    case 'dashboard':
      pageTitle.textContent = 'Dashboard';
      await loadDashboard();
      break;
    case 'employees':
      pageTitle.textContent = 'Employees';
      await loadEmployees();
      break;
    case 'documents':
      window.location.href = '/documents.html';
      break;
  }
}

async function loadDashboard() {
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = '<div class="flex justify-center py-12"><i class="fas fa-spinner fa-spin text-4xl text-blue-600"></i></div>';
  
  try {
    const res = await fetch('/api/dashboard/stats', {
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load dashboard');
    
    contentArea.innerHTML = `
      <!-- Stats Cards -->
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; margin-bottom: 1rem;">
        <div class="stat-card bg-white rounded-lg shadow p-3 border-l-4 border-blue-600">
          <p class="text-gray-500 text-xs">Company</p>
          <p class="text-sm font-bold text-blue-700 truncate">${data.company_name || 'N/A'}</p>
        </div>
        <div class="stat-card bg-white rounded-lg shadow p-3 border-l-4 border-green-600">
          <p class="text-gray-500 text-xs">Employees</p>
          <p class="text-xl font-bold text-green-700">${data.total_employees || 0}</p>
        </div>
        <div class="stat-card bg-white rounded-lg shadow p-3 border-l-4 border-yellow-600">
          <p class="text-gray-500 text-xs">Total Salary</p>
          <p class="text-sm font-bold text-yellow-700">₹${(data.total_salary || 0).toLocaleString('en-IN')}</p>
        </div>
        <div class="stat-card bg-white rounded-lg shadow p-3 border-l-4 border-purple-600">
          <p class="text-gray-500 text-xs">New Joins</p>
          <p class="text-xl font-bold text-purple-700">${data.new_joinings_this_month || 0}</p>
        </div>
      </div>
      
      <!-- Charts -->
      <div style="display: grid; grid-template-columns: 1fr; gap: 0.75rem; margin-bottom: 1rem;">
        <div class="chart-card">
          <h3 class="text-xs font-semibold text-blue-800 mb-2"><i class="fas fa-chart-pie mr-1"></i>Departments</h3>
          <div class="chart-container">
            <canvas id="departmentChart"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <h3 class="text-xs font-semibold text-blue-800 mb-2"><i class="fas fa-chart-bar mr-1"></i>Designations</h3>
          <div class="chart-container">
            <canvas id="designationChart"></canvas>
          </div>
        </div>
      </div>
      
      <!-- Department Table -->
      <div class="table-card mb-3">
        <div class="p-2 border-b">
          <h3 class="text-xs font-semibold text-blue-800"><i class="fas fa-list mr-1"></i>Departments</h3>
        </div>
        <div class="table-scroll-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Count</th>
                <th>Salary</th>
              </tr>
            </thead>
            <tbody>
              ${(data.department_distribution || []).map(d => `
                <tr>
                  <td>${d.department}</td>
                  <td><span class="badge badge-blue">${d.count}</span></td>
                  <td>₹${(d.total_salary || 0).toLocaleString('en-IN')}</td>
                </tr>
              `).join('') || '<tr><td colspan="3" class="text-center text-gray-400 py-2">No data</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Recent Employees -->
      <div class="table-card">
        <div class="p-2 border-b">
          <h3 class="text-xs font-semibold text-blue-800"><i class="fas fa-users mr-1"></i>Recent Employees</h3>
        </div>
        <div id="recentEmployeesTable">
          <div class="p-3 text-center text-gray-500 text-sm">Loading...</div>
        </div>
      </div>
    `;
    
    // Create charts
    createDepartmentChart(data.department_distribution || []);
    createDesignationChart(data.designation_distribution || []);
    
    // Load recent employees with photos
    loadRecentEmployees();
  } catch (err) {
    contentArea.innerHTML = `<div class='bg-red-50 border border-red-200 rounded p-4 text-red-700'><i class="fas fa-exclamation-triangle mr-2"></i>${err.message}</div>`;
  }
}

function createDepartmentChart(departments) {
  const ctx = document.getElementById('departmentChart');
  if (!ctx) return;
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: departments.map(d => d.department),
      datasets: [{
        data: departments.map(d => d.count),
        backgroundColor: [
          '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
        ],
        borderWidth: 1,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '40%',
      plugins: {
        legend: {
          position: 'right',
          labels: { 
            boxWidth: 8, 
            font: { size: 9 }, 
            padding: 4,
            usePointStyle: true
          }
        }
      },
      layout: {
        padding: 0
      }
    }
  });
}

function createDesignationChart(designations) {
  const ctx = document.getElementById('designationChart');
  if (!ctx) return;
  
  // Truncate long labels
  const truncatedLabels = designations.map(d => 
    d.designation.length > 10 ? d.designation.substring(0, 10) + '..' : d.designation
  );
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: truncatedLabels,
      datasets: [{
        label: 'Employees',
        data: designations.map(d => d.count),
        backgroundColor: '#3b82f6',
        borderColor: '#1e40af',
        borderWidth: 1,
        barThickness: 20,
        maxBarThickness: 30
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { font: { size: 9 }, stepSize: 1 },
          grid: { display: false }
        },
        y: {
          ticks: { font: { size: 9 } },
          grid: { display: false }
        }
      },
      layout: {
        padding: 0
      }
    }
  });
}

async function loadRecentEmployees() {
  try {
    const res = await fetch('/api/employees?limit=5', {
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load employees');
    
    const employees = data.data || data.employees || [];
    const tableHtml = `
      <div class="table-scroll-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Dept</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${employees.map(e => `
              <tr>
                <td><span class="badge badge-blue">${e.employee_id}</span></td>
                <td>${e.first_name} ${e.last_name || ''}</td>
                <td>${e.department || '-'}</td>
                <td>
                  <span class="status-badge ${
                    e.status === 'Active' ? 'status-active' : 
                    e.status === 'On Leave' ? 'status-leave' : 
                    'status-inactive'
                  }">${e.status || 'Active'}</span>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="4" class="text-center text-gray-400 py-2">No employees</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
    
    document.getElementById('recentEmployeesTable').innerHTML = tableHtml;
  } catch (err) {
    document.getElementById('recentEmployeesTable').innerHTML = `
      <div class='text-red-600 text-sm'><i class="fas fa-exclamation-triangle mr-2"></i>${err.message}</div>
    `;
  }
}

async function loadEmployees() {
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = `
    <div class="mb-4 flex justify-between items-center flex-wrap gap-2">
      <h3 class="text-lg font-semibold text-blue-800"><i class="fas fa-users mr-2"></i>Manage Employees</h3>
      <div class="flex gap-2">
        <button onclick="window.location.href='/employee-view.html'" class="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          <i class="fas fa-th mr-2"></i>View All
        </button>
        <button onclick="window.location.href='/add-employee.html'" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          <i class="fas fa-plus mr-2"></i>Add Employee
        </button>
      </div>
    </div>
    <div id="employeesTable" class="bg-white rounded-lg shadow">
      <div class="flex justify-center py-12"><i class="fas fa-spinner fa-spin text-4xl text-blue-600"></i></div>
    </div>
  `;
  
  try {
    const res = await fetch('/api/employees', {
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load employees');
    
    const employees = data.data || data.employees || [];
    document.getElementById('employeesTable').innerHTML = `
      <!-- Desktop Table View -->
      <div class="hidden md:block overflow-x-auto">
        <table class="min-w-full">
          <thead class="bg-blue-50">
            <tr>
              <th class="px-4 py-3 text-left text-sm font-semibold text-blue-800">Photo</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-blue-800">ID</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-blue-800">Name</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-blue-800">Department</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-blue-800">Designation</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-blue-800">Emergency Contact</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-blue-800">Salary</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-blue-800">Status</th>
              <th class="px-4 py-3 text-left text-sm font-semibold text-blue-800">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${employees.map(e => `
              <tr class="border-b hover:bg-blue-50">
                <td class="px-4 py-3">
                  ${e.profile_photo ? 
                    `<img src="/${e.profile_photo}" 
                         alt="${e.first_name}" 
                         class="w-12 h-12 rounded-full object-cover border-2 border-blue-200"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                     <div class="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold" style="display:none;">
                       ${(e.first_name?.[0] || '') + (e.last_name?.[0] || '')}
                     </div>` :
                    `<div class="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                       ${(e.first_name?.[0] || '') + (e.last_name?.[0] || '')}
                     </div>`
                  }
                </td>
                <td class="px-4 py-3"><span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">${e.employee_id}</span></td>
                <td class="px-4 py-3 font-medium">${e.first_name} ${e.last_name || ''}</td>
                <td class="px-4 py-3">${e.department || '-'}</td>
                <td class="px-4 py-3">${e.designation || '-'}</td>
                <td class="px-4 py-3">
                  ${e.emergency_contact_phone ? 
                    `<a href="tel:${e.emergency_contact_phone}" class="text-red-600 font-semibold hover:underline">
                      <i class="fas fa-phone-alt mr-1"></i>${e.emergency_contact_phone}
                    </a>` : 
                    '<span class="text-gray-400 text-sm">Not set</span>'}
                </td>
                <td class="px-4 py-3">₹${(e.gross_salary || e.basic_salary || 0).toLocaleString('en-IN')}</td>
                <td class="px-4 py-3">
                  <span class="px-2 py-1 rounded text-xs ${
                    e.status === 'Active' ? 'bg-green-100 text-green-800' : 
                    e.status === 'On Leave' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-gray-100 text-gray-800'
                  }">
                    ${e.status || 'Active'}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <button onclick="window.location.href='/employee-details.html?id=${e.id}'" class="text-blue-600 hover:text-blue-800 mr-2" title="View">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button onclick="window.location.href='/add-employee.html?id=${e.id}'" class="text-green-600 hover:text-green-800" title="Edit">
                    <i class="fas fa-edit"></i>
                  </button>
                </td>
              </tr>
            `).join('') || '<tr><td colspan="9" class="px-4 py-3 text-center text-gray-500">No employees found</td></tr>'}
          </tbody>
        </table>
      </div>
      
      <!-- Mobile Card View -->
      <div class="md:hidden space-y-3 p-3">
        ${employees.map(e => `
          <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div class="flex items-start gap-3 mb-3">
              ${e.profile_photo ? 
                `<img src="/${e.profile_photo}" 
                     alt="${e.first_name}" 
                     class="w-16 h-16 rounded-full object-cover border-2 border-blue-200"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                 <div class="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg" style="display:none;">
                   ${(e.first_name?.[0] || '') + (e.last_name?.[0] || '')}
                 </div>` :
                `<div class="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                   ${(e.first_name?.[0] || '') + (e.last_name?.[0] || '')}
                 </div>`
              }
              <div class="flex-1">
                <h3 class="font-bold text-gray-900">${e.first_name} ${e.last_name || ''}</h3>
                <p class="text-sm text-blue-600">${e.designation || '-'}</p>
                <span class="inline-block mt-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">${e.employee_id}</span>
              </div>
              <span class="px-2 py-1 rounded text-xs ${
                e.status === 'Active' ? 'bg-green-100 text-green-800' : 
                e.status === 'On Leave' ? 'bg-yellow-100 text-yellow-800' : 
                'bg-gray-100 text-gray-800'
              }">
                ${e.status || 'Active'}
              </span>
            </div>
            
            <div class="space-y-2 text-sm">
              <div class="flex items-center text-gray-600">
                <i class="fas fa-briefcase w-5 mr-2"></i>
                <span>${e.department || '-'}</span>
              </div>
              <div class="flex items-center ${e.emergency_contact_phone ? 'text-red-600 font-semibold' : 'text-gray-400'}">
                <i class="fas fa-phone-alt w-5 mr-2"></i>
                ${e.emergency_contact_phone ? 
                  `<a href="tel:${e.emergency_contact_phone}" class="hover:underline">${e.emergency_contact_phone}</a>` : 
                  '<span>Not set</span>'}
              </div>
              <div class="flex items-center text-gray-600">
                <i class="fas fa-rupee-sign w-5 mr-2"></i>
                <span>₹${(e.gross_salary || e.basic_salary || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>
            
            <div class="flex gap-2 mt-3 pt-3 border-t">
              <button onclick="window.location.href='/employee-details.html?id=${e.id}'" 
                      class="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700">
                <i class="fas fa-eye mr-1"></i> View
              </button>
              <button onclick="window.location.href='/add-employee.html?id=${e.id}'" 
                      class="flex-1 bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700">
                <i class="fas fa-edit mr-1"></i> Edit
              </button>
            </div>
          </div>
        `).join('') || '<div class="text-center text-gray-500 py-8">No employees found</div>'}
      </div>
    `;
  } catch (err) {
    document.getElementById('employeesTable').innerHTML = `
      <div class='bg-red-50 border border-red-200 rounded p-4 text-red-700 m-4'>
        <i class="fas fa-exclamation-triangle mr-2"></i>${err.message}
      </div>`;
  }
}

async function loadDocuments() {
  const contentArea = document.getElementById('contentArea');
  contentArea.innerHTML = `
    <div class="bg-white rounded-lg shadow">
      <!-- Search and Filter -->
      <div class="p-4 border-b">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div class="md:col-span-1">
            <input type="text" id="docSearch" placeholder="Search by name or employee ID..." 
                   class="w-full border rounded px-3 py-2 text-sm">
          </div>
          <div>
            <select id="docTypeFilter" class="w-full border rounded px-3 py-2 text-sm">
              <option value="">All Document Types</option>
              <option value="aadhaar">Aadhaar Card</option>
              <option value="driving_license">Driving License</option>
              <option value="bank_passbook">Bank Passbook</option>
            </select>
          </div>
          <div>
            <select id="statusFilter" class="w-full border rounded px-3 py-2 text-sm">
              <option value="">All Status</option>
              <option value="complete">Complete (All 3 Docs)</option>
              <option value="incomplete">Incomplete</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Documents Table -->
      <div id="documentsTable" class="p-4">
        <div class="flex justify-center py-12">
          <i class="fas fa-spinner fa-spin text-4xl text-blue-600"></i>
        </div>
      </div>
    </div>
  `;

  // Setup event listeners
  document.getElementById('docSearch').addEventListener('input', filterDocuments);
  document.getElementById('docTypeFilter').addEventListener('change', filterDocuments);
  document.getElementById('statusFilter').addEventListener('change', filterDocuments);

  // Load documents
  await fetchDocuments();
}

let allDocuments = [];

async function fetchDocuments() {
  try {
    const res = await fetch('/api/employees', {
      credentials: 'include'
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to load documents');

    // Handle different response formats - same as loadEmployees
    allDocuments = data.data || data.employees || [];
    console.log('Fetched documents for employees:', allDocuments.length);
    displayDocuments(allDocuments);
  } catch (err) {
    console.error('Error fetching documents:', err);
    document.getElementById('documentsTable').innerHTML = `
      <div class='bg-red-50 border border-red-200 rounded p-4 text-red-700'>
        <i class="fas fa-exclamation-triangle mr-2"></i>${err.message}
      </div>`;
  }
}

function filterDocuments() {
  const searchTerm = document.getElementById('docSearch').value.toLowerCase();
  const docType = document.getElementById('docTypeFilter').value;
  const status = document.getElementById('statusFilter').value;

  let filtered = allDocuments.filter(emp => {
    // Search filter
    const matchesSearch = !searchTerm || 
      emp.first_name.toLowerCase().includes(searchTerm) ||
      (emp.last_name && emp.last_name.toLowerCase().includes(searchTerm)) ||
      emp.employee_id.toLowerCase().includes(searchTerm);

    // Document type filter
    let matchesDocType = true;
    if (docType === 'aadhaar') {
      matchesDocType = !!emp.aadhaar_attachment;
    } else if (docType === 'driving_license') {
      matchesDocType = !!emp.driving_license_attachment;
    } else if (docType === 'bank_passbook') {
      matchesDocType = !!emp.bank_passbook_attachment;
    }

    // Status filter
    let matchesStatus = true;
    if (status === 'complete') {
      matchesStatus = emp.aadhaar_attachment && emp.driving_license_attachment && emp.bank_passbook_attachment;
    } else if (status === 'incomplete') {
      matchesStatus = !emp.aadhaar_attachment || !emp.driving_license_attachment || !emp.bank_passbook_attachment;
    }

    return matchesSearch && matchesDocType && matchesStatus;
  });

  displayDocuments(filtered);
}

function displayDocuments(employees) {
  const container = document.getElementById('documentsTable');
  
  if (employees.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500">
        <i class="fas fa-folder-open text-5xl mb-3"></i>
        <p>No documents found</p>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-blue-50">
          <tr>
            <th class="px-4 py-3 text-left font-semibold text-blue-800">Employee</th>
            <th class="px-4 py-3 text-left font-semibold text-blue-800">Department</th>
            <th class="px-4 py-3 text-center font-semibold text-blue-800">Aadhaar Card</th>
            <th class="px-4 py-3 text-center font-semibold text-blue-800">Driving License</th>
            <th class="px-4 py-3 text-center font-semibold text-blue-800">Bank Passbook</th>
            <th class="px-4 py-3 text-center font-semibold text-blue-800">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          ${employees.map(emp => {
            const hasAadhaar = !!emp.aadhaar_attachment;
            const hasDL = !!emp.driving_license_attachment;
            const hasBank = !!emp.bank_passbook_attachment;
            const docsCount = [hasAadhaar, hasDL, hasBank].filter(Boolean).length;
            const isComplete = docsCount === 3;
            
            return `
              <tr class="hover:bg-gray-50">
                <td class="px-4 py-3">
                  <div class="font-medium text-gray-900">${emp.first_name} ${emp.last_name || ''}</div>
                  <div class="text-xs text-gray-500">${emp.employee_id}</div>
                </td>
                <td class="px-4 py-3 text-gray-700">${emp.department || '-'}</td>
                <td class="px-4 py-3 text-center">
                  ${hasAadhaar ? 
                    `<a href="${emp.aadhaar_attachment.startsWith('/') ? emp.aadhaar_attachment : '/' + emp.aadhaar_attachment}" 
                        target="_blank" 
                        class="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs hover:bg-green-200">
                      <i class="fas fa-file-pdf mr-1"></i> View
                    </a>` : 
                    `<span class="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                      <i class="fas fa-times mr-1"></i> Missing
                    </span>`
                  }
                </td>
                <td class="px-4 py-3 text-center">
                  ${hasDL ? 
                    `<a href="${emp.driving_license_attachment.startsWith('/') ? emp.driving_license_attachment : '/' + emp.driving_license_attachment}" 
                        target="_blank" 
                        class="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs hover:bg-green-200">
                      <i class="fas fa-file-pdf mr-1"></i> View
                    </a>` : 
                    `<span class="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                      <i class="fas fa-times mr-1"></i> Missing
                    </span>`
                  }
                </td>
                <td class="px-4 py-3 text-center">
                  ${hasBank ? 
                    `<a href="${emp.bank_passbook_attachment.startsWith('/') ? emp.bank_passbook_attachment : '/' + emp.bank_passbook_attachment}" 
                        target="_blank" 
                        class="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs hover:bg-green-200">
                      <i class="fas fa-file-pdf mr-1"></i> View
                    </a>` : 
                    `<span class="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                      <i class="fas fa-times mr-1"></i> Missing
                    </span>`
                  }
                </td>
                <td class="px-4 py-3 text-center">
                  ${isComplete ? 
                    `<span class="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                      <i class="fas fa-check-circle mr-1"></i> Complete
                    </span>` : 
                    `<span class="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                      <i class="fas fa-exclamation-circle mr-1"></i> ${docsCount}/3 Docs
                    </span>`
                  }
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="mt-4 p-4 bg-blue-50 border-t">
      <div class="flex justify-between text-sm text-gray-600">
        <span>Showing ${employees.length} employee${employees.length !== 1 ? 's' : ''}</span>
        <span>
          Complete: ${employees.filter(e => e.aadhaar_attachment && e.driving_license_attachment && e.bank_passbook_attachment).length} | 
          Incomplete: ${employees.filter(e => !e.aadhaar_attachment || !e.driving_license_attachment || !e.bank_passbook_attachment).length}
        </span>
      </div>
    </div>
  `;
}