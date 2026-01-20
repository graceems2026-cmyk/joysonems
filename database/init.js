require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
    let connection;
    
    try {
        console.log('🔄 Connecting to MySQL server...');
        console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
        console.log(`   User: ${process.env.DB_USER || 'root'}`);
        console.log(`   Database: ${process.env.DB_NAME || 'employee_management'}`);
        
        // Connect without database first
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT) || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            multipleStatements: true
        });

        console.log('✅ Connected to MySQL server');

        // Create database if not exists
        const dbName = process.env.DB_NAME || 'employee_management';
        console.log(`📦 Creating database '${dbName}'...`);
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
        await connection.query(`USE ${dbName}`);
        console.log('✅ Database selected');

        // Read and execute schema
        const schemaPath = path.join(__dirname, 'schema.sql');
        console.log(`📄 Reading schema from: ${schemaPath}`);
        
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`Schema file not found at: ${schemaPath}`);
        }
        
        const schema = fs.readFileSync(schemaPath, 'utf8');

        // Split statements more intelligently
        // Remove USE database statement from schema
        const cleanSchema = schema.replace(/USE\s+employee_management\s*;/gi, '');
        
        // Split by semicolon but handle DELIMITER changes
        let statements = [];
        let currentStatement = '';
        let inDelimiter = false;
        
        const lines = cleanSchema.split('\n');
        
        for (let line of lines) {
            // Skip comments
            if (line.trim().startsWith('--') || line.trim().startsWith('/*')) continue;
            
            // Handle DELIMITER
            if (line.includes('DELIMITER')) {
                if (line.includes('DELIMITER //')) {
                    inDelimiter = true;
                } else if (line.includes('DELIMITER ;')) {
                    inDelimiter = false;
                    if (currentStatement.trim()) {
                        statements.push(currentStatement.trim());
                        currentStatement = '';
                    }
                }
                continue;
            }
            
            currentStatement += line + '\n';
            
            // If not in delimiter mode and line ends with semicolon, it's a statement
            if (!inDelimiter && line.trim().endsWith(';')) {
                if (currentStatement.trim()) {
                    statements.push(currentStatement.trim());
                    currentStatement = '';
                }
            } else if (inDelimiter && line.trim().startsWith('END')) {
                // For procedures/triggers, look for END followed by //
                if (currentStatement.includes('//')) {
                    const withoutDelimiter = currentStatement.replace(/\/\/\s*$/, '').trim();
                    if (withoutDelimiter) {
                        statements.push(withoutDelimiter);
                        currentStatement = '';
                    }
                }
            }
        }

        console.log(`📋 Found ${statements.length} SQL statements to execute`);
        console.log('⏳ Executing schema...');
        
        let executed = 0;
        for (const statement of statements) {
            const trimmed = statement.trim();
            if (!trimmed || trimmed.startsWith('--')) continue;
            
            try {
                await connection.query(trimmed);
                executed++;
                if (executed % 5 === 0) {
                    console.log(`   ... executed ${executed} statements`);
                }
            } catch (err) {
                // Ignore certain errors
                if (err.message.includes('already exists') || 
                    err.message.includes('Duplicate') ||
                    err.message.includes('Unknown database') ||
                    err.code === 'ER_TABLE_EXISTS_ERROR' ||
                    err.code === 'ER_SP_ALREADY_EXISTS') {
                    // Silent ignore
                    continue;
                }
                console.warn(`⚠️  Warning on statement: ${err.message.substring(0, 100)}`);
            }
        }

        console.log(`✅ Executed ${executed} statements successfully!`);
        console.log('✅ Database schema created successfully!');
        console.log('');
        console.log('🎉 Database initialization complete!');
        console.log('');
        console.log('Next steps:');
        console.log('  1. Run: npm run db:seed (to add sample data)');
        console.log('  2. Run: npm start (to start the server)');

    } catch (error) {
        console.error('');
        console.error('❌ Database initialization failed!');
        console.error('');
        console.error('Error:', error.message);
        console.error('');
        
        if (error.code === 'ECONNREFUSED') {
            console.error('💡 Troubleshooting:');
            console.error('   - Make sure MySQL is running');
            console.error('   - Check your DB_HOST and DB_PORT in .env file');
        } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('💡 Troubleshooting:');
            console.error('   - Check your DB_USER and DB_PASSWORD in .env file');
            console.error('   - Make sure the user has CREATE DATABASE privileges');
        } else {
            console.error('💡 Full error details:');
            console.error(error);
        }
        
        console.error('');
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

initializeDatabase();
