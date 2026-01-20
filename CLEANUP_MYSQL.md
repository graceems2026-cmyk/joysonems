# Clean Up MySQL Files

The project has been converted to SQLite. MySQL files are locked and cannot be deleted while MySQL service is running.

## To delete MySQL files manually:

1. **Stop MySQL Service** (if running):
   ```powershell
   net stop MySQL
   ```
   Or use Task Manager to stop mysqld.exe process

2. **Delete MySQL folder**:
   ```powershell
   Remove-Item "D:\ZEONY\JOYSON EMP\mysql-data" -Recurse -Force
   ```

## Files already removed:
- ✅ my.ini (MySQL config)
- ✅ start-mysql.bat
- ✅ check-mysql-location.js
- ✅ migrate-mysql-data.ps1
- ✅ migrate-data.ps1
- ✅ database/exports/ folder
- ✅ database/export-tables.js
- ✅ create-sqlite-db.js

## Still present (locked by MySQL):
- ⚠️ mysql-data/ folder - Delete manually after stopping MySQL

## New Database:
- ✅ **employees.db** - Your SQLite database file (single file, easy to manage!)
