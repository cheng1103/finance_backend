# 🚀 EC2 Deployment Guide - SEO Automation System

Complete step-by-step guide to deploy the SEO automation system on your EC2 instance **once** without needing to restart your backend.

---

## 📋 Prerequisites

- EC2 instance running (Ubuntu recommended)
- Node.js installed (v16 or higher)
- Your backend already running on EC2
- SSH access to EC2
- Domain: eplatformcredit.com

---

## 🎯 One-Time Deployment Steps

### Step 1: SSH into Your EC2 Instance

```bash
ssh ubuntu@your-ec2-ip-address
# Or if using key pair:
ssh -i your-key.pem ubuntu@your-ec2-ip-address
```

### Step 2: Navigate to Backend Directory

```bash
cd /home/ubuntu/finance_backend
# Verify you're in the right location
pwd
ls
```

You should see your existing backend files like `server.js`, `package.json`, etc.

### Step 3: Verify the SEO Automation Module Exists

```bash
cd seo-automation
ls
```

You should see:
- `config.js`
- `index.js`
- `scheduler.js`
- `package.json`
- `.env.example`
- `modules/`
- `utils/`
- etc.

### Step 4: Install Dependencies

```bash
# Make sure you're in the seo-automation directory
npm install
```

This will install:
- `@google/generative-ai` - Google Gemini API
- `axios` - HTTP client
- `node-cron` - Scheduler
- `marked` - Markdown parser
- `googleapis` - Google Indexing API

### Step 5: Configure Environment Variables

```bash
# Create .env file from example
cp .env.example .env

# Edit the .env file
nano .env
```

**Fill in these REQUIRED values:**

```env
# REQUIRED - Get from https://aistudio.google.com/app/apikey
GEMINI_API_KEY=AIzaSyAhRDVmgo5Cq6gqk2fvjEQ0dFqOzHJufQ0

# WordPress Credentials
WP_API_URL=https://eplatformcredit.com/wp-json/wp/v2/posts
WP_USER=your_wordpress_username
WP_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

**To create WordPress Application Password:**
1. Log into WordPress admin
2. Go to Users → Profile
3. Scroll to "Application Passwords"
4. Name it "SEO Automation"
5. Click "Add New Application Password"
6. Copy the generated password

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

### Step 6: Test the Configuration

```bash
# Test if everything is configured correctly
node index.js test
```

You should see:
```
✅ Configuration loaded successfully
✅ Configuration is valid
All systems ready
```

### Step 7: Test Article Generation (Optional but Recommended)

```bash
# Generate a single test article
node index.js generate "personal loan malaysia"
```

This will:
1. Generate an article using Gemini AI
2. Publish it to WordPress
3. Submit to Google Indexing

**This is a REAL operation** - it will create a live post on your site!

### Step 8: Install PM2 (if not already installed)

```bash
# Check if PM2 is installed
pm2 --version

# If not installed:
sudo npm install -g pm2
```

### Step 9: Start the SEO Automation with PM2

```bash
# Make sure you're in the seo-automation directory
cd /home/ubuntu/finance_backend/seo-automation

# Start with PM2
pm2 start ecosystem.config.js

# Save the PM2 process list
pm2 save

# Setup PM2 to start on system reboot
pm2 startup
# Follow the instructions it gives you (usually a command to copy/paste)
```

### Step 10: Verify It's Running

```bash
# Check PM2 status
pm2 status

# You should see:
# ┌─────┬──────────────────┬─────────┬─────────┐
# │ id  │ name             │ status  │ restart │
# ├─────┼──────────────────┼─────────┼─────────┤
# │ 0   │ seo-automation   │ online  │ 0       │
# └─────┴──────────────────┴─────────┴─────────┘
```

### Step 11: View Logs

```bash
# View real-time logs
pm2 logs seo-automation

# View last 100 lines
pm2 logs seo-automation --lines 100

# To exit logs, press Ctrl+C
```

---

## 📊 Monitoring & Management

### Check Status

```bash
pm2 status
```

### View Logs

```bash
# Real-time logs
pm2 logs seo-automation

# Application logs (detailed)
cd /home/ubuntu/finance_backend/seo-automation
tail -f logs/seo-automation-$(date +%Y-%m-%d).log
```

### Restart (if needed)

```bash
pm2 restart seo-automation
```

### Stop (if needed)

```bash
pm2 stop seo-automation
```

### Manual Trigger (run immediately)

```bash
cd /home/ubuntu/finance_backend/seo-automation
node index.js run
```

### Check Keyword Statistics

```bash
cd /home/ubuntu/finance_backend/seo-automation
node index.js stats
```

---

## 🕐 Default Schedule

The system will run automatically **every day at 9:00 AM (server timezone)** and generate **3 articles**.

To change this:

```bash
nano .env

