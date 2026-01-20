# Employee Management System

Production-grade Employee Management System for Group of Companies built with Node.js, Express, SQLite, and Vanilla JavaScript.

## Features

- **Multi-Company Support**: Manage multiple companies under one platform
- **Role-Based Access Control (RBAC)**: Super Admin, Company Admin, HR, Viewer, Auditor roles
- **Employee Management**: Complete CRUD operations with profile photos
- **Document Management**: Secure file storage and verification system
- **Dashboard & Analytics**: Real-time statistics and visualizations
- **Activity Logging**: Complete audit trail of all system activities
- **Excel Export**: Export employee data to Excel
- **Security**: JWT authentication, password hashing, data encryption

## Tech Stack

### Backend
- Node.js & Express.js
- SQLite Database
- JWT Authentication
- Bcrypt for password hashing
- Crypto-JS for data encryption
- Multer for file uploads

### Frontend
- HTML5
- Tailwind CSS (Blue theme)
- Vanilla JavaScript
- Chart.js for analytics

## Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd "JOYSON EMP"
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
# The application uses SQLite database (employees.db) which will be created automatically
```

4. **Initialize database**
```bash
npm run db:init
```

5. **Seed database (optional)**
```bash
npm run db:seed
```

6. **Start the server**
```bash
# Development
npm run dev

# Production
npm start
```

## Default Credentials

After running the seed script:

- **Super Admin**: superadmin@joyson.com / Admin@123
- **Tech Admin**: admin@joysontech.com / Admin@123
- **Mfg Admin**: admin@joysonmfg.com / Admin@123
- **Svc Admin**: admin@joysonsvc.com / Admin@123

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/logout` - Logout

### Companies
- `GET /api/companies` - List all companies
- `POST /api/companies` - Create company
- `GET /api/companies/:id` - Get company details
- `PUT /api/companies/:id` - Update company
- `DELETE /api/companies/:id` - Delete company
- `POST /api/companies/:id/logo` - Upload company logo

### Employees
- `GET /api/employees` - List employees
- `POST /api/employees` - Create employee
- `GET /api/employees/:id` - Get employee details
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee
- `POST /api/employees/:id/photo` - Upload profile photo
- `GET /api/employees/export/excel` - Export to Excel

### Documents
- `GET /api/documents/employee/:employeeId` - List documents
- `POST /api/documents/employee/:employeeId` - Upload document
- `GET /api/documents/:id/download` - Download document
- `PUT /api/documents/:id/verify` - Verify document
- `DELETE /api/documents/:id` - Delete document

### Dashboard
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/dashboard/salary-analytics` - Salary analytics
- `GET /api/dashboard/document-stats` - Document statistics

### Logs
- `GET /api/logs/activity` - Activity logs
- `GET /api/logs/login` - Login logs
- `GET /api/logs/audit-summary` - Audit summary

## Database Schema

Key tables:
- `users` - User accounts and authentication
- `companies` - Company information
- `employees` - Employee master data
- `employee_documents` - Document storage metadata
- `salary_records` - Salary information
- `activity_logs` - Audit trail
- `login_logs` - Login history

## Security Features

- **JWT-based authentication**
- **Password hashing with bcrypt** (12 rounds)
- **AES encryption** for sensitive data (Aadhaar, Bank details)
- **Role-based access control**
- **Activity logging** for all operations
- **Rate limiting** on API endpoints
- **Helmet.js** for security headers
- **File upload validation**
- **SQL injection protection**

## File Storage

Files are stored in:
```
uploads/
  └── {company_id}/
      └── {employee_id}/
          ├── documents/
          └── photos/
  └── companies/
      └── {company_id}/
```

## Environment Variables

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=employee_management
JWT_SECRET=your_secret_key
ENCRYPTION_KEY=your_encryption_key
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
```

## License

Proprietary - All rights reserved

## Support

For support, contact: support@joyson.com
