# Database Structure - SQLite

## 📁 Database File

The project uses **SQLite** - a single file database:

```
employees.db               # Main database file (in project root)
```

## 📁 Directory Organization

```
database/
├── schema.sql              # Complete database schema (all tables)
├── seed.js                # Sample data seeding script  
├── init.js                # Database initialization script
└── tables/                # Individual table definitions (for reference)
    ├── companies.sql
    ├── users.sql
    ├── employees.sql
    ├── employee_documents.sql
    ├── salary_records.sql
    ├── allowances.sql
    ├── activity_logs.sql
    ├── login_logs.sql
    ├── sessions.sql
    └── employee_sequences.sql
```

## 📊 Tables Overview

### Core Tables
1. **companies** - Company master data
2. **users** - User authentication and roles (RBAC)
3. **employees** - Employee master records
4. **employee_documents** - Document storage metadata
5. **employee_sequences** - Auto-generated employee IDs

### Transaction Tables
6. **salary_records** - Monthly salary processing
7. **allowances** - Salary component definitions

### Audit & Logging
8. **activity_logs** - System activity tracking
9. **login_logs** - Authentication logs
10. **sessions** - JWT token management (optional)

## 🚀 Usage

### View Database File
The **employees.db** file in the project root contains all your data. You can:
- See it in VS Code file explorer
- Copy/backup easily (just one file!)
- Open with SQLite viewers or extensions

### View Individual Table Definitions
Navigate to `database/tables/` folder to see each table's structure in separate SQL files (for reference).

### View Data Using SQLite
Install a VS Code extension to browse tables:
- **SQLite Viewer** (by Florian Klampfer)
- **SQLite** (by alexcvzz)

Or use command line:
```bash
sqlite3 employees.db
```

### Backup Database
Simply copy the file:
```bash
copy employees.db employees_backup.db
```

## 🔍 Table Relationships

```
companies (1) ──→ (N) employees
companies (1) ──→ (N) users
companies (1) ──→ (N) salary_records
companies (1) ──→ (N) allowances

employees (1) ──→ (N) employee_documents
employees (1) ──→ (N) salary_records

users (1) ──→ (N) activity_logs
users (1) ──→ (N) login_logs
users (1) ──→ (N) sessions
```

## 📝 Notes

- All tables use InnoDB engine for transaction support
- Character set: UTF8MB4 (supports emojis and international characters)
- Timestamps track creation and modification times
- Foreign keys ensure referential integrity
- Indexes optimize common queries