# Modify these values:
ARTICLES_PER_DAY=5          # Change number of articles
CRON_SCHEDULE=0 14 * * *    # Change time (this is 2 PM)
```

After changing `.env`, restart PM2:
```bash
pm2 restart seo-automation
```

---

## 🔧 Troubleshooting

### Problem: "GEMINI_API_KEY is required"

**Solution:**
```bash
cd /home/ubuntu/finance_backend/seo-automation
nano .env
# Make sure GEMINI_API_KEY is filled in
# Save and restart: pm2 restart seo-automation
```

### Problem: "WordPress credentials not configured"

**Solution:**
1. Create WordPress Application Password (see Step 5)
2. Add to `.env`:
   ```
   WP_USER=your_username
   WP_APP_PASSWORD=xxxx xxxx xxxx xxxx
   ```
3. Restart: `pm2 restart seo-automation`

### Problem: Application not starting

**Check logs:**
```bash
pm2 logs seo-automation --lines 50
```

**Common issues:**
- Missing `.env` file → Create from `.env.example`
- Wrong directory → Make sure you're in `/home/ubuntu/finance_backend/seo-automation`
- Missing dependencies → Run `npm install`

### Problem: Articles not being generated

**Check the scheduler:**
```bash
pm2 logs seo-automation | grep "Cron job triggered"
```

If you don't see cron triggers, check:
1. Is `SCHEDULER_ENABLED=true` in `.env`?
2. Is the cron schedule format correct?
3. Manually trigger to test: `node index.js run`

---

## 📁 Directory Structure

```
/home/ubuntu/finance_backend/
├── server.js                    # Your main backend (still running)
├── package.json
└── seo-automation/              # ← NEW: SEO automation system
    ├── index.js                 # Main entry point
    ├── scheduler.js             # Cron scheduler
    ├── config.js                # Configuration
    ├── .env                     # Your credentials (DO NOT commit!)
    ├── ecosystem.config.js      # PM2 configuration
    ├── deploy.sh                # Deployment script
    ├── modules/
    │   ├── generateArticle.js   # AI article generation
    │   ├── publishToWP.js       # WordPress publishing
    │   └── submitToGoogle.js    # Google indexing
    ├── utils/
    │   ├── keywords.js          # Keyword management
    │   └── logger.js            # Logging
    ├── data/                    # Used keywords tracking
    ├── output/                  # Generated articles (JSON)
    └── logs/                    # Application logs
```

---

## 🎯 Quick Reference Commands

| Task | Command |
|------|---------|
| Check status | `pm2 status` |
| View logs | `pm2 logs seo-automation` |
| Restart | `pm2 restart seo-automation` |
| Stop | `pm2 stop seo-automation` |
| Manual run | `cd /home/ubuntu/finance_backend/seo-automation && node index.js run` |
| Test config | `node index.js test` |
| Generate single | `node index.js generate "keyword here"` |
| Check stats | `node index.js stats` |
| View app logs | `tail -f logs/seo-automation-$(date +%Y-%m-%d).log` |

---

## 🔄 Future Updates

When you need to update the system:

```bash
# SSH into EC2
ssh ubuntu@your-ec2-ip

# Navigate to seo-automation
cd /home/ubuntu/finance_backend/seo-automation

# Make your changes
# ...

# Restart PM2
pm2 restart seo-automation
```

---

## 📊 Monitoring Best Practices

### Daily Checks (First Week)

```bash
# Check if it ran today
pm2 logs seo-automation | grep "Daily Automation Summary"

# Check keyword stats
node index.js stats

# View recent logs
tail -50 logs/seo-automation-$(date +%Y-%m-%d).log
```

### Weekly Checks (After First Week)

```bash
# Check PM2 status
pm2 status

# Check if errors occurred
pm2 logs seo-automation --err --lines 20

# Verify articles are being published
node index.js stats
```

---

## ✅ Deployment Checklist

Use this checklist for your deployment:

- [ ] SSH into EC2
- [ ] Navigate to `/home/ubuntu/finance_backend/seo-automation`
- [ ] Run `npm install`
- [ ] Create `.env` from `.env.example`
- [ ] Fill in `GEMINI_API_KEY` in `.env`
- [ ] Fill in WordPress credentials in `.env`
- [ ] Run `node index.js test` to verify config
- [ ] (Optional) Test with `node index.js generate "test keyword"`
- [ ] Install PM2 if needed: `sudo npm install -g pm2`
- [ ] Start with PM2: `pm2 start ecosystem.config.js`
- [ ] Save PM2 process: `pm2 save`
- [ ] Setup PM2 startup: `pm2 startup`
- [ ] Verify running: `pm2 status`
- [ ] Check logs: `pm2 logs seo-automation`

---

## 🆘 Support

If you encounter issues:

1. **Check logs**: `pm2 logs seo-automation --lines 100`
2. **Test config**: `node index.js test`
3. **Verify .env**: `cat .env` (check all values are filled)
4. **Manual test**: `node index.js generate "test keyword"`

---

## 🎉 That's It!

Your SEO automation system is now running independently on EC2 without affecting your main backend!

**What happens next:**
- Every day at 9 AM, the system will:
  1. Select 3 unused keywords
  2. Generate SEO-optimized articles
  3. Publish to WordPress
  4. Submit to Google for indexing
  5. Log everything

You can monitor progress via PM2 logs and check the WordPress site for new posts!
