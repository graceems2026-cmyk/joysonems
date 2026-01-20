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
    mother_name VARCHAR(255),
    spouse_name VARCHAR(255),
    number_of_children INT DEFAULT 0,
    children_names JSON,
    date_of_birth DATE,
    gender ENUM('Male', 'Female', 'Other'),
    marital_status ENUM('Single', 'Married', 'Divorced', 'Widowed'),
    blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
    nationality VARCHAR(50) DEFAULT 'Indian',
    religion VARCHAR(50),
    
    -- Medical Details
    medical_details TEXT,
    
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
    aadhaar_attachment VARCHAR(500),
    pan_number VARCHAR(20),
    passport_number VARCHAR(50),
    driving_license VARCHAR(50),
    driving_license_attachment VARCHAR(500),
    voter_id VARCHAR(50),
    
    -- Bank Details (Encrypted)
    account_holder_name VARCHAR(255),
    bank_name VARCHAR(100),
    bank_branch VARCHAR(100),
    bank_account_encrypted VARCHAR(500),
    bank_ifsc VARCHAR(20),
    bank_passbook_attachment VARCHAR(500),
    
    -- Employment Details
    designation VARCHAR(100),
    department VARCHAR(100),
    employment_type ENUM('Full-time', 'Part-time', 'Contract', 'Intern', 'Probation') DEFAULT 'Full-time',
    date_of_joining DATE NOT NULL,
    year_of_joining INT GENERATED ALWAYS AS (YEAR(date_of_joining)) STORED,
    education_qualification TEXT,
    education_attachment VARCHAR(500),
    confirmation_date DATE,
    past_work_profiles JSON,
    
    -- Termination/Leaving Details
    date_of_leaving DATE,
    last_day_of_work DATE,
    leaving_reason TEXT,
    final_payment DECIMAL(12, 2),
    leaving_other_details TEXT,
    leaving_attachment VARCHAR(500),
    
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
    
    -- Reporting Person
    reporting_person_name VARCHAR(255),
    reporting_person_role VARCHAR(100),
    
    -- Training and Development
    training_records JSON,
    
    -- Performance Records
    performance_records JSON,
    
    -- Leave Records
    leave_records JSON,
    
    -- Profile Photo
    profile_photo VARCHAR(500),
    
    -- Digital Signature
    signature VARCHAR(500),
    
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
