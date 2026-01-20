const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { promisify } = require('util');

// SQLite database file path
const dbPath = path.join(__dirname, '..', 'employees.db');

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Database connection failed:', err.message);
    } else {
        console.log('✅ Database connected successfully');
        // Enable foreign keys
        db.run('PRAGMA foreign_keys = ON');
    }
});

// Promisify database methods for async/await
db.runAsync = function(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};
db.getAsync = promisify(db.get.bind(db));
db.allAsync = promisify(db.all.bind(db));

// MySQL-like query interface for compatibility
const pool = {
    async query(sql, params = []) {
        // Handle transaction commands
        const upperSql = sql.trim().toUpperCase();
        if (upperSql === 'BEGIN TRANSACTION' || upperSql === 'BEGIN') {
            await db.runAsync('BEGIN TRANSACTION');
            return [{ affectedRows: 0 }];
        }
        if (upperSql === 'COMMIT') {
            await db.runAsync('COMMIT');
            return [{ affectedRows: 0 }];
        }
        if (upperSql === 'ROLLBACK') {
            await db.runAsync('ROLLBACK');
            return [{ affectedRows: 0 }];
        }
        
        // Handle SELECT queries
        if (upperSql.startsWith('SELECT') || upperSql.startsWith('SHOW')) {
            const rows = await db.allAsync(sql, params);
            return [rows];
        }
        
        // Handle INSERT/UPDATE/DELETE queries
        const result = await db.runAsync(sql, params);
        return [{ 
            affectedRows: result ? result.changes : 0,
            insertId: result ? result.lastID : null,
            changes: result ? result.changes : 0
        }];
    },
    
    async execute(sql, params = []) {
        return this.query(sql, params);
    },
    
    async getConnection() {
        return {
            query: this.query.bind(this),
            execute: this.execute.bind(this),
            release: () => {},
            beginTransaction: async () => db.runAsync('BEGIN TRANSACTION'),
            commit: async () => db.runAsync('COMMIT'),
            rollback: async () => db.runAsync('ROLLBACK')
        };
    },
    
    async end() {
        return new Promise((resolve) => db.close(resolve));
    }
};

module.exports = pool;
