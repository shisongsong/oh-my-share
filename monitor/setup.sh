#!/bin/bash
# Setup script for daily monitoring

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Setting up Oh My Share daily monitoring..."
echo ""

# Create .env from template if it doesn't exist
if [ ! -f "$SCRIPT_DIR/.env" ]; then
  cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
  echo "Created .env from template"
  echo "Please edit $SCRIPT_DIR/.env with your API token"
  echo ""
fi

# Make scripts executable
chmod +x "$SCRIPT_DIR/daily_monitor.sh"
chmod +x "$SCRIPT_DIR/setup.sh"

# Check dependencies
echo "Checking dependencies..."
for cmd in curl jq bc; do
  if command -v $cmd &> /dev/null; then
    echo "  ✓ $cmd"
  else
    echo "  ✗ $cmd (install with: brew install $cmd)"
  fi
done

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit $SCRIPT_DIR/.env with your Cloudflare API token"
echo "  2. Test: $SCRIPT_DIR/daily_monitor.sh"
echo "  3. Add to cron: $SCRIPT_DIR/install_cron.sh"
