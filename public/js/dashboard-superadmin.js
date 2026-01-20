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

// Store all employees to avoid re-fetching
let allEmployees = [];

async function openLeaveModal() {
    const leaveModal = document.getElementById('leaveModal');
    if (!leaveModal) return;

    const companySelect = leaveModal.querySelector('#companyId');
    const employeeSelect = leaveModal.querySelector('#employeeId');

    // Populate companies dropdown
    companySelect.innerHTML = '<option>Loading...</option>';
    try {
        const res = await fetch('/api/companies', { credentials: 'include' });
        const data = await res.json();
        const companies = data.companies || data || [];
        companySelect.innerHTML = '<option value="">Select Company</option>';
        companies.forEach(comp => {
            const option = document.createElement('option');
            option.value = comp.id;
            option.textContent = `${comp.name} (${comp.code})`;
            companySelect.appendChild(option);
        });
    } catch (error) {
        companySelect.innerHTML = '<option>Failed to load companies</option>';
        console.error('Failed to fetch companies for leave modal:', error);
    }

    // Fetch all employees once
    if (allEmployees.length === 0) {
        try {
            const res = await fetch('/api/employees', { credentials: 'include' });
            const data = await res.json();
            allEmployees = data.employees || [];
        } catch (error) {
            console.error('Failed to fetch employees:', error);
        }
    }
    
    // Add event listener to company dropdown to filter employees
    companySelect.addEventListener('change', () => {
        const companyId = companySelect.value;
        employeeSelect.innerHTML = '<option value="">Select Employee</option>';
        if (companyId) {
            const filteredEmployees = allEmployees.filter(emp => emp.company_id == companyId);
            filteredEmployees.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.id;
                option.textContent = `${emp.first_name} ${emp.last_name || ''} (${emp.employee_id})`;
                employeeSelect.appendChild(option);
            });
        }
    });

    leaveModal.classList.remove('hidden');
}

function closeLeaveModal() {
  const modal = document.getElementById('leaveModal');
  if (modal) {
    modal.classList.add('hidden');
    document.getElementById('leaveForm').reset();
    // Reset employee dropdown
    modal.querySelector('#employeeId').innerHTML = '';
  }
}

