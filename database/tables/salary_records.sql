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
