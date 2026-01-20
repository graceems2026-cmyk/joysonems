-- Employee Management System Database Schema
-- Production-grade design for Group of Companies

CREATE DATABASE IF NOT EXISTS employee_management;
USE employee_management;

-- =============================================
-- COMPANIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS companies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    country VARCHAR(100) DEFAULT 'India',
    gst_number VARCHAR(20),
    pan_number VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    logo_path VARCHAR(500),
    established_date DATE,
    employee_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- USERS TABLE (Authentication & RBAC)
-- =============================================
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    phone VARCHAR(20),
    role ENUM('SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'VIEWER', 'AUDITOR') NOT NULL DEFAULT 'VIEWER',
    company_id INT,
    profile_photo VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    password_changed_at TIMESTAMP NULL,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- EMPLOYEES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS employees (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    company_id INT NOT NULL,
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    father_or_guardian VARCHAR(255),
    date_of_birth DATE,
    gender ENUM('Male', 'Female', 'Other'),
    marital_status ENUM('Single', 'Married', 'Divorced', 'Widowed'),
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
    nationality VARCHAR(50) DEFAULT 'Indian',
    religion VARCHAR(50),
    
    -- Contact Information
    mobile VARCHAR(20) NOT NULL,
    alternate_mobile VARCHAR(20),
    email VARCHAR(255),
    personal_email VARCHAR(255),
    
    -- Address
    temp_address TEXT,
    temp_city VARCHAR(100),
    temp_state VARCHAR(100),
    temp_pincode VARCHAR(10),
    perm_address TEXT,
    perm_city VARCHAR(100),
    perm_state VARCHAR(100),
    perm_pincode VARCHAR(10),
    
    -- Identity Documents (Encrypted)
    aadhaar_number_encrypted VARCHAR(500),
    pan_number VARCHAR(20),
    passport_number VARCHAR(50),
    driving_license VARCHAR(50),
    voter_id VARCHAR(50),
    
    -- Bank Details (Encrypted)
    bank_name VARCHAR(100),
    bank_branch VARCHAR(100),
    bank_account_encrypted VARCHAR(500),
    bank_ifsc VARCHAR(20),
    
    -- Employment Details
    designation VARCHAR(100),
    department VARCHAR(100),
    employment_type ENUM('Full-time', 'Part-time', 'Contract', 'Intern', 'Probation') DEFAULT 'Full-time',
    date_of_joining DATE NOT NULL,
    year_of_joining INT GENERATED ALWAYS AS (YEAR(date_of_joining)) STORED,
    confirmation_date DATE,
    date_of_leaving DATE,
    leaving_reason TEXT,
    
    -- Salary & Allowances
    basic_salary DECIMAL(12, 2) DEFAULT 0,
    home_allowance DECIMAL(12, 2) DEFAULT 0,
    food_allowance DECIMAL(12, 2) DEFAULT 0,
    transport_allowance DECIMAL(12, 2) DEFAULT 0,
    medical_allowance DECIMAL(12, 2) DEFAULT 0,
    special_allowance DECIMAL(12, 2) DEFAULT 0,
    gross_salary DECIMAL(12, 2) GENERATED ALWAYS AS (
        basic_salary + home_allowance + food_allowance + 
        transport_allowance + medical_allowance + special_allowance
    ) STORED,
    
    -- Emergency Contact
    emergency_contact_name VARCHAR(255),
    emergency_contact_relation VARCHAR(50),
    emergency_contact_phone VARCHAR(20),
    
    -- Work Experience
    past_work_profiles JSON,
    
    -- Profile Photo
    profile_photo VARCHAR(500),
    
    -- Status
    status ENUM('Active', 'Inactive', 'On Leave', 'Terminated', 'Resigned') DEFAULT 'Active',
    
    -- Metadata
    created_by INT,
    updated_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_employee_id (employee_id),
    INDEX idx_company (company_id),
    INDEX idx_status (status),
    INDEX idx_department (department),
    INDEX idx_designation (designation),
    INDEX idx_joining_date (date_of_joining),
    INDEX idx_year_joining (year_of_joining),
    FULLTEXT idx_search (first_name, last_name, email, mobile, designation, department)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- =============================================
-- SALARY RECORDS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS salary_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    company_id INT NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    
    -- Earnings
    basic_salary DECIMAL(12, 2) DEFAULT 0,
    home_allowance DECIMAL(12, 2) DEFAULT 0,
    food_allowance DECIMAL(12, 2) DEFAULT 0,
    transport_allowance DECIMAL(12, 2) DEFAULT 0,
    medical_allowance DECIMAL(12, 2) DEFAULT 0,
    special_allowance DECIMAL(12, 2) DEFAULT 0,
    overtime_pay DECIMAL(12, 2) DEFAULT 0,
    bonus DECIMAL(12, 2) DEFAULT 0,
    gross_earnings DECIMAL(12, 2) DEFAULT 0,
    
    -- Deductions
    pf_deduction DECIMAL(12, 2) DEFAULT 0,
    esi_deduction DECIMAL(12, 2) DEFAULT 0,
    tax_deduction DECIMAL(12, 2) DEFAULT 0,
    loan_deduction DECIMAL(12, 2) DEFAULT 0,
    other_deductions DECIMAL(12, 2) DEFAULT 0,
    total_deductions DECIMAL(12, 2) DEFAULT 0,
    
    -- Net Salary
    net_salary DECIMAL(12, 2) DEFAULT 0,
    
    -- Payment Details
    payment_status ENUM('Pending', 'Processed', 'Paid', 'Failed') DEFAULT 'Pending',
    payment_date DATE,
    payment_mode ENUM('Bank Transfer', 'Cheque', 'Cash') DEFAULT 'Bank Transfer',
    transaction_id VARCHAR(100),
    
    remarks TEXT,
    generated_by INT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL,
    
    UNIQUE KEY unique_salary_record (employee_id, month, year),
    INDEX idx_employee (employee_id),
    INDEX idx_company (company_id),
    INDEX idx_month_year (month, year),
    INDEX idx_payment_status (payment_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- ALLOWANCES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS allowances (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    type ENUM('Fixed', 'Percentage', 'Variable') DEFAULT 'Fixed',
    default_amount DECIMAL(12, 2) DEFAULT 0,
    percentage_of VARCHAR(50),
    is_taxable BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    company_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    INDEX idx_code (code),
    INDEX idx_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- ACTIVITY LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    company_id INT,
    action ENUM(
        'CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT',
        'LOGIN', 'LOGOUT', 'UPLOAD', 'DOWNLOAD', 'VERIFY'
    ) NOT NULL,
    entity_type ENUM(
        'user', 'company', 'employee', 'document', 
        'salary', 'allowance', 'system'
    ) NOT NULL,
    entity_id INT,
    description TEXT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    
    INDEX idx_user (user_id),
    INDEX idx_company (company_id),
    INDEX idx_action (action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- LOGIN LOGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS login_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    email VARCHAR(255),
    status ENUM('SUCCESS', 'FAILED', 'LOCKED', 'EXPIRED') NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    failure_reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_email (email),
    INDEX idx_status (status),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- SESSIONS TABLE (Optional: for token management)
-- =============================================
CREATE TABLE IF NOT EXISTS sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_token (token_hash),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- EMPLOYEE SEQUENCE TABLE (For auto-generating employee IDs)
-- =============================================
CREATE TABLE IF NOT EXISTS employee_sequences (
    company_id INT PRIMARY KEY,
    last_sequence INT DEFAULT 0,
    prefix VARCHAR(10) DEFAULT 'EMP',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- STORED PROCEDURES
-- =============================================

-- Procedure to generate unique employee ID
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS generate_employee_id(
    IN p_company_id INT,
    OUT p_employee_id VARCHAR(50)
)
BEGIN
    DECLARE v_sequence INT;
    DECLARE v_prefix VARCHAR(10);
    DECLARE v_company_code VARCHAR(50);
    
    -- Get company code
    SELECT code INTO v_company_code FROM companies WHERE id = p_company_id;
    
    -- Get or create sequence
    INSERT INTO employee_sequences (company_id, last_sequence, prefix)
    VALUES (p_company_id, 0, UPPER(LEFT(v_company_code, 3)))
    ON DUPLICATE KEY UPDATE last_sequence = last_sequence + 1;
    
    SELECT last_sequence, prefix INTO v_sequence, v_prefix
    FROM employee_sequences WHERE company_id = p_company_id;
    
    -- Generate employee ID: PREFIX-YEAR-SEQUENCE
    SET p_employee_id = CONCAT(v_prefix, '-', YEAR(CURDATE()), '-', LPAD(v_sequence + 1, 4, '0'));
    
    -- Update sequence
    UPDATE employee_sequences SET last_sequence = v_sequence + 1 WHERE company_id = p_company_id;
END //
DELIMITER ;

-- =============================================
-- TRIGGERS
-- =============================================

-- Trigger to update company employee count on insert
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_employee_insert
AFTER INSERT ON employees
FOR EACH ROW
BEGIN
    UPDATE companies SET employee_count = employee_count + 1 WHERE id = NEW.company_id;
END //
DELIMITER ;

-- Trigger to update company employee count on delete
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_employee_delete
AFTER DELETE ON employees
FOR EACH ROW
BEGIN
    UPDATE companies SET employee_count = employee_count - 1 WHERE id = OLD.company_id;
END //
DELIMITER ;

-- =============================================
-- VIEWS
-- =============================================

-- View for employee summary
CREATE OR REPLACE VIEW employee_summary AS
SELECT 
    e.id,
    e.employee_id,
    e.first_name,
    e.last_name,
    CONCAT(e.first_name, ' ', COALESCE(e.last_name, '')) AS full_name,
    e.email,
    e.mobile,
    e.designation,
    e.department,
    e.date_of_joining,
    e.status,
    e.gross_salary,
    e.profile_photo,
    c.id AS company_id,
    c.name AS company_name,
    c.code AS company_code
FROM employees e
JOIN companies c ON e.company_id = c.id;

-- View for dashboard statistics
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT 
    c.id AS company_id,
    c.name AS company_name,
    COUNT(DISTINCT e.id) AS total_employees,
    SUM(e.gross_salary) AS total_salary,
    COUNT(DISTINCT CASE WHEN e.status = 'Active' THEN e.id END) AS active_employees,
    COUNT(DISTINCT CASE WHEN MONTH(e.date_of_joining) = MONTH(CURDATE()) 
        AND YEAR(e.date_of_joining) = YEAR(CURDATE()) THEN e.id END) AS new_joinings_this_month
FROM companies c
LEFT JOIN employees e ON c.id = e.company_id
GROUP BY c.id, c.name;
