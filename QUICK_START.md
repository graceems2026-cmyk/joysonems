# 🚀 QUICK START GUIDE

## Employee Management System Installation

### Prerequisites
- Node.js (v14 or higher)
- SQLite3 (comes with Node.js sqlite3 package)

---

## Step-by-Step Installation

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Database
The application uses SQLite database (employees.db) which will be created automatically. No additional configuration needed.

### 3. Initialize Database
```bash
npm run db:init
```

This will create all necessary tables, views, and indexes in the SQLite database.

### 4. Seed Database (Optional but Recommended)
```bash
npm run db:seed
```

This creates:
- 3 sample companies
- 4 user accounts (1 Super Admin + 3 Company Admins)
- 30 sample employees (10 per company)
- Sample allowances and department data

### 5. Start the Server
```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The server will start on: http://localhost:3000

---

## 🔐 Default Login Credentials

After seeding the database, use these credentials:

**Super Admin (Access to ALL companies)**
- Email: `superadmin@joyson.com`
- Password: `Admin@123`

**Company Admins (Access to their company only)**
- Joyson Tech: `admin@joysontech.com` / `Admin@123`
- Joyson Manufacturing: `admin@joysonmfg.com` / `Admin@123`
- Joyson Services: `admin@joysonsvc.com` / `Admin@123`

---

## 📁 Project Structure

```
JOYSON EMP/
├── config/
│   └── database.js          # Database connection
├── database/
│   ├── schema.sql           # Complete database schema
│   ├── init.js             # Database initialization
│   └── seed.js             # Seed data
├── middleware/
│   ├── auth.js             # JWT authentication
│   ├── logger.js           # Activity logging
│   ├── upload.js           # File upload handling
│   └── validation.js       # Input validation
├── routes/
│   ├── auth.js             # Authentication routes
│   ├── companies.js        # Company management
│   ├── employees.js        # Employee management
│   ├── documents.js        # Document management
│   ├── dashboard.js        # Dashboard & analytics
│   ├── logs.js             # Activity logs
│   └── users.js            # User management
├── utils/
│   ├── encryption.js       # Data encryption
│   └── helpers.js          # Utility functions
├── public/
│   ├── index.html          # Main HTML file
│   └── js/
│       ├── api.js          # API helper functions
│       ├── auth.js         # Authentication logic
│       ├── app.js          # Main app logic
│       ├── dashboard.js    # Dashboard page
│       ├── companies.js    # Companies page
│       ├── employees.js    # Employees page
│       ├── documents.js    # Documents page
│       ├── users.js        # Users page
│       └── logs.js         # Logs page
├── uploads/                # File storage (auto-created)
├── .env                    # Environment variables
├── .env.example           # Environment template
├── package.json           # Dependencies
├── server.js              # Express server
└── README.md              # Documentation
```

---

## 🎯 Key Features

### Role-Based Access Control
- **SUPER_ADMIN**: Full system access, manage all companies
- **COMPANY_ADMIN**: Manage own company's employees
- **HR, VIEWER, AUDITOR**: Read-only or limited access (future use)

### Security Features
- JWT authentication with token expiration
- Password hashing with bcrypt (12 rounds)
- AES encryption for sensitive data (Aadhaar, Bank details)
- Activity logging for all operations
- Rate limiting on API endpoints
- SQL injection protection
- File upload validation

### Employee Management
- Complete CRUD operations
- Auto-generated employee IDs
- Profile photo upload
- Salary & allowances tracking
- Document management
- Search & filter capabilities
- Excel export

### Dashboard & Analytics
- Real-time statistics
- Department distribution charts
- Monthly joining trends
- Salary analytics
- Document verification status
- Company-wise employee distribution (Super Admin)

---

## 🔧 Troubleshooting

### Database Connection Error
Make sure MySQL is running and credentials in `.env` are correct:
```bash
# Test MySQL connection
mysql -u root -p
```

### Port Already in Use
Change the port in `.env`:
```env
PORT=3001
```

### Permission Errors on Uploads
Create the uploads directory manually:
```bash
mkdir uploads
```

---

## 📊 Database Schema Highlights

**Main Tables:**
- `users` - Authentication & RBAC
- `companies` - Company master data
- `employees` - Employee information (with encrypted fields)
- `employee_documents` - Document metadata
- `activity_logs` - Complete audit trail
- `login_logs` - Login history
- `salary_records` - Salary information

**Features:**
- Foreign key constraints
- Indexed columns for performance
- Auto-generated employee IDs via stored procedure
- Triggers for employee count updates
- Views for common queries

---

## 🚀 Next Steps

1. **Customize Companies**: Delete sample companies and add your real ones
2. **Create Users**: Add company admins for each company
3. **Configure Settings**: Update JWT secret and encryption keys in `.env`
4. **Add Employees**: Start adding real employee data
5. **Upload Documents**: Add employee documents with verification

---

## 📞 Support

For issues or questions:
- Check the README.md file
- Review the database schema in `database/schema.sql`
- Check server logs for errors
- Ensure all environment variables are set correctly

---

## 🔒 Production Deployment Checklist

- [ ] Change all default passwords
- [ ] Update JWT_SECRET to a strong random value
- [ ] Update ENCRYPTION_KEY to a strong random value
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS
- [ ] Configure proper CORS origins
- [ ] Set up regular database backups
- [ ] Configure firewall rules
- [ ] Set up monitoring and logging
- [ ] Test file upload limits
- [ ] Review and adjust rate limits

---

**Built with ❤️ for Joyson Employee Management**
