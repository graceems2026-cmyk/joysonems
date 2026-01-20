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