async function handleLeaveSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());

  if (!data.employee_id) {
    alert('Please select a company and an employee.');
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

  tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-gray-400 py-2">Loading...</td></tr>';
  
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
        <td>${rec.company_name}</td>
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
    
    tableBody.innerHTML = rows.length ? rows : '<tr><td colspan="7" class="text-center text-gray-400 py-2">No leave records found.</td></tr>';
  } catch (err) {
    console.error('Error loading leave records:', err);
    tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-red-400 py-2">Error: ${err.message}</td></tr>`;
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
  const contentArea = document.getElementById('contentArea');
  
  switch(page) {
    case 'dashboard':
      pageTitle.textContent = 'Dashboard';
      await loadDashboard();
      break;
    case 'companies':
      window.location.href = '/companies.html';
      break;
    case 'employees':
      window.location.href = '/employee-view.html';
      break;
    case 'documents':
        window.location.href = '/documents.html';
      break;
    case 'users':
      window.location.href = '/users.html';
      break;
    case 'logs':
      window.location.href = '/logs.html';
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
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div class="stat-card bg-white rounded-lg shadow p-4 border-l-4 border-blue-600">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-500 text-xs">Companies</p>
              <p class="text-2xl font-bold text-blue-700">${data.total_companies || 0}</p>
            </div>
            <i class="fas fa-building text-3xl text-blue-200"></i>
          </div>
        </div>
        <div class="stat-card bg-white rounded-lg shadow p-4 border-l-4 border-green-600">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-500 text-xs">Employees</p>
              <p class="text-2xl font-bold text-green-700">${data.total_employees || 0}</p>
            </div>
            <i class="fas fa-users text-3xl text-green-200"></i>
          </div>
        </div>
        <div class="stat-card bg-white rounded-lg shadow p-4 border-l-4 border-yellow-600">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-500 text-xs">Total Salary</p>
              <p class="text-lg font-bold text-yellow-700">₹${(data.total_salary || 0).toLocaleString('en-IN')}</p>
            </div>
            <i class="fas fa-money-bill text-3xl text-yellow-200"></i>
          </div>
        </div>
        <div class="stat-card bg-white rounded-lg shadow p-4 border-l-4 border-purple-600">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-500 text-xs">New Joinings</p>
              <p class="text-2xl font-bold text-purple-700">${data.new_joinings_this_month || 0}</p>
            </div>
            <i class="fas fa-user-plus text-3xl text-purple-200"></i>
          </div>
        </div>
      </div>
      
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div class="bg-white rounded-lg shadow p-4">
          <h3 class="text-base font-semibold text-blue-800 mb-3"><i class="fas fa-chart-pie mr-2"></i>Company Employee Distribution</h3>
          <canvas id="companyChart" style="max-height: 250px;"></canvas>
        </div>
        <div class="bg-white rounded-lg shadow p-4">
          <h3 class="text-base font-semibold text-blue-800 mb-3"><i class="fas fa-chart-bar mr-2"></i>Department Distribution</h3>
          <canvas id="departmentChart" style="max-height: 250px;"></canvas>
        </div>
      </div>
      
      <div class="bg-white rounded-lg shadow p-4 max-h-80 overflow-auto">
        <h3 class="text-base font-semibold text-blue-800 mb-3 sticky top-0 bg-white"><i class="fas fa-building mr-2"></i>Company Distribution</h3>
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="bg-blue-50 sticky top-8">
              <tr>
                <th class="px-3 py-2 text-left text-xs font-semibold text-blue-800">Company</th>
                <th class="px-3 py-2 text-left text-xs font-semibold text-blue-800">Code</th>
                <th class="px-3 py-2 text-right text-xs font-semibold text-blue-800">Employees</th>
                <th class="px-3 py-2 text-right text-xs font-semibold text-blue-800">Total Salary</th>
              </tr>
            </thead>
            <tbody>
              ${(data.company_distribution || []).map(c => `
                <tr class="border-b hover:bg-blue-50">
                  <td class="px-3 py-2">${c.name}</td>
                  <td class="px-3 py-2"><span class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">${c.code}</span></td>
                  <td class="px-3 py-2 text-right">${c.employee_count}</td>
                  <td class="px-3 py-2 text-right">₹${(c.total_salary || 0).toLocaleString('en-IN')}</td>
                </tr>
              `).join('') || '<tr><td colspan="4" class="px-3 py-2 text-center text-gray-500">No data</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    // Create charts
    createCompanyChart(data.company_distribution || []);
    createDepartmentChart(data.department_distribution || []);
  } catch (err) {
    contentArea.innerHTML = `<div class='bg-red-50 border border-red-200 rounded p-4 text-red-700'><i class="fas fa-exclamation-triangle mr-2"></i>${err.message}</div>`;
  }
}

function createCompanyChart(companies) {
  const ctx = document.getElementById('companyChart');
  if (!ctx) return;
  
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: companies.map(c => c.code),
      datasets: [{
        data: companies.map(c => c.employee_count),
        backgroundColor: [
          '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { boxWidth: 12, font: { size: 11 } }
        },
        title: {
          display: false
        }
      }
    }
  });
}

function createDepartmentChart(departments) {
  const ctx = document.getElementById('departmentChart');
  if (!ctx) return;
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: departments.map(d => d.department),
      datasets: [{
        label: 'Employees',
        data: departments.map(d => d.count),
        backgroundColor: '#3b82f6',
        borderColor: '#1e40af',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        title: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { font: { size: 10 } }
        },
        x: {
          ticks: { font: { size: 10 } }
        }
      }
    }
  });
}