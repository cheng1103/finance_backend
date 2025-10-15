#!/bin/bash

###############################################################################
# SEO Automation - EC2 Deployment Script
###############################################################################

set -e  # Exit on error

echo "=================================================="
echo "🚀 SEO Automation System - Deployment Script"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/home/ubuntu/finance_backend/seo-automation"
BACKUP_DIR="/home/ubuntu/backups/seo-automation"

###############################################################################
# Functions
###############################################################################

log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

###############################################################################
# Pre-deployment Checks
###############################################################################

echo "📋 Running pre-deployment checks..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    exit 1
fi
log_info "Node.js $(node --version) is installed"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    log_error "npm is not installed"
    exit 1
fi
log_info "npm $(npm --version) is installed"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    log_warn "PM2 is not installed. Installing..."
    sudo npm install -g pm2
fi
log_info "PM2 $(pm2 --version) is installed"

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    log_error "Project directory not found: $PROJECT_DIR"
    exit 1
fi
log_info "Project directory found"

# Check if .env file exists
if [ ! -f "$PROJECT_DIR/.env" ]; then
    log_error ".env file not found. Please create it from .env.example"
    exit 1
fi
log_info ".env file found"

echo ""

###############################################################################
# Backup
###############################################################################

echo "💾 Creating backup..."
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup with timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$TIMESTAMP.tar.gz"

cd "$PROJECT_DIR"
tar -czf "$BACKUP_FILE" \
    --exclude='node_modules' \
    --exclude='logs' \
    --exclude='output' \
    . || log_warn "Backup creation failed (continuing anyway)"

if [ -f "$BACKUP_FILE" ]; then
    log_info "Backup created: $BACKUP_FILE"
else
    log_warn "Backup not created (may not be critical)"
fi

echo ""

###############################################################################
# Install Dependencies
###############################################################################

echo "📦 Installing dependencies..."
echo ""

cd "$PROJECT_DIR"
npm install --production

if [ $? -eq 0 ]; then
    log_info "Dependencies installed successfully"
else
    log_error "Failed to install dependencies"
    exit 1
fi

echo ""

###############################################################################
# Restart PM2 Application
###############################################################################

echo "🔄 Restarting application with PM2..."
echo ""

# Stop existing process if running
pm2 stop seo-automation 2>/dev/null || log_info "No existing process to stop"

# Delete old process
pm2 delete seo-automation 2>/dev/null || log_info "No existing process to delete"

# Start new process
pm2 start ecosystem.config.js

if [ $? -eq 0 ]; then
    log_info "Application started successfully"
else
    log_error "Failed to start application"
    exit 1
fi

# Save PM2 process list
pm2 save

echo ""

###############################################################################
# Post-deployment Checks
###############################################################################

echo "🔍 Running post-deployment checks..."
echo ""

# Wait for application to start
sleep 3

# Check if application is running
if pm2 list | grep -q "seo-automation.*online"; then
    log_info "Application is running"
else
    log_error "Application failed to start"
    pm2 logs seo-automation --lines 20
    exit 1
fi

# Run configuration test
cd "$PROJECT_DIR"
if node index.js test > /dev/null 2>&1; then
    log_info "Configuration test passed"
else
    log_error "Configuration test failed"
    node index.js test
    exit 1
fi

echo ""

###############################################################################
# Summary
###############################################################################

echo "=================================================="
echo "✅ Deployment completed successfully!"
echo "=================================================="
echo ""
echo "📊 Status:"
pm2 status seo-automation
echo ""
echo "📝 Useful commands:"
echo "   pm2 logs seo-automation       - View logs"
echo "   pm2 restart seo-automation    - Restart app"
echo "   pm2 stop seo-automation       - Stop app"
echo "   pm2 monit                     - Monitor resources"
echo "   node index.js stats           - View keyword stats"
echo "   node index.js run             - Manual trigger"
echo ""
echo "📂 Project directory: $PROJECT_DIR"
echo "💾 Backup location: $BACKUP_FILE"
echo ""
echo "🎉 Ready to generate SEO content!"
echo ""
