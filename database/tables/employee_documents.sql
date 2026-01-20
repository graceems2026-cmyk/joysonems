-- =============================================
-- EMPLOYEE DOCUMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS employee_documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    document_type ENUM(
        'aadhaar', 'pan', 'passport', 'driving_license', 'voter_id',
        'bank_passbook', 'bank_statement', 'cancelled_cheque',
        'education_10th', 'education_12th', 'education_graduation', 
        'education_post_graduation', 'education_diploma', 'education_other',
        'experience_letter', 'relieving_letter', 'salary_slip',
        'photo', 'resume', 'offer_letter', 'appointment_letter',
        'address_proof', 'other'
    ) NOT NULL,
    document_name VARCHAR(255),
    original_filename VARCHAR(255),
    file_path VARCHAR(500) NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE,
    verified_by INT,
    verified_at TIMESTAMP NULL,
    remarks TEXT,
    uploaded_by INT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_employee (employee_id),
    INDEX idx_doc_type (document_type),
    INDEX idx_verified (is_verified)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
