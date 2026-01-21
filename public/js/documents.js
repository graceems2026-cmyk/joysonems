// Documents page - Table View for All Employees and Key Documents

async function loadDocuments() {
    document.getElementById('documentsContent').innerHTML = `
        <div class="overflow-x-auto">
            <table class="min-w-full bg-white rounded-lg shadow text-sm">
                <thead class="bg-blue-50">
                    <tr>
                        <th class="px-4 py-2 text-left">Company</th>
                        <th class="px-4 py-2 text-left">Employee</th>
                        <th class="px-4 py-2 text-left">Department</th>
                        <th class="px-4 py-2 text-left">Aadhaar Card</th>
                        <th class="px-4 py-2 text-left">Driving License</th>
                        <th class="px-4 py-2 text-left">Bank Passbook</th>
                        <th class="px-4 py-2 text-left">Status</th>
                    </tr>
                </thead>
                <tbody id="documentsTableBody">
                    <tr><td colspan="7" class="text-center py-8 text-gray-400"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>
                </tbody>
            </table>
        </div>
    `;
    await renderDocumentsTable();
}

async function renderDocumentsTable() {
    // Fetch all employees and their documents
    let employees = [];
    try {
        const res = await apiCall('/employees');
        console.log('Documents page - Employees loaded:', res.employees ? res.employees.length : 0, res.employees);
        employees = res.employees || [];
    } catch (e) {
        console.error('Failed to load employees:', e);
        document.getElementById('documentsTableBody').innerHTML = `<tr><td colspan="7" class="text-center text-red-500">Failed to load employees</td></tr>`;
        return;
    }

    // For each employee, fetch their documents
    const rows = await Promise.all(employees.map(async emp => {
        let docs = [];
        try {
            docs = await apiCall(`/documents/employee/${emp.id}`);
        } catch {}
        // Find key docs from employee_documents
        let aadhaar = docs.find(d => d.document_type && d.document_type.toLowerCase().includes('aadhaar'));
        let dl = docs.find(d => d.document_type && d.document_type.toLowerCase().includes('driving'));
        let passbook = docs.find(d => d.document_type && d.document_type.toLowerCase().includes('bank'));

        // Fallback to employee table attachment columns if employee_documents entries are missing
        if (!aadhaar && emp.aadhaar_attachment) {
            aadhaar = { document_type: 'aadhaar', file_path: emp.aadhaar_attachment };
        }
        if (!dl && emp.driving_license_attachment) {
            dl = { document_type: 'driving', file_path: emp.driving_license_attachment };
        }
        if (!passbook && emp.bank_passbook_attachment) {
            passbook = { document_type: 'bank', file_path: emp.bank_passbook_attachment };
        }
        // Status
        const docCount = [aadhaar, dl, passbook].filter(Boolean).length;
        const status = docCount === 3 ? 'complete' : 'incomplete';
        // Row HTML
        return `<tr>
            <td class="px-4 py-2">
                <div class="font-semibold">${emp.company_name || ''}</div>
                <div class="text-xs text-gray-500">${emp.company_code || ''}</div>
            </td>
            <td class="px-4 py-2">
                <div class="font-bold">${emp.first_name} ${emp.last_name || ''}</div>
                <div class="text-xs text-gray-500">${emp.mobile || ''}</div>
            </td>
            <td class="px-4 py-2">${emp.department || ''}</td>
            <td class="px-4 py-2">${aadhaar ? `<span class='bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold cursor-pointer' onclick='window.open("/${aadhaar.file_path}","_blank")'><i class="fas fa-id-card"></i> View</span>` : `<span class='bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-semibold'><i class="fas fa-times"></i> Missing</span>`}</td>
            <td class="px-4 py-2">${dl ? `<span class='bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold cursor-pointer' onclick='window.open("/${dl.file_path}","_blank")'><i class="fas fa-id-card"></i> View</span>` : `<span class='bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-semibold'><i class="fas fa-times"></i> Missing</span>`}</td>
            <td class="px-4 py-2">${passbook ? `<span class='bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold cursor-pointer' onclick='window.open("/${passbook.file_path}","_blank")'><i class="fas fa-id-card"></i> View</span>` : `<span class='bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-semibold'><i class="fas fa-times"></i> Missing</span>`}</td>
            <td class="px-4 py-2">${status === 'complete' ? `<span class='bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-semibold'><i class="fas fa-check-circle"></i> Complete</span>` : `<span class='bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-semibold'><i class="fas fa-exclamation-circle"></i> ${docCount}/3 Docs</span>`}</td>
        </tr>`;
    }));
    document.getElementById('documentsTableBody').innerHTML = rows.join('');
}
