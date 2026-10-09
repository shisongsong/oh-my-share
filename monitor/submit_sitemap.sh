#!/bin/bash
# Submit sitemap to search engines
# Run after deploying changes

SITEMAP="https://openanthropic.com/sitemap.xml"
SITE="https://openanthropic.com"

echo "=== Submitting sitemap to search engines ==="
echo ""

# Google (via ping)
echo "1. Google Sitemap Ping..."
curl -s "https://www.google.com/ping?sitemap=$SITEMAP" > /dev/null 2>&1 && echo "   ✓ Submitted" || echo "   ⚠ May need Search Console"

# Bing (via ping)
echo "2. Bing Sitemap Ping..."
curl -s "https://www.bing.com/ping?sitemap=$SITEMAP" > /dev/null 2>&1 && echo "   ✓ Submitted" || echo "   ⚠ Failed"

# Yandex (via ping)
echo "3. Yandex Sitemap Ping..."
curl -s "https://webmaster.yandex.com/ping?sitemap=$SITEMAP" > /dev/null 2>&1 && echo "   ✓ Submitted" || echo "   ⚠ Failed"

echo ""
echo "=== Manual Steps Required ==="
echo ""
echo "1. Google Search Console:"
echo "   https://search.google.com/search-console"
echo "   → Add property: $SITE"
echo "   → Submit sitemap: $SITEMAP"
echo ""
echo "2. Bing Webmaster Tools:"
echo "   https://www.bing.com/webmasters"
echo "   → Add site: $SITE"
echo "   → Submit sitemap: $SITEMAP"
echo ""
echo "3. Verify ownership (already have meta tag):"
echo "   google-site-verification: DBQv1hLP8zAfNxe33rUZVVM4ilMDoNrcpvwtJmoB03c"
echo ""
echo "=== Done ==="
