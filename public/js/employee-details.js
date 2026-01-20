const urlParams = new URLSearchParams(window.location.search);
const employeeId = urlParams.get('id');

let currentEmployee = null;

// Load employee details on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication
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

    loadEmployeeDetails();
});

async function loadEmployeeDetails() {
    if (!employeeId) {
        alert('Invalid employee ID');
        window.history.back();
        return;
    }

    try {
        const res = await fetch(`/api/employees/${employeeId}`, {
            credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to load employee');

        currentEmployee = data;
        console.log('Employee data:', data);
        console.log('Emergency contact fields:', {
            emergency_contact: data.emergency_contact,
            emergency_contact_phone: data.emergency_contact_phone,
            emergency_contact_name: data.emergency_contact_name,
            emergency_contact_relation: data.emergency_contact_relation
        });
        displayEmployee(data);
    } catch (error) {
        alert('Error: ' + error.message);
        window.history.back();
    }
}

function displayEmployee(emp) {
    console.log('displayEmployee called with:', emp);
    document.getElementById('loadingIndicator').classList.add('hidden');
    document.getElementById('employeeDetails').classList.remove('hidden');

    // Emergency Contact in Navigation Bar
    const emergencyPhone = emp.emergency_contact_phone || emp.emergency_contact;
    const emergencyName = emp.emergency_contact_name || '';
    console.log('Emergency phone:', emergencyPhone);
    console.log('Emergency name:', emergencyName);
    
    if (emergencyPhone) {
        console.log('Showing emergency contact in nav');
        document.getElementById('emergencyInfo').classList.remove('hidden');
        
        // Set emergency contact person name for desktop
        if (emergencyName) {
            const namePerson = document.getElementById('emergencyContactPerson');
            if (namePerson) {
                namePerson.textContent = emergencyName;
            }
        }
        
        // Set emergency contact person name for mobile
        if (emergencyName) {
            const namePersonMobile = document.getElementById('emergencyContactPersonMobile');
            if (namePersonMobile) {
                namePersonMobile.textContent = emergencyName;
            }
        }
        
        const phoneLink = document.getElementById('emergencyPhone');
        phoneLink.textContent = emergencyPhone;
        phoneLink.href = `tel:${emergencyPhone}`;
        
        const phoneLinkMobile = document.getElementById('emergencyPhoneMobile');
        if (phoneLinkMobile) {
            phoneLinkMobile.href = `tel:${emergencyPhone}`;
        }
    } else {
        console.log('No emergency phone found');
    }

    // Profile Header
    const profilePhoto = document.getElementById('profilePhoto');
    if (emp.profile_photo) {
        const photoPath = emp.profile_photo.startsWith('/') ? emp.profile_photo : `/${emp.profile_photo}`;
        profilePhoto.src = photoPath;
        profilePhoto.onerror = () => {
            profilePhoto.src = `https://ui-avatars.com/api/?name=${emp.first_name}+${emp.last_name || ''}&size=200&background=3b82f6&color=fff`;
        };
    } else {
        profilePhoto.src = `https://ui-avatars.com/api/?name=${emp.first_name}+${emp.last_name || ''}&size=200&background=3b82f6&color=fff`;
    }

    document.getElementById('employeeName').textContent = `${emp.first_name} ${emp.last_name || ''}`;
    document.getElementById('designation').textContent = emp.designation || 'Not Assigned';
    document.getElementById('employeeId').textContent = emp.employee_id;
    document.getElementById('department').textContent = emp.department || 'No Department';
    
    const statusBadge = document.getElementById('status');
    statusBadge.textContent = emp.status;
    statusBadge.className = `px-3 py-1 rounded ${emp.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`;

    // Show/hide terminate button based on status and user role
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const deleteBtn = document.getElementById('deleteEmployeeBtn');
    if (deleteBtn && emp.status === 'Active' && (user.role === 'SUPER_ADMIN' || user.role === 'COMPANY_ADMIN')) {
        deleteBtn.classList.remove('hidden');
    }

    // Personal Information
    document.getElementById('dob').textContent = emp.date_of_birth ? new Date(emp.date_of_birth).toLocaleDateString() : '-';
    document.getElementById('gender').textContent = emp.gender || '-';
    document.getElementById('bloodGroup').textContent = emp.blood_group || '-';
    document.getElementById('maritalStatus').textContent = emp.marital_status || '-';
    document.getElementById('fatherName').textContent = emp.father_or_guardian || emp.father_name || '-';
    document.getElementById('motherName').textContent = emp.mother_name || '-';
    document.getElementById('spouseName').textContent = emp.spouse_name || '-';
    document.getElementById('numberOfChildren').textContent = emp.number_of_children || '0';
    
    // Children names
    let childrenNames = '-';
    if (emp.children_names) {
        if (typeof emp.children_names === 'string') {
            try {
                const names = JSON.parse(emp.children_names);
                childrenNames = Array.isArray(names) ? names.join(', ') : emp.children_names;
            } catch {
                childrenNames = emp.children_names;
            }
        } else if (Array.isArray(emp.children_names)) {
            childrenNames = emp.children_names.join(', ');
        }
    }
    document.getElementById('childrenNames').textContent = childrenNames;

    // Contact Information
    document.getElementById('mobile').textContent = emp.mobile || '-';
    document.getElementById('email').textContent = emp.email || '-';
    document.getElementById('nationality').textContent = emp.nationality || 'Indian';
    document.getElementById('tempAddress').textContent = emp.temp_address || emp.temporary_address || '-';
    document.getElementById('permAddress').textContent = emp.perm_address || emp.permanent_address || '-';
    document.getElementById('emergencyContact').textContent = emergencyPhone || '-';
    document.getElementById('emergencyContactName').textContent = emp.emergency_contact_name || '-';
    document.getElementById('emergencyContactRelation').textContent = emp.emergency_contact_relation || '-';

    // Medical & Identity
    document.getElementById('aadhaarNumber').textContent = emp.aadhaar_number || '-';
    document.getElementById('drivingLicense').textContent = emp.driving_license || '-';
    document.getElementById('medicalDetails').textContent = emp.medical_details || 'None';
    
    // Show document links with status
    showDocumentLink('aadhaarDocLink', 'aadhaarDocLink', emp.aadhaar_attachment);
    showDocumentLink('licenseDocLink', 'licenseDocLink', emp.driving_license_attachment);
    
    // Show signature image
    showSignatureImage(emp.signature);

    // Employment Details
    document.getElementById('company').textContent = emp.company_name || '-';
    document.getElementById('dateOfJoining').textContent = emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString() : '-';
    document.getElementById('yearOfJoining').textContent = emp.year_of_joining || '-';
    document.getElementById('educationQualification').textContent = emp.education_qualification || '-';
    
    // Show education document status
    showDocumentLink('educationDocLink', 'educationDocLink', emp.education_attachment);
    
    // Show employment document status
    showDocumentLink('employmentDocLink', 'employmentDocLink', emp.employment_attachment);
    
    // Parse past work profile
    let pastWork = '-';
    if (emp.past_work_profiles) {
        if (typeof emp.past_work_profiles === 'string') {
            try {
                const profiles = JSON.parse(emp.past_work_profiles);
                pastWork = Array.isArray(profiles) ? profiles.join('; ') : emp.past_work_profiles;
            } catch {
                pastWork = emp.past_work_profiles;
            }
        }
    }
    document.getElementById('pastWorkProfile').textContent = pastWork;

    // Salary & Allowances
    const basicSalary = parseFloat(emp.basic_salary) || 0;
    const homeAllowance = parseFloat(emp.home_allowance) || 0;
    const foodAllowance = parseFloat(emp.food_allowance) || 0;
    const transportAllowance = parseFloat(emp.transport_allowance) || 0;
    const medicalAllowance = parseFloat(emp.medical_allowance) || 0;
    const specialAllowance = parseFloat(emp.special_allowance) || 0;
    const grossSalary = parseFloat(emp.gross_salary) || (basicSalary + homeAllowance + foodAllowance + transportAllowance + medicalAllowance + specialAllowance);
    
    document.getElementById('basicSalary').textContent = basicSalary > 0 ? `₹${basicSalary.toLocaleString()}` : '-';
    document.getElementById('homeAllowance').textContent = `₹${homeAllowance.toLocaleString()}`;
    document.getElementById('foodAllowance').textContent = `₹${foodAllowance.toLocaleString()}`;
    document.getElementById('grossSalary').textContent = `₹${grossSalary.toLocaleString()}`;

    // Bank Details
    document.getElementById('accountHolderName').textContent = emp.account_holder_name || '-';
    document.getElementById('bankAccount').textContent = emp.bank_account || '-';
    document.getElementById('bankIfsc').textContent = emp.bank_ifsc || '-';
    document.getElementById('bankName').textContent = emp.bank_name || '-';
    
    // Show bank passbook with status
    showDocumentLink('bankDocLink', 'bankDocLink', emp.bank_passbook_attachment);

    // Reporting Person
    document.getElementById('reportingPersonName').textContent = emp.reporting_person_name || '-';
    document.getElementById('reportingPersonRole').textContent = emp.reporting_person_role || '-';

    // Training Records
    displayJSONRecords('trainingRecords', emp.training_records, formatTrainingRecord);
    
    // Performance Records
    displayJSONRecords('performanceRecords', emp.performance_records, formatPerformanceRecord);
    
    // Leave Records
    displayJSONRecords('leaveRecords', emp.leave_records, formatLeaveRecord);

    // Salary Increment Records
    displayJSONRecords('salaryIncrementRecords', emp.salary_increment_records, formatSalaryIncrementRecord);

    // Termination Details (if applicable)
    if (emp.status === 'Terminated' || emp.status === 'Resigned' || emp.last_day_of_work) {
        const section = document.getElementById('terminationSection');
        section.classList.remove('hidden');
        
        document.getElementById('lastDayOfWork').textContent = emp.last_day_of_work ? 
            new Date(emp.last_day_of_work).toLocaleDateString() : '-';
        document.getElementById('leavingReason').textContent = emp.leaving_reason || '-';
        document.getElementById('finalPayment').textContent = emp.final_payment ? 
            `₹${parseFloat(emp.final_payment).toLocaleString()}` : '-';
        document.getElementById('leavingOtherDetails').textContent = emp.leaving_other_details || '-';
        
        if (emp.leaving_attachment) {
            showDocumentLink('leavingDoc', 'leavingDocLink', emp.leaving_attachment);
        }
    }
}

function showDocumentLink(linkIdOrContainerId, noneIdOrLinkId, path) {
    // Try to get elements
    const linkElement = document.getElementById(noneIdOrLinkId);
    const containerElement = document.getElementById(linkIdOrContainerId);
    
    // Check if noneIdOrLinkId ends with 'Link' - if so, we're in new format
    if (noneIdOrLinkId.endsWith('Link')) {
        // New format: linkId passed twice, need to derive noneId
        const baseId = noneIdOrLinkId.replace('Link', '');
        const noneElement = document.getElementById(baseId + 'None');
        
        if (path) {
            // Document exists - show link, hide "not uploaded" text
            if (linkElement) {
                linkElement.href = path.startsWith('/') ? path : `/${path}`;
                linkElement.classList.remove('hidden');
            }
            if (noneElement) {
                noneElement.classList.add('hidden');
            }
        } else {
            // No document - hide link, show "not uploaded" text  
            if (linkElement) {
                linkElement.classList.add('hidden');
            }
            if (noneElement) {
                noneElement.classList.remove('hidden');
            }
        }
    } else if (containerElement && linkElement) {
        // Old format: using hidden container (containerId, linkId, path)
        if (path) {
            containerElement.classList.remove('hidden');
            linkElement.href = path.startsWith('/') ? path : `/${path}`;
        }
    }
}

function showSignatureImage(path) {
    const imageElement = document.getElementById('signatureImage');
    const noneElement = document.getElementById('signatureDocNone');
    
    if (path) {
        // Signature exists - show image, hide "not provided" text
        const imagePath = path.startsWith('/') ? path : `/${path}`;
        imageElement.src = imagePath;
        imageElement.classList.remove('hidden');
        if (noneElement) {
            noneElement.classList.add('hidden');
        }
    } else {
        // No signature - hide image, show "not provided" text
        imageElement.classList.add('hidden');
        if (noneElement) {
            noneElement.classList.remove('hidden');
        }
    }
}

function displayJSONRecords(containerId, records, formatter) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let parsedRecords = [];
    if (records) {
        if (typeof records === 'string') {
            try {
                parsedRecords = JSON.parse(records);
            } catch (e) {
                console.error('Failed to parse records:', e);
            }
        } else if (Array.isArray(records)) {
            parsedRecords = records;
        }
    }
    
    if (parsedRecords.length > 0) {
        container.innerHTML = parsedRecords.map(formatter).join('');
    } else {
        container.innerHTML = '<p class="text-gray-500">No records available</p>';
    }
}

function formatTrainingRecord(record) {
    const docLink = record.document ? 
        `<a href="${record.document.startsWith('/') ? record.document : '/' + record.document}" target="_blank" class="text-blue-600 text-sm hover:underline">
            <i class="fas fa-file-pdf mr-1"></i>View Document
         </a>` : '';
    
    // Handle both old format (period) and new format (from_date/to_date)
    let dateDisplay = record.period || 'N/A';
    if (record.from_date && record.to_date) {
        const fromDate = new Date(record.from_date).toLocaleDateString();
        const toDate = new Date(record.to_date).toLocaleDateString();
        dateDisplay = `${fromDate} to ${toDate}`;
    } else if (record.from_date) {
        dateDisplay = new Date(record.from_date).toLocaleDateString();
    }
    
    return `
        <div class="border-l-4 border-blue-500 pl-4 py-2">
            <p class="font-semibold">${dateDisplay}</p>
            <p class="text-sm text-gray-600">Place: ${record.place || 'N/A'}</p>
            ${docLink}
        </div>
    `;
}

function formatPerformanceRecord(record) {
    const docLink = record.document ? 
        `<a href="${record.document.startsWith('/') ? record.document : '/' + record.document}" target="_blank" class="text-blue-600 text-sm hover:underline">
            <i class="fas fa-file-pdf mr-1"></i>View Document
         </a>` : '';
    
    return `
        <div class="border-l-4 border-green-500 pl-4 py-2">
            <p class="font-semibold">${record.date || 'N/A'} - ${record.achievement || 'N/A'}</p>
            <p class="text-sm text-gray-600">Reward: ${record.reward || 'None'}</p>
            <p class="text-sm">${record.description || ''}</p>
            ${docLink}
        </div>
    `;
}

function formatLeaveRecord(record) {
    const fromDate = record.from_date ? new Date(record.from_date).toLocaleDateString() : 'N/A';
    const toDate = record.to_date ? new Date(record.to_date).toLocaleDateString() : 'N/A';
    const status = record.status || 'Pending';
    const statusClass = status === 'Approved' ? 'bg-green-100 text-green-800' : 
                       status === 'Rejected' ? 'bg-red-100 text-red-800' : 
                       'bg-blue-100 text-blue-800';
    
    return `
        <div class="border-l-4 border-yellow-500 pl-4 py-2 mb-3">
            <div class="flex justify-between items-start mb-1">
                <p class="font-semibold">${record.type || record.leave_type || 'Leave'}</p>
                <span class="px-2 py-1 rounded text-xs ${statusClass}">${status}</span>
            </div>
            <p class="text-sm text-gray-600">From: ${fromDate} - To: ${toDate}</p>
            <p class="text-sm text-gray-600 mt-1">Reason: ${record.reason || 'N/A'}</p>
            ${record.remarks ? `<p class="text-sm text-gray-500 mt-1">Remarks: ${record.remarks}</p>` : ''}
        </div>
    `;
}

function formatSalaryIncrementRecord(record) {
    const date = record.date ? new Date(record.date).toLocaleDateString() : 'N/A';
    const amount = record.increased_amount ? `₹${parseFloat(record.increased_amount).toLocaleString()}` : 'N/A';
    
    return `
        <div class="border-l-4 border-green-500 pl-4 py-2 mb-3">
            <div class="flex justify-between items-start mb-1">
                <p class="font-semibold">${date}</p>
                <span class="px-2 py-1 rounded text-xs bg-green-100 text-green-800 font-semibold">${amount}</span>
            </div>
            <p class="text-sm text-gray-600 mt-1">${record.description || 'N/A'}</p>
        </div>
    `;
}

function editEmployee() {
    window.location.href = `/add-employee.html?id=${employeeId}`;
}

async function downloadEmployeeProfile() {
    if (!currentEmployee) {
        alert('Employee data not loaded');
        return;
    }
    
    try {
        const emp = currentEmployee;
        
        // Try different ways to access jsPDF
        let jsPDFLib = window.jsPDF || window.jspdf?.jsPDF || window.jspdf?.default;
        
        if (!jsPDFLib) {
            alert('PDF library not loaded. Please refresh the page and try again.');
            return;
        }
        
        const doc = new jsPDFLib();
    const baseUrl = window.location.origin;
    
    // Set UTF-8 encoding for proper character handling
    doc.setProperties({
        title: `Employee Profile - ${emp.first_name} ${emp.last_name || ''}`,
        subject: 'Employee Profile Export',
        author: 'Employee Management System'
    });
    
    let yPos = 20;
    const leftMargin = 15;
    const rightCol = 110;
    const lineHeight = 7;
    const pageWidth = 195;
    
    // Helper function to load image as base64
    async function loadImageAsBase64(url, format = 'image/jpeg') {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    // Fill with white background for JPEG images to avoid transparency issues
                    if (format === 'image/jpeg') {
                        ctx.fillStyle = 'white';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL(format, 0.9));
                } catch (e) {
                    console.warn('Failed to convert image to base64:', e);
                    resolve(null);
                }
            };
            img.onerror = function() {
                console.warn('Failed to load image:', url);
                resolve(null);
            };
            // Add timestamp to prevent caching issues
            img.src = url + (url.includes('?') ? '&' : '?') + 't=' + Date.now();
        });
    }
    
    // Helper function to add section header
    function addSectionHeader(title) {
        if (yPos > 250) {
            doc.addPage();
            yPos = 20;
        }
        doc.setFillColor(59, 130, 246);
        doc.rect(leftMargin, yPos, pageWidth - leftMargin, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(title, leftMargin + 3, yPos + 6);
        doc.setTextColor(0, 0, 0);
        yPos += 12;
    }
    
    // Helper function to add key-value pair
    function addRow(label, value, link = null) {
        if (yPos > 275) {
            doc.addPage();
            yPos = 20;
        }
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(label + ':', leftMargin, yPos);
        doc.setFont('helvetica', 'normal');
        
        const displayValue = (value || '-').toString().replace(/&/g, 'and');
        if (link) {
            doc.setTextColor(59, 130, 246);
            doc.textWithLink(displayValue, rightCol - 20, yPos, { url: link });
            doc.setTextColor(0, 0, 0);
        } else {
            doc.text(displayValue.toString().substring(0, 50), rightCol - 20, yPos);
        }
        yPos += lineHeight;
    }
    
    // Title
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Employee Profile', 105, 18, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Generated on ${new Date().toISOString().split('T')[0]} at ${new Date().toTimeString().split(' ')[0]}`, 105, 28, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    yPos = 45;
    
    // Load and add profile photo
    let profileImageData = null;
    if (emp.profile_photo) {
        const photoUrl = emp.profile_photo.startsWith('/') ? emp.profile_photo : '/' + emp.profile_photo;
        profileImageData = await loadImageAsBase64(photoUrl);
    }
    
    // Profile Photo or placeholder
    if (profileImageData) {
        try {
            doc.addImage(profileImageData, 'JPEG', leftMargin, yPos, 40, 40);
        } catch (e) {
            // Fallback to placeholder if image fails
            doc.setFillColor(240, 240, 240);
            doc.roundedRect(leftMargin, yPos, 40, 40, 3, 3, 'F');
            doc.setFontSize(24);
            doc.setTextColor(100, 100, 100);
            const initials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase();
            doc.text(initials, leftMargin + 20, yPos + 25, { align: 'center' });
            doc.setTextColor(0, 0, 0);
        }
    } else {
        // Placeholder with initials
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(leftMargin, yPos, 40, 40, 3, 3, 'F');
        doc.setFontSize(24);
        doc.setTextColor(100, 100, 100);
        const initials = `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase();
        doc.text(initials, leftMargin + 20, yPos + 25, { align: 'center' });
        doc.setTextColor(0, 0, 0);
    }
    
    // Name and basic info next to photo
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`${emp.first_name || ''} ${emp.last_name || ''}`.trim(), 65, yPos + 10);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Employee ID: ${emp.employee_id || 'N/A'}`, 65, yPos + 20);
    doc.text(`Designation: ${emp.designation || 'Not Assigned'}`, 65, yPos + 28);
    doc.text(`Status: ${emp.status || 'Unknown'}`, 65, yPos + 36);
    doc.text(`Company: ${emp.company_name || '-'}`, 65, yPos + 44);
    
    yPos += 55;
    
    // Personal Information
    addSectionHeader('Personal Information');
    addRow('Date of Birth', emp.date_of_birth ? new Date(emp.date_of_birth).toISOString().split('T')[0] : '-');
    addRow('Gender', emp.gender);
    addRow('Blood Group', emp.blood_group);
    addRow('Marital Status', emp.marital_status);
    addRow('Father/Guardian', emp.father_or_guardian || emp.father_name);
    addRow('Mother Name', emp.mother_name);
    addRow('Spouse Name', emp.spouse_name);
    addRow('Number of Children', emp.number_of_children?.toString());
    
    // Contact Information
    addSectionHeader('Contact Information');
    addRow('Mobile', emp.mobile);
    addRow('Email', emp.email);
    addRow('Nationality', emp.nationality || 'Indian');
    addRow('Temporary Address', emp.temp_address || emp.temporary_address);
    addRow('Permanent Address', emp.perm_address || emp.permanent_address);
    addRow('Emergency Contact', emp.emergency_contact_phone || emp.emergency_contact);
    addRow('Emergency Contact Name', emp.emergency_contact_name);
    addRow('Emergency Relation', emp.emergency_contact_relation);
    
    // Identity Documents
    addSectionHeader('Identity & Documents');
    addRow('Aadhaar Number', emp.aadhaar_number);
    if (emp.aadhaar_attachment) {
        addRow('Aadhaar Document', 'View Document', `${baseUrl}${emp.aadhaar_attachment.startsWith('/') ? emp.aadhaar_attachment : '/' + emp.aadhaar_attachment}`);
    }
    addRow('Driving License', emp.driving_license);
    if (emp.driving_license_attachment) {
        addRow('DL Document', 'View Document', `${baseUrl}${emp.driving_license_attachment.startsWith('/') ? emp.driving_license_attachment : '/' + emp.driving_license_attachment}`);
    }
    addRow('Medical Details', emp.medical_details || 'None');
    
    // Employment Details
    addSectionHeader('Employment Details');
    addRow('Company', emp.company_name);
    addRow('Department', emp.department);
    addRow('Date of Joining', emp.date_of_joining ? new Date(emp.date_of_joining).toISOString().split('T')[0] : '-');
    addRow('Year of Joining', emp.year_of_joining);
    addRow('Education Qualification', emp.education_qualification);
    if (emp.education_attachment) {
        addRow('Education Document', 'View Document', `${baseUrl}${emp.education_attachment.startsWith('/') ? emp.education_attachment : '/' + emp.education_attachment}`);
    }
    if (emp.employment_attachment) {
        addRow('Employment Document', 'View Document', `${baseUrl}${emp.employment_attachment.startsWith('/') ? emp.employment_attachment : '/' + emp.employment_attachment}`);
    }
    addRow('Past Work Profiles', emp.past_work_profiles);
    
    // Salary & Bank Details
    addSectionHeader('Salary & Bank Details');
    // Clean and parse salary values to ensure they're numbers
    const basicSalary = emp.basic_salary ? parseFloat(String(emp.basic_salary).replace(/[^\d.-]/g, '')) || 0 : 0;
    const homeAllowance = emp.home_allowance ? parseFloat(String(emp.home_allowance).replace(/[^\d.-]/g, '')) || 0 : 0;
    const foodAllowance = emp.food_allowance ? parseFloat(String(emp.food_allowance).replace(/[^\d.-]/g, '')) || 0 : 0;
    const transportAllowance = emp.transport_allowance ? parseFloat(String(emp.transport_allowance).replace(/[^\d.-]/g, '')) || 0 : 0;
    const medicalAllowance = emp.medical_allowance ? parseFloat(String(emp.medical_allowance).replace(/[^\d.-]/g, '')) || 0 : 0;
    const specialAllowance = emp.special_allowance ? parseFloat(String(emp.special_allowance).replace(/[^\d.-]/g, '')) || 0 : 0;
    
    // Use gross_salary from database if available, otherwise calculate from all allowances
    const grossSalary = emp.gross_salary ? parseFloat(String(emp.gross_salary).replace(/[^\d.-]/g, '')) || 0 : 
                      (basicSalary + homeAllowance + foodAllowance + transportAllowance + medicalAllowance + specialAllowance);
    
    addRow('Basic Salary', basicSalary > 0 ? `Rs ${basicSalary.toLocaleString()}` : '-');
    addRow('Home Allowance', `Rs ${homeAllowance.toLocaleString()}`);
    addRow('Food Allowance', `Rs ${foodAllowance.toLocaleString()}`);
    addRow('Transport Allowance', `Rs ${transportAllowance.toLocaleString()}`);
    addRow('Medical Allowance', `Rs ${medicalAllowance.toLocaleString()}`);
    addRow('Special Allowance', `Rs ${specialAllowance.toLocaleString()}`);
    addRow('Gross Salary', `Rs ${grossSalary.toLocaleString()}`);
    addRow('Account Holder Name', emp.account_holder_name);
    addRow('Bank Account', emp.bank_account);
    addRow('Bank IFSC', emp.bank_ifsc);
    addRow('Bank Name', emp.bank_name);
    if (emp.bank_passbook_attachment) {
        addRow('Bank Passbook', 'View Document', `${baseUrl}${emp.bank_passbook_attachment.startsWith('/') ? emp.bank_passbook_attachment : '/' + emp.bank_passbook_attachment}`);
    }
    
    // Salary Increment Records
    if (emp.salary_increment_records) {
        addSectionHeader('Salary Increment Records');
        try {
            let increments = [];
            if (typeof emp.salary_increment_records === 'string') {
                increments = JSON.parse(emp.salary_increment_records);
            } else if (Array.isArray(emp.salary_increment_records)) {
                increments = emp.salary_increment_records;
            }
            
            if (Array.isArray(increments) && increments.length > 0) {
                increments.forEach((increment, index) => {
                    const date = increment.date || 'N/A';
                    const amount = increment.increased_amount ? parseFloat(increment.increased_amount).toLocaleString() : '0';
                    const description = increment.description || 'No description';
                    addRow(`Increment ${index + 1}`, `Date: ${date}, Amount: Rs ${amount}, Description: ${description}`);
                });
            } else {
                addRow('No Records', 'No salary increment records found');
            }
        } catch (e) {
            console.warn('Error parsing salary increment records:', e);
            addRow('Error', 'Failed to load salary increment records');
        }
    }
    
    // Reporting Person
    addSectionHeader('Reporting Person');
    addRow('Name', emp.reporting_person_name);
    addRow('Role', emp.reporting_person_role);
    
    // Termination Details (if applicable)
    if (emp.status === 'Terminated' || emp.status === 'Resigned' || emp.last_day_of_work) {
        addSectionHeader('Termination Details');
        addRow('Last Working Day', emp.last_day_of_work ? new Date(emp.last_day_of_work).toISOString().split('T')[0] : '-');
        addRow('Leaving Reason', emp.leaving_reason);
        addRow('Final Payment', emp.final_payment ? `Rs ${(parseFloat(String(emp.final_payment).replace(/[^\d.-]/g, '')) || 0).toString()}` : '-');
        addRow('Other Details', emp.leaving_other_details);
        if (emp.leaving_attachment) {
            addRow('Leaving Document', 'View Document', `${baseUrl}${emp.leaving_attachment.startsWith('/') ? emp.leaving_attachment : '/' + emp.leaving_attachment}`);
        }
    }
    
    // Digital Signature
    if (emp.signature) {
        addSectionHeader('Digital Signature');
        
        // Load and add signature image
        let signatureImageData = null;
        if (emp.signature) {
            const signatureUrl = emp.signature.startsWith('/') ? emp.signature : '/' + emp.signature;
            signatureImageData = await loadImageAsBase64(signatureUrl, 'image/png');
        }
        
        if (signatureImageData) {
            try {
                // Add signature image to PDF (smaller size than profile photo)
                doc.addImage(signatureImageData, 'PNG', leftMargin, yPos, 60, 30);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'italic');
                doc.text('Employee Signature', leftMargin, yPos + 35);
                yPos += 45;
            } catch (e) {
                console.warn('Failed to add signature image to PDF:', e);
                addRow('Digital Signature', 'Available (image could not be loaded in PDF)');
            }
        } else {
            addRow('Digital Signature', 'Available (image could not be loaded)');
        }
    }
    
    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
        doc.text('Employee Management System - Confidential', 105, 295, { align: 'center' });
    }
    
    // Save the PDF
    const filename = `Employee_Profile_${emp.employee_id}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
    } catch (error) {
        console.error('PDF generation error:', error);
        alert('Failed to generate PDF: ' + error.message);
    }
}

// ==================== Training Records ====================
function openAddTrainingModal() {
    document.getElementById('trainingModal').classList.remove('hidden');
}

function closeTrainingModal() {
    document.getElementById('trainingModal').classList.add('hidden');
    document.getElementById('trainingForm').reset();
}

async function saveTraining(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    // Add employee ID and action type
    formData.append('employee_id', employeeId);
    formData.append('record_type', 'training');
    
    try {
        // Upload with file
        const res = await fetch(`/api/employees/${employeeId}/records`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData // FormData automatically sets correct content-type
        });
        
        if (!res.ok) throw new Error('Failed to save training record');
        
        alert('Training record added successfully!');
        closeTrainingModal();
        loadEmployeeDetails(); // Reload to show new record
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// ==================== Performance Records ====================
function openAddPerformanceModal() {
    document.getElementById('performanceModal').classList.remove('hidden');
}

function closePerformanceModal() {
    document.getElementById('performanceModal').classList.add('hidden');
    document.getElementById('performanceForm').reset();
}

async function savePerformance(event) {
    event.preventDefault();
    const form = event.target;
    const formData = new FormData(form);
    
    // Add employee ID and action type
    formData.append('employee_id', employeeId);
    formData.append('record_type', 'performance');
    
    try {
        // Upload with file
        const res = await fetch(`/api/employees/${employeeId}/records`, {
            method: 'POST',
            credentials: 'include',
            body: formData // FormData automatically sets correct content-type
        });
        
        if (!res.ok) throw new Error('Failed to save performance record');
        
        alert('Performance record added successfully!');
        closePerformanceModal();
        loadEmployeeDetails(); // Reload to show new record
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// ==================== Leave Records ====================
function openAddLeaveModal() {
    document.getElementById('leaveModal').classList.remove('hidden');
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

    if (!data.from_date || !data.to_date || !data.reason) {
        alert('Please fill in all required fields.');
        return;
    }

    try {
        const res = await fetch(`/api/employees/${employeeId}/leave`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                type: data.leave_type,
                from_date: data.from_date,
                to_date: data.to_date,
                reason: data.reason,
                remarks: data.remarks || null
            })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to add leave record');
        
        closeLeaveModal();
        alert('Leave record added successfully!');
        loadEmployeeDetails(); // Reload to show new record
    } catch (err) {
        alert(`Error: ${err.message}`);
        console.error('Leave submission error:', err);
    }
}

// Attach event listeners for leave modal (will be called after DOM loads)
function setupLeaveModalListeners() {
    const leaveForm = document.getElementById('leaveForm');
    const cancelLeaveBtn = document.getElementById('cancelLeaveBtn');
    
    if (leaveForm) {
        // Remove existing listener if any
        leaveForm.removeEventListener('submit', handleLeaveSubmit);
        leaveForm.addEventListener('submit', handleLeaveSubmit);
    }
    if (cancelLeaveBtn) {
        cancelLeaveBtn.addEventListener('click', closeLeaveModal);
    }
}

// ==================== Salary Increment Records ====================
function openAddIncrementModal() {
    document.getElementById('incrementModal').classList.remove('hidden');
}

function closeIncrementModal() {
    const modal = document.getElementById('incrementModal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('incrementForm').reset();
    }
}

async function handleIncrementSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    if (!data.date || !data.increased_amount || !data.description) {
        alert('Please fill in all required fields.');
        return;
    }

    const increasedAmount = parseFloat(data.increased_amount);
    if (isNaN(increasedAmount) || increasedAmount <= 0) {
        alert('Please enter a valid increased amount.');
        return;
    }

    try {
        const res = await fetch(`/api/employees/${employeeId}/salary-increment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                date: data.date,
                increased_amount: increasedAmount,
                description: data.description
            })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to add salary increment');
        
        closeIncrementModal();
        alert('Salary increment added successfully!');
        loadEmployeeDetails(); // Reload to show new record and updated salary
    } catch (err) {
        alert(`Error: ${err.message}`);
        console.error('Increment submission error:', err);
    }
}

