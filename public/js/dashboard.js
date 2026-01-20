// Dashboard page

async function loadDashboard() {
    showLoading('dashboardContent');
    
    try {
        const companyId = document.getElementById('companyFilter')?.value || '';
        const params = companyId ? `?company_id=${companyId}` : '';
        
        const [stats, salaryAnalytics, documentStats] = await Promise.all([
            apiCall(`/dashboard/stats${params}`),
            apiCall(`/dashboard/salary-analytics${params}`),
            apiCall(`/dashboard/document-stats${params}`)
        ]);
        
        renderDashboard(stats, salaryAnalytics, documentStats);
    } catch (error) {
        showError('Failed to load dashboard: ' + error.message, 'dashboardContent');
    }
}

function renderDashboard(stats, salaryAnalytics, documentStats) {
    const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
    
    let html = '<div class="space-y-6">';
    
    // Stats Cards
    html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">';
    
    if (isSuperAdmin) {
        html += `
            <div class="stat-card">
                <div class="flex items-center justify-between">
                    <div>
                        <p class="text-blue-100 text-sm">Total Companies</p>
                        <h3 class="text-3xl font-bold mt-1">${formatNumber(stats.total_companies)}</h3>
                    </div>
                    <div class="bg-white bg-opacity-20 rounded-lg p-3">
                        <i class="fas fa-building text-2xl"></i>
                    </div>
                </div>
            </div>
        `;
    }
    
    html += `
        <div class="stat-card">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-blue-100 text-sm">Total Employees</p>
                    <h3 class="text-3xl font-bold mt-1">${formatNumber(stats.total_employees)}</h3>
                </div>
                <div class="bg-white bg-opacity-20 rounded-lg p-3">
                    <i class="fas fa-users text-2xl"></i>
                </div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-blue-100 text-sm">Total Salary</p>
                    <h3 class="text-2xl font-bold mt-1">${formatCurrency(stats.total_salary)}</h3>
                </div>
                <div class="bg-white bg-opacity-20 rounded-lg p-3">
                    <i class="fas fa-money-bill-wave text-2xl"></i>
                </div>
            </div>
        </div>
        
        <div class="stat-card">
            <div class="flex items-center justify-between">
                <div>
                    <p class="text-blue-100 text-sm">New Joinings</p>
                    <h3 class="text-3xl font-bold mt-1">${formatNumber(stats.new_joinings_this_month)}</h3>
                    <p class="text-blue-100 text-xs mt-1">This Month</p>
                </div>
                <div class="bg-white bg-opacity-20 rounded-lg p-3">
                    <i class="fas fa-user-plus text-2xl"></i>
                </div>
            </div>
        </div>
    `;
    
    html += '</div>';
    
    // Charts and detailed stats
    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">';
    
    // Department Distribution
    if (stats.department_distribution && stats.department_distribution.length > 0) {
        html += `
            <div class="card p-6">
                <h3 class="text-lg font-semibold mb-4">Department Distribution</h3>
                <canvas id="deptChart" height="250"></canvas>
            </div>
        `;
    }
    
    // Monthly Joinings
    if (stats.monthly_joinings && stats.monthly_joinings.length > 0) {
        html += `
            <div class="card p-6">
                <h3 class="text-lg font-semibold mb-4">Monthly Joinings (Last 6 Months)</h3>
                <canvas id="monthlyChart" height="250"></canvas>
            </div>
        `;
    }
    
    html += '</div>';
    
    // Company Distribution (Super Admin only)
    if (isSuperAdmin && stats.company_distribution) {
        html += `
            <div class="card p-6">
                <h3 class="text-lg font-semibold mb-4">Company-wise Employee Distribution</h3>
                <canvas id="companyChart" height="200"></canvas>
            </div>
        `;
    }
    
    // Salary Analytics
    html += `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="card p-6">
                <h3 class="text-lg font-semibold mb-4">Salary Analytics</h3>
                <div class="space-y-3">
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span class="text-gray-600">Average Salary</span>
                        <span class="font-semibold text-primary">${formatCurrency(salaryAnalytics.average_salary)}</span>
                    </div>
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span class="text-gray-600">Minimum Salary</span>
                        <span class="font-semibold">${formatCurrency(salaryAnalytics.min_salary)}</span>
                    </div>
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span class="text-gray-600">Maximum Salary</span>
                        <span class="font-semibold">${formatCurrency(salaryAnalytics.max_salary)}</span>
                    </div>
                </div>
            </div>
            
            <div class="card p-6">
                <h3 class="text-lg font-semibold mb-4">Document Verification Status</h3>
                <div class="space-y-3">
                    <div class="flex justify-between items-center p-3 bg-green-50 rounded">
                        <span class="text-gray-600">Verified Documents</span>
                        <span class="font-semibold text-green-600">${formatNumber(documentStats.verified_documents)}</span>
                    </div>
                    <div class="flex justify-between items-center p-3 bg-yellow-50 rounded">
                        <span class="text-gray-600">Pending Verification</span>
                        <span class="font-semibold text-yellow-600">${formatNumber(documentStats.pending_documents)}</span>
                    </div>
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span class="text-gray-600">Total Documents</span>
                        <span class="font-semibold">${formatNumber(documentStats.total_documents)}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    html += '</div>';
    
    document.getElementById('dashboardContent').innerHTML = html;
    
    // Render charts
    setTimeout(() => {
        renderDashboardCharts(stats, salaryAnalytics);
    }, 100);
}

function renderDashboardCharts(stats, salaryAnalytics) {
    // Department Distribution Chart
    if (stats.department_distribution && stats.department_distribution.length > 0) {
        const deptCtx = document.getElementById('deptChart');
        if (deptCtx) {
            new Chart(deptCtx, {
                type: 'doughnut',
                data: {
                    labels: stats.department_distribution.map(d => d.department),
                    datasets: [{
                        data: stats.department_distribution.map(d => d.count),
                        backgroundColor: [
                            '#3b82f6', '#06b6d4', '#8b5cf6', '#ec4899', '#f59e0b',
                            '#10b981', '#ef4444', '#6366f1', '#14b8a6', '#f97316'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom' }
                    }
                }
            });
        }
    }
    
    // Monthly Joinings Chart
    if (stats.monthly_joinings && stats.monthly_joinings.length > 0) {
        const monthlyCtx = document.getElementById('monthlyChart');
        if (monthlyCtx) {
            new Chart(monthlyCtx, {
                type: 'bar',
                data: {
                    labels: stats.monthly_joinings.map(m => m.month_label || m.month),
                    datasets: [{
                        label: 'New Joinings',
                        data: stats.monthly_joinings.map(m => m.count),
                        backgroundColor: '#3b82f6'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }
    }
    
    // Company Distribution Chart (Super Admin)
    if (stats.company_distribution) {
        const companyCtx = document.getElementById('companyChart');
        if (companyCtx) {
            new Chart(companyCtx, {
                type: 'bar',
                data: {
                    labels: stats.company_distribution.map(c => c.name),
                    datasets: [{
                        label: 'Employees',
                        data: stats.company_distribution.map(c => c.employee_count),
                        backgroundColor: '#3b82f6'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    scales: {
                        x: { beginAtZero: true }
                    }
                }
            });
        }
    }
}
