#!/bin/bash

###############################################################################
# Setup Automatic Database Backup Cron Job
#
# This script helps you set up a cron job for automatic daily database backups
#
# Usage: bash scripts/setup-backup-cron.sh
###############################################################################

echo "=========================================="
echo "Database Backup Cron Setup"
echo "=========================================="
echo ""

# Get the absolute path to the project
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_SCRIPT="$PROJECT_DIR/scripts/backup-database.js"

echo "Project directory: $PROJECT_DIR"
echo "Backup script: $BACKUP_SCRIPT"
echo ""

# Check if backup script exists
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo "❌ Error: Backup script not found at $BACKUP_SCRIPT"
    exit 1
fi

echo "Suggested cron schedule options:"
echo ""
echo "1. Daily at 2:00 AM"
echo "   Cron: 0 2 * * *"
echo ""
echo "2. Daily at 3:00 AM"
echo "   Cron: 0 3 * * *"
echo ""
echo "3. Twice daily (2 AM and 2 PM)"
echo "   Cron: 0 2,14 * * *"
echo ""
echo "4. Every 12 hours"
echo "   Cron: 0 */12 * * *"
echo ""

# Generate cron job command
CRON_COMMAND="0 2 * * * cd $PROJECT_DIR && /usr/bin/node $BACKUP_SCRIPT >> $PROJECT_DIR/logs/backup.log 2>&1"

echo "Recommended cron job to add:"
echo "-------------------------------------------"
echo "$CRON_COMMAND"
echo "-------------------------------------------"
echo ""

echo "To add this cron job manually:"
echo "1. Run: crontab -e"
echo "2. Add the line above"
echo "3. Save and exit"
echo ""

echo "Or add it automatically? (y/n)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    # Check if cron job already exists
    if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
        echo "⚠️  Cron job already exists. Skipping."
    else
        # Add cron job
        (crontab -l 2>/dev/null; echo "$CRON_COMMAND") | crontab -
        echo "✅ Cron job added successfully!"
        echo ""
        echo "Current crontab:"
        crontab -l
    fi
else
    echo "Skipped automatic setup. Please add manually using instructions above."
fi

echo ""
echo "=========================================="
echo "Setup Complete"
echo "=========================================="
echo ""
echo "Notes:"
echo "- Backups will be stored in: $PROJECT_DIR/backups/"
echo "- Logs will be stored in: $PROJECT_DIR/logs/backup.log"
echo "- Old backups are automatically cleaned after 7 days"
echo "- For MongoDB Atlas, also enable Atlas automated backups"
echo ""
echo "Test the backup manually:"
echo "  node $BACKUP_SCRIPT"
echo ""