// Attach event listeners for increment modal (will be called after DOM loads)
function setupIncrementModalListeners() {
    const incrementForm = document.getElementById('incrementForm');
    
    if (incrementForm) {
        // Remove existing listener if any
        incrementForm.removeEventListener('submit', handleIncrementSubmit);
        incrementForm.addEventListener('submit', handleIncrementSubmit);
    }
}

// Termination Modal Functions
function openTerminateModal() {
    document.getElementById('terminateModal').classList.remove('hidden');
}

function closeTerminateModal() {
    document.getElementById('terminateModal').classList.add('hidden');
    document.getElementById('terminateForm').reset();
}

async function handleTerminateEmployee(e) {
    e.preventDefault();
    
    if (!confirm('Are you sure you want to terminate this employee? This action will change their status to Terminated and store all termination details.')) {
        return;
    }

    const formData = new FormData(e.target);
    
    try {
        const res = await fetch(`/api/employees/${employeeId}/terminate`, {
            method: 'PUT',
            credentials: 'include',
            body: formData
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Failed to terminate employee');
        }

        alert('Employee terminated successfully');
        closeTerminateModal();
        window.location.href = 'employee-view.html'; // Redirect to employee list
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

// Attach event listeners
document.getElementById('terminateForm')?.addEventListener('submit', handleTerminateEmployee);

// Setup leave modal listeners
setupLeaveModalListeners();

// Setup increment modal listeners
setupIncrementModalListeners();

// Load employee details on page load
loadEmployeeDetails();

