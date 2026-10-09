#!/bin/bash
# Quick health check for openanthropic.com
# Run manually or as part of monitoring

set -e

URL="https://openanthropic.com"

echo "=== Oh My Share Health Check ==="
echo "Time: $(date)"
echo ""

# Check response time
echo "1. Response Time"
time_total=$(curl -s -o /dev/null -w "%{time_total}" "$URL" 2>/dev/null || echo "0")
time_total_ms=$(echo "$time_total * 1000" | bc 2>/dev/null || echo "?")
echo "   Homepage: ${time_total_ms}ms"
if (( $(echo "$time_total > 1" | bc -l 2>/dev/null || echo 0) )); then
  echo "   ⚠ Warning: Slow response (>1s)"
fi
echo ""

# Check status codes
echo "2. Status Codes"
for path in "/" "/view/test" "/auth.md" "/.well-known/agent-card.json"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "${URL}${path}" 2>/dev/null || echo "000")
  if [[ "$status" =~ ^2 ]]; then
    echo "   ✓ $path: $status"
  elif [[ "$status" =~ ^3 ]]; then
    echo "   → $path: $status (redirect)"
  elif [[ "$status" == "404" && "$path" == "/view/test" ]]; then
    echo "   ✓ $path: 404 (expected - test file)"
  else
    echo "   ✗ $path: $status"
  fi
done

# Check POST endpoint
post_status=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{}' "${URL}/api/upload" 2>/dev/null || echo "000")
if [[ "$post_status" =~ ^4 ]]; then
  echo "   ✓ /api/upload (POST): $post_status (expected - invalid payload)"
elif [[ "$post_status" =~ ^2 ]]; then
  echo "   ✓ /api/upload (POST): $post_status"
else
  echo "   ✗ /api/upload (POST): $post_status"
fi
echo ""

# Check security headers
echo "3. Security Headers"
headers=$(curl -sI "$URL" 2>/dev/null)
for header in "strict-transport-security" "x-content-type-options" "x-frame-options" "content-security-policy"; do
  if echo "$headers" | grep -qi "$header"; then
    echo "   ✓ $header"
  else
    echo "   ✗ $header missing"
  fi
done
echo ""

# Check SEO meta tags
echo "4. SEO Meta Tags"
homepage=$(curl -s "$URL" 2>/dev/null)
for tag in 'meta name="description"' 'meta property="og:' 'meta name="robots"' 'link rel="canonical"'; do
  if echo "$homepage" | grep -qi "$tag"; then
    echo "   ✓ $tag"
  else
    echo "   ✗ $tag missing"
  fi
done
echo ""

# Check well-known endpoints
echo "5. Agent Discovery Endpoints"
for endpoint in "/.well-known/agent-card.json" "/.well-known/oauth-protected-resource" "/.well-known/mcp/server-card.json" "/.well-known/api-catalog"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "${URL}${endpoint}" 2>/dev/null || echo "000")
  if [[ "$status" == "200" ]]; then
    echo "   ✓ $endpoint"
  else
    echo "   ✗ $endpoint: $status"
  fi
done
echo ""

# Check extension download
echo "6. Extension"
ext_status=$(curl -s -o /dev/null -w "%{http_code}" "${URL}/extension.zip" 2>/dev/null || echo "000")
if [[ "$ext_status" == "200" ]]; then
  echo "   ✓ /extension.zip available"
else
  echo "   ✗ /extension.zip: $ext_status"
fi
echo ""

echo "=== Check Complete ==="
