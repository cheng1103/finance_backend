# 🤖 SEO Automation System

Automated SEO content generation system using **Google Gemini API** + **WordPress REST API** + **Google Indexing API** for eplatformcredit.com.

## 🎯 Features

- ✅ **Automated Article Generation** - Uses Google Gemini AI to generate SEO-optimized articles
- ✅ **WordPress Auto-Publishing** - Publishes directly to WordPress via REST API
- ✅ **Google Indexing** - Auto-submits URLs to Google for faster indexing
- ✅ **Daily Scheduling** - Runs automatically (default: 3-5 articles/day)
- ✅ **Keyword Management** - Tracks used keywords to avoid duplication
- ✅ **Malaysian Localization** - Content specifically for Malaysian market
- ✅ **Complete Logging** - All operations logged for monitoring

## 📁 Project Structure

```
seo-automation/
├── config.js                      # Configuration & environment variables
├── index.js                       # Main entry point
├── scheduler.js                   # Cron scheduler
├── package.json                   # Dependencies
├── modules/
│   ├── generateArticle.js        # Gemini AI article generation
│   ├── publishToWP.js            # WordPress publishing
│   └── submitToGoogle.js         # Google Indexing API
├── utils/
│   ├── keywords.js               # Keyword management
│   └── logger.js                 # Logging utility
├── data/                          # Used keywords tracking
├── output/                        # Generated articles (JSON)
└── logs/                          # Application logs
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd seo-automation
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
nano .env
```

**Required:**
- `GEMINI_API_KEY` - Get from Google AI Studio

**For Publishing:**
- `WP_USER` and `WP_APP_PASSWORD` - WordPress credentials
- `WP_API_URL` - Your WordPress REST API endpoint

**For Indexing:**
- Google Service Account credentials (optional but recommended)

### 3. Test the System

```bash
# Test configuration
node index.js test

# Generate a single article (manual test)
node index.js generate "low ctos loan malaysia"

# Run full automation once (manual trigger)
node index.js run

# Show keyword statistics
node index.js stats
```

### 4. Start the Scheduler

```bash
# Start with Node.js
node index.js

# Or use PM2 (recommended for production)
pm2 start ecosystem.config.js
pm2 logs seo-automation
```

## 📋 Commands

| Command | Description |
|---------|-------------|
| `node index.js` | Start scheduler (default: 9 AM daily) |
| `node index.js run` | Run immediately (manual trigger) |
| `node index.js generate "<keyword>"` | Generate single article |
| `node index.js stats` | Show keyword statistics |
| `node index.js test` | Test configuration |

## ⚙️ Configuration

### Environment Variables

See `.env.example` for all available options.

**Key Settings:**

- `ARTICLES_PER_DAY=3` - Number of articles to generate daily
- `CRON_SCHEDULE=0 9 * * *` - When to run (default: 9 AM daily)
- `DELAY_BETWEEN_ARTICLES=30000` - Delay between articles (milliseconds)

### Keywords

Edit `utils/keywords.js` to add/modify target keywords. Currently includes 40+ Malaysian loan-related keywords.

## 🖥️ EC2 Deployment

### One-Time Setup

```bash
# 1. SSH into your EC2 instance
ssh ubuntu@your-ec2-ip

# 2. Navigate to backend directory
cd /home/ubuntu/finance_backend

# 3. Install dependencies
cd seo-automation
npm install

# 4. Create .env file
nano .env
# (paste your credentials)

# 5. Test the system
node index.js test

# 6. Install PM2 globally (if not installed)
sudo npm install -g pm2

# 7. Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Monitoring

```bash
# View logs
pm2 logs seo-automation

# Check status
pm2 status

# Restart
pm2 restart seo-automation

# Stop
pm2 stop seo-automation
```

## 📊 Monitoring & Logs

- **Application Logs**: `logs/seo-automation-YYYY-MM-DD.log`
- **PM2 Logs**: `pm2 logs seo-automation`
- **Generated Articles**: `output/*.json`
- **Used Keywords**: `data/used-keywords.json`

## 🔧 Troubleshooting

### "GEMINI_API_KEY is required"
- Make sure you've created `.env` file
- Verify the API key is correct
- Check file is in the correct directory

### "WordPress credentials not configured"
- Add `WP_USER` and `WP_APP_PASSWORD` to `.env`
- Verify WordPress REST API is accessible
- Test with: `curl https://eplatformcredit.com/wp-json/wp/v2/posts`

### "Failed to generate article"
- Check Gemini API key is valid
- Verify internet connection
- Check API quota limits

### Scheduler not running
- Verify `SCHEDULER_ENABLED=true` in `.env`
- Check cron schedule format
- View PM2 logs for errors

## 🎯 Best Practices

1. **Start with Manual Runs**
   ```bash
   node index.js generate "test keyword"
   ```

2. **Monitor Initial Days**
   ```bash
   pm2 logs seo-automation --lines 100
   ```

3. **Check Keyword Stats**
   ```bash
   node index.js stats
   ```

4. **Review Generated Content**
   - Check `output/` folder
   - Verify quality before scaling

5. **Backup Configuration**
   ```bash
   cp .env .env.backup
   ```

## 📝 Notes

- Default schedule: **9 AM daily** (server timezone)
- Articles are saved as JSON before publishing
- Keywords are tracked to avoid duplication
- System auto-resets keywords when all are used
- WordPress must have REST API enabled
- Google Indexing requires Service Account setup

## 🤝 Support

For issues or questions:
1. Check logs: `pm2 logs seo-automation`
2. Verify configuration: `node index.js test`
3. Review `.env` file settings

## 📄 License

MIT License - Finance Platform Team
