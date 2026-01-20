#!/bin/bash
# Database backup script for Joyson EMS
# Save as: /usr/local/bin/backup-joyson-ems.sh
# Make executable: chmod +x /usr/local/bin/backup-joyson-ems.sh

BACKUP_DIR="/var/backups/joyson-ems"
DB_HOST="localhost"
DB_USER="ems_user"
DB_NAME="employee_management"
BACKUP_RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql"

# Create database backup
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASSWORD $DB_NAME > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "✓ Database backup created: $BACKUP_FILE"
    
    # Compress backup
    gzip $BACKUP_FILE
    echo "✓ Backup compressed"
    
    # Remove old backups (older than BACKUP_RETENTION_DAYS)
    find $BACKUP_DIR -name "backup_*.sql.gz" -type f -mtime +$BACKUP_RETENTION_DAYS -delete
    echo "✓ Old backups cleaned up"
else
    echo "✗ Database backup failed"
    exit 1
fi
