# Oh My Share - Daily Monitoring

Website traffic monitoring and optimization system for openanthropic.com.

## Quick Start

```bash
# 1. Setup
cd monitor
./setup.sh

# 2. Configure API token
# Edit .env with your Cloudflare API token

# 3. Test
./daily_monitor.sh

# 4. Install cron (daily at 9 AM)
./install_cron.sh
```

## Files

| File | Purpose |
|------|---------|
| `daily_monitor.sh` | Main monitoring script (runs daily) |
| `health_check.sh` | Quick health check (run manually) |
| `setup.sh` | Initial setup |
| `install_cron.sh` | Install cron job |
| `.env.example` | Environment template |
| `data/` | Raw analytics data |
| `reports/` | Generated reports |
| `rules/` | Optimization rules |

## Getting Cloudflare API Token

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Click "Create Token"
3. Add permissions:
   - `Zone` → `Analytics` → `Read`
   - `Zone` → `Zone` → `Read`
4. Zone Resources → Include → Specific zone → `openanthropic.com`
5. Copy token to `.env`

## Cron Schedule

Default: Daily at 9:00 AM

```bash
# View installed cron
crontab -l

# Remove cron
crontab -l | grep -v 'daily_monitor' | crontab -

# Run manually
./monitor/daily_monitor.sh
```

## Reports

Reports are generated in `reports/report_YYYY-MM-DD.md` and include:
- Visitor counts (today, vs yesterday, vs last week)
- Page views and requests
- Top pages and referrers
- SEO checklist
- Optimization suggestions

## Health Check

Run `./monitor/health_check.sh` for instant status:
- Response time
- HTTP status codes
- Security headers
- SEO meta tags
- Agent discovery endpoints
- Extension availability
