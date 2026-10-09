#!/bin/bash
# Install cron job for daily monitoring

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MONITOR_SCRIPT="$SCRIPT_DIR/daily_monitor.sh"

echo "Installing daily monitoring cron job..."
echo ""

# Check if script exists
if [ ! -f "$MONITOR_SCRIPT" ]; then
  echo "Error: $MONITOR_SCRIPT not found"
  exit 1
fi

# Make executable
chmod +x "$MONITOR_SCRIPT"

# Cron schedule: every day at 9:00 AM
CRON_SCHEDULE="0 9 * * *"
CRON_COMMAND="$MONITOR_SCRIPT >> $SCRIPT_DIR/cron.log 2>&1"

# Check if already installed
if crontab -l 2>/dev/null | grep -q "$MONITOR_SCRIPT"; then
  echo "Cron job already installed:"
  echo "  $(crontab -l | grep "$MONITOR_SCRIPT")"
  echo ""
  read -p "Replace? (y/n): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
  fi
  # Remove existing
  crontab -l | grep -v "$MONITOR_SCRIPT" | crontab -
fi

# Install new cron job
(crontab -l 2>/dev/null; echo "$CRON_SCHEDULE $CRON_COMMAND") | crontab -

echo "✓ Cron job installed!"
echo ""
echo "Schedule: Daily at 9:00 AM"
echo "Command: $CRON_COMMAND"
echo "Log: $SCRIPT_DIR/cron.log"
echo ""
echo "To view: crontab -l"
echo "To remove: crontab -l | grep -v '$MONITOR_SCRIPT' | crontab -"
echo ""
echo "Run now to test: $MONITOR_SCRIPT"
