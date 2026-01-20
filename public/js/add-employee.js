const urlParams = new URLSearchParams(window.location.search);
const employeeId = urlParams.get('id');
let cameraStream = null;
let capturedPhotoBlob = null;
let originalAadhaar = null; // Store original masked aadhaar
let originalBankAccount = null; // Store original masked bank account
let signaturePad = null;

// Initialize
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

    if (employeeId) {
        document.getElementById('pageTitle').textContent = 'Edit Employee';
        document.getElementById('submitBtn').innerHTML = '<i class="fas fa-save mr-2"></i>Update Employee';
        loadEmployeeData();
    }
    loadCompanies();
    
    // Initialize signature pad
    const canvas = document.getElementById('signatureCanvas');
    signaturePad = new SignaturePad(canvas);
    
    // Clear signature button
    document.getElementById('clearSignature').addEventListener('click', () => {
        signaturePad.clear();
    });
});

async function loadCompanies() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const select = document.getElementById('companySelect');
        
        if (user.role === 'COMPANY_ADMIN') {
            // For company admin, directly set their company without waiting for API
            select.innerHTML = `<option value="${user.company_id}" selected>Loading company...</option>`;
            select.disabled = true;
            select.classList.add('bg-gray-100', 'cursor-not-allowed');
            
            // Load company name in background
            fetch('/api/companies', {
                credentials: 'include'
            })
            .then(res => res.json())
            .then(data => {
                const companies = data.companies || [];
                const userCompany = companies.find(c => c.id === user.company_id) || companies[0];
                if (userCompany) {
                    select.innerHTML = `<option value="${userCompany.id}" selected>${userCompany.name} (${userCompany.code})</option>`;
                }
            })
            .catch(err => {
                console.error('Error loading company name:', err);
                select.innerHTML = `<option value="${user.company_id}" selected>Company (ID: ${user.company_id})</option>`;
            });
            
            // Make aadhaar optional for company admin
            const aadhaarInput = document.querySelector('input[name="aadhaar_number"]');
            if (aadhaarInput) {
                aadhaarInput.removeAttribute('required');
                aadhaarInput.placeholder = 'Aadhaar Number (Optional)';
            }
        } else {
            // For super admin, load all companies
            const res = await fetch('/api/companies', {
                credentials: 'include'
            });
            
            if (!res.ok) {
                throw new Error(`Failed to load companies: ${res.status}`);
            }
            
            const data = await res.json();
            const companies = data.companies || [];
            select.innerHTML = '<option value="">Select Company</option>' +
                companies.map(c => `<option value="${c.id}">${c.name} (${c.code})</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading companies:', error);
        showAlert('Error loading companies. Please refresh the page.', 'error');
    }
}

async function loadEmployeeData() {
    try {
        const res = await fetch(`/api/employees/${employeeId}`, {
            credentials: 'include'
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        console.log('Loading employee data:', data);

        // Store original sensitive data
        originalAadhaar = data.aadhaar_number;
        originalBankAccount = data.bank_account;

        // Map database column names to form field names
        // Database -> Form mapping
        const fieldMapping = {
            'education_attachment': 'education_document',
            'employment_attachment': 'employment_document'
        };

        // Fill form fields
        const form = document.getElementById('employeeForm');
        if (!form) {
            throw new Error('Employee form not found');
        }

        Object.keys(data).forEach(key => {
            try {
                const formFieldName = fieldMapping[key] || key;
                const input = form.elements[formFieldName];
                
                if (input) {
                    if (data[key] !== null && data[key] !== undefined) {
                        if (input.type === 'date' && data[key]) {
                            input.value = data[key].split('T')[0];
                        } else if (input.type === 'select-one') {
                            input.value = data[key];
                        } else if (input.type !== 'file') {
                            // For aadhaar and bank account, show masked values
                            if (key === 'aadhaar_number' || key === 'bank_account') {
                                input.value = data[key];
                                input.placeholder = 'Leave unchanged or enter new value';
                            } else if (key === 'children_names') {
                                // Handle children_names - could be JSON array or already a string
                                if (typeof data[key] === 'string') {
                                    try {
                                        const parsed = JSON.parse(data[key]);
                                        input.value = Array.isArray(parsed) ? parsed.join(', ') : data[key];
                                    } catch {
                                        input.value = data[key];
                                    }
                                } else if (Array.isArray(data[key])) {
                                    input.value = data[key].join(', ');
                                }
                            } else {
                                input.value = data[key];
                            }
                        }
                    }
                }
            } catch (fieldErr) {
                console.warn(`Error setting value for field ${key}:`, fieldErr);
            }
        });

        // Handle children names toggle
        const numberOfChildren = data.number_of_children || 0;
        if (numberOfChildren > 0) {
            const container = document.getElementById('childrenNamesContainer');
            if (container) container.style.display = 'block';
        }

        // Make aadhaar and bank account not required for edit mode
        const aadhaarInput = form.elements['aadhaar_number'];
        const bankAccountInput = form.elements['bank_account'];
        if (aadhaarInput) {
            aadhaarInput.removeAttribute('required');
            aadhaarInput.removeAttribute('pattern');
        }
        if (bankAccountInput) {
            bankAccountInput.removeAttribute('required');
        }

        // Manually set company_id select box
        if (data.company_id) {
            const companySelect = document.getElementById('companySelect');
            if (companySelect) {
                // Wait for companies to load first
                setTimeout(() => {
                    companySelect.value = data.company_id;
                }, 100);
            }
        }

        // Show profile photo if exists
        if (data.profile_photo) {
            const photoPath = data.profile_photo.startsWith('/') ? data.profile_photo : `/${data.profile_photo}`;
            const preview = document.getElementById('profilePreview');
            const defaultIcon = document.getElementById('defaultIcon');
            if (preview) {
                preview.src = photoPath;
                preview.classList.remove('hidden');
            }
            if (defaultIcon) {
                defaultIcon.classList.add('hidden');
            }
        }

        // Show existing documents if they exist
        const documents = [
            { field: 'aadhaar_attachment', containerId: 'aadhaarDocCurrent', linkId: 'aadhaarDocViewLink' },
            { field: 'driving_license_attachment', containerId: 'drivingLicenseDocCurrent', linkId: 'drivingLicenseDocViewLink' },
            { field: 'education_attachment', containerId: 'educationDocCurrent', linkId: 'educationDocViewLink' },
            { field: 'employment_attachment', containerId: 'employmentDocCurrent', linkId: 'employmentDocViewLink' },
            { field: 'bank_passbook_attachment', containerId: 'bankPassbookDocCurrent', linkId: 'bankPassbookDocViewLink' }
        ];

        documents.forEach(doc => {
            if (data[doc.field]) {
                const docPath = data[doc.field].startsWith('/') ? data[doc.field] : `/${data[doc.field]}`;
                const container = document.getElementById(doc.containerId);
                const link = document.getElementById(doc.linkId);
                if (container && link) {
                    link.href = docPath;
                    container.classList.remove('hidden');
                }
            }
        });

        calculateGross();
    } catch (error) {
        console.error('Error loading employee data:', error);
        alert('Error loading employee data: ' + error.message);
    }
}

// Camera Functions
let currentFacingMode = 'user'; // 'user' for front camera, 'environment' for back camera

async function openCamera() {
    const modal = document.getElementById('cameraModal');
    const video = document.getElementById('cameraVideo');

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: currentFacingMode, width: 640, height: 480 }
        });
        video.srcObject = cameraStream;
        modal.classList.remove('hidden');
    } catch (error) {
        alert('Error accessing camera: ' + error.message);
    }
}

async function switchCamera() {
    // Toggle between front and back camera
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    
    // Stop current stream
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }
    
    // Start new stream with different camera
    const video = document.getElementById('cameraVideo');
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: currentFacingMode, width: 640, height: 480 }
        });
        video.srcObject = cameraStream;
    } catch (error) {
        alert('Error switching camera: ' + error.message);
        // Revert to previous mode if switch fails
        currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    }
}

function closeCamera() {
    const modal = document.getElementById('cameraModal');
    const video = document.getElementById('cameraVideo');

    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    video.srcObject = null;
    modal.classList.add('hidden');
}

function capturePhoto() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('photoCanvas');
    const preview = document.getElementById('profilePreview');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Flip horizontally to match mirror image
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(blob => {
        capturedPhotoBlob = blob;
        preview.src = URL.createObjectURL(blob);
        preview.classList.remove('hidden');
        document.getElementById('defaultIcon').classList.add('hidden');
        closeCamera();
    }, 'image/jpeg', 0.9);
}

function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }
        const preview = document.getElementById('profilePreview');
        preview.src = URL.createObjectURL(file);
        preview.classList.remove('hidden');
        document.getElementById('defaultIcon').classList.add('hidden');
        capturedPhotoBlob = file;
    }
}

function removePhoto() {
    document.getElementById('profilePreview').src = '';
    document.getElementById('profilePreview').classList.add('hidden');
    document.getElementById('defaultIcon').classList.remove('hidden');
    document.getElementById('profilePhotoInput').value = '';
    capturedPhotoBlob = null;
}

function calculateGross() {
    try {
        // Helper function to safely get field value
        const getFieldValue = (fieldName) => {
            const elements = document.getElementsByName(fieldName);
            return elements.length > 0 ? parseFloat(elements[0].value) || 0 : 0;
        };

        const basic = getFieldValue('basic_salary');
        const home = getFieldValue('home_allowance');
        const food = getFieldValue('food_allowance');
        const transport = getFieldValue('transport_allowance');
        const medical = getFieldValue('medical_allowance');
        const special = getFieldValue('special_allowance');
        
        const grossSalaryElements = document.getElementsByName('gross_salary');
        if (grossSalaryElements.length > 0) {
            grossSalaryElements[0].value = (basic + home + food + transport + medical + special).toFixed(2);
        }
    } catch (error) {
        console.warn('Error calculating gross salary:', error);
    }
}

// Helper function to convert dataURL to Blob
function dataURLToBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

// Form Submission
document.getElementById('employeeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    const form = e.target;

    // Get company_id from select box
    const companySelect = document.getElementById('companySelect');
    const companyId = companySelect ? companySelect.value : null;
    
    if (!companyId) {
        showAlert('Please select a company', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        return;
    }
    
    // Add company_id first
    formData.append('company_id', companyId);

    // Add all form fields
    const enumFields = ['marital_status', 'blood_group', 'gender', 'employment_type'];
    for (let element of form.elements) {
        if (element.name && element.type !== 'file' && element.type !== 'submit' && element.name !== 'company_id') {
            // Skip empty enum fields (they should be NULL, not empty string)
            if (enumFields.includes(element.name) && !element.value) {
                continue;
            }
            
            // Handle children_names as JSON array
            if (element.name === 'children_names' && element.value) {
                const names = element.value.split(',').map(n => n.trim()).filter(n => n);
                formData.append(element.name, JSON.stringify(names));
                continue;
            }
            
            // For edit mode, skip aadhaar and bank account if they haven't changed (still masked)
            if (employeeId) {
                if (element.name === 'aadhaar_number' && element.value === originalAadhaar) {
                    continue; // Don't send masked value
                }
                if (element.name === 'bank_account' && element.value === originalBankAccount) {
                    continue; // Don't send masked value
                }
                // If aadhaar or bank is empty in edit mode, skip it
                if ((element.name === 'aadhaar_number' || element.name === 'bank_account') && !element.value) {
                    continue;
                }
            }
            
            formData.append(element.name, element.value || '');
        }
    }

    // Add profile photo (from camera or upload)
    if (capturedPhotoBlob) {
        formData.append('profile_photo', capturedPhotoBlob, 'profile.jpg');
    } else if (form.elements.profile_photo && form.elements.profile_photo.files[0]) {
        formData.append('profile_photo', form.elements.profile_photo.files[0]);
    }

    // Add file uploads with new field names
    const fileFields = [
        'aadhaar_attachment', 
        'driving_license_attachment',
        'education_document',
        'bank_passbook_attachment'
    ];
    fileFields.forEach(field => {
        const input = form.elements[field];
        if (input && input.files[0]) {
            formData.append(field, input.files[0]);
        }
    });

    // Add signature if present
    if (signaturePad && !signaturePad.isEmpty()) {
        const signatureDataURL = signaturePad.toDataURL();
        const signatureBlob = dataURLToBlob(signatureDataURL);
        formData.append('signature', signatureBlob, 'signature.png');
    }

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';

    try {
        const url = employeeId ? `/api/employees/${employeeId}` : '/api/employees';
        const method = employeeId ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            credentials: 'include',
            body: formData
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to save employee');

        alert(employeeId ? 'Employee updated successfully!' : 'Employee added successfully!');
        window.location.href = '/employee-view.html';
    } catch (error) {
        alert('Error: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = employeeId ? 
            '<i class="fas fa-save mr-2"></i>Update Employee' : 
            '<i class="fas fa-save mr-2"></i>Save Employee';
    }
});
