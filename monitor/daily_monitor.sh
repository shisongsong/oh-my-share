#!/bin/bash
# Oh My Share - Daily Monitoring Script
# Runs daily via cron to analyze website traffic

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$SCRIPT_DIR/data"
REPORTS_DIR="$SCRIPT_DIR/reports"
RULES_DIR="$SCRIPT_DIR/rules"
ENV_FILE="$SCRIPT_DIR/.env"

# Load environment
if [ -f "$ENV_FILE" ]; then
  source "$ENV_FILE"
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()     { echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}[$(date '+%H:%M:%S')] ✓${NC} $1"; }
error()   { echo -e "${RED}[$(date '+%H:%M:%S')] ✗${NC} $1"; }
warning() { echo -e "${YELLOW}[$(date '+%H:%M:%S')] ⚠${NC} $1"; }

# GraphQL query helper
gql_query() {
  local query="$1"
  curl -s -X POST \
    -H "Authorization: Bearer $CF_API_TOKEN" \
    -H "Content-Type: application/json" \
    "https://api.cloudflare.com/client/v4/graphql" \
    -d "$(jq -n --arg q "$query" '{query: $q}')"
}

# Check dependencies
check_deps() {
  for cmd in curl jq; do
    if ! command -v $cmd &> /dev/null; then
      error "Missing: $cmd (brew install $cmd)"
      exit 1
    fi
  done
}

# Check API token
check_token() {
  if [ -z "$CF_API_TOKEN" ]; then
    error "CF_API_TOKEN not set in $ENV_FILE"
    exit 1
  fi
  
  if [ -z "$CF_ZONE_ID" ]; then
    log "Detecting Zone ID..."
    local resp
    resp=$(curl -s -H "Authorization: Bearer $CF_API_TOKEN" \
      "https://api.cloudflare.com/client/v4/zones?name=openanthropic.com")
    
    if echo "$resp" | jq -e '.success' > /dev/null 2>&1; then
      CF_ZONE_ID=$(echo "$resp" | jq -r '.result[0].id')
      echo "CF_ZONE_ID=$CF_ZONE_ID" >> "$ENV_FILE"
      success "Zone ID: $CF_ZONE_ID"
    else
      error "Failed to get zone ID"
      exit 1
    fi
  fi
}

# Fetch analytics
fetch_analytics() {
  local date=$1
  log "Fetching analytics for $date..."
  
  local query
  query=$(cat <<EOF
{
  viewer {
    zones(filter: {zoneTag: "$CF_ZONE_ID"}) {
      httpRequests1dGroups(
        filter: {date_geq: "$date", date_leq: "$date"}
        limit: 1
      ) {
        dimensions { date }
        sum {
          requests
          pageViews
        }
        uniq { uniques }
      }
    }
  }
}
EOF
)
  
  local resp
  resp=$(gql_query "$query")
  
  if echo "$resp" | jq -e '.data.viewer.zones[0].httpRequests1dGroups[0]' > /dev/null 2>&1; then
    echo "$resp" > "$DATA_DIR/analytics_${date}.json"
    
    local requests views visitors
    requests=$(echo "$resp" | jq -r '.data.viewer.zones[0].httpRequests1dGroups[0].sum.requests // 0')
    views=$(echo "$resp" | jq -r '.data.viewer.zones[0].httpRequests1dGroups[0].sum.pageViews // 0')
    visitors=$(echo "$resp" | jq -r '.data.viewer.zones[0].httpRequests1dGroups[0].uniq.uniques // 0')
    
    success "Analytics saved"
    log "  Requests: $requests | PageViews: $views | Visitors: $visitors"
    
    echo "{\"date\":\"$date\",\"requests\":$requests,\"pageViews\":$views,\"visitors\":$visitors}" >> "$DATA_DIR/daily_summary.jsonl"
  else
    error "Failed to fetch analytics"
    echo "$resp" | jq '.errors // empty' 2>/dev/null
    return 1
  fi
}

# Fetch top pages
fetch_top_pages() {
  local date=$1
  log "Fetching top pages..."
  
  local query
  query=$(cat <<EOF
{
  viewer {
    zones(filter: {zoneTag: "$CF_ZONE_ID"}) {
      httpRequestsAdaptiveGroups(
        filter: {datetime_geq: "${date}T00:00:00Z", datetime_leq: "${date}T23:59:59Z", requestSource: "eyeball"}
        limit: 20
      ) {
        count
        dimensions { clientRequestPath }
      }
    }
  }
}
EOF
)
  
  local resp
  resp=$(gql_query "$query")
  
  if echo "$resp" | jq -e '.data.viewer.zones[0].httpRequestsAdaptiveGroups[0]' > /dev/null 2>&1; then
    echo "$resp" > "$DATA_DIR/top_pages_${date}.json"
    success "Top pages saved"
  else
    warning "Could not fetch top pages"
  fi
}

# Fetch referrers (from Worker's site_visits table via D1)
fetch_referrers() {
  local date=$1
  log "Fetching referrers from D1..."
  
  local out
  out=$(cd "$PROJECT_DIR" && npx wrangler d1 execute oh-my-share-db --remote --json \
    --command "SELECT referer, SUM(count) AS count FROM site_visits WHERE day='$date' AND referer != '' GROUP BY referer ORDER BY count DESC LIMIT 20" 2>/dev/null)
  
  if echo "$out" | jq -e '.[0].results' > /dev/null 2>&1; then
    echo "$out" | jq '.[0].results' > "$DATA_DIR/referrers_${date}.json"
    success "Referrers saved"
  else
    warning "Could not fetch referrers"
  fi
  
  out=$(cd "$PROJECT_DIR" && npx wrangler d1 execute oh-my-share-db --remote --json \
    --command "SELECT path, SUM(count) AS count FROM site_visits WHERE day='$date' GROUP BY path ORDER BY count DESC LIMIT 20" 2>/dev/null)
  
  if echo "$out" | jq -e '.[0].results' > /dev/null 2>&1; then
    echo "$out" | jq '.[0].results' > "$DATA_DIR/site_pages_${date}.json"
    success "Site page views saved"
  fi
}

# Calculate trends
calculate_trends() {
  local today=$1
  local yesterday=$(date -v-1d -j -f "%Y-%m-%d" "$today" "+%Y-%m-%d" 2>/dev/null || date -d "$today - 1 day" "+%Y-%m-%d")
  local last_week=$(date -v-7d -j -f "%Y-%m-%d" "$today" "+%Y-%m-%d" 2>/dev/null || date -d "$today - 7 days" "+%Y-%m-%d")
  
  local report="$REPORTS_DIR/report_${today}.md"
  
  cat > "$report" << EOF
# Daily Report: $today

## Summary
EOF

  if [ -f "$DATA_DIR/daily_summary.jsonl" ]; then
    local today_data yesterday_data last_week_data
    today_data=$(grep "\"date\":\"$today\"" "$DATA_DIR/daily_summary.jsonl" | tail -1)
    yesterday_data=$(grep "\"date\":\"$yesterday\"" "$DATA_DIR/daily_summary.jsonl" | tail -1)
    last_week_data=$(grep "\"date\":\"$last_week\"" "$DATA_DIR/daily_summary.jsonl" | tail -1)
    
    if [ -n "$today_data" ]; then
      local visitors pageViews requests
      visitors=$(echo "$today_data" | jq -r '.visitors')
      pageViews=$(echo "$today_data" | jq -r '.pageViews')
      requests=$(echo "$today_data" | jq -r '.requests')
      
      echo "- **Visitors:** $visitors" >> "$report"
      echo "- **Page Views:** $pageViews" >> "$report"
      echo "- **Requests:** $requests" >> "$report"
      echo "" >> "$report"
      
      if [ -n "$yesterday_data" ] && [ "$yesterday_data" != "0" ]; then
        local y_visitors
        y_visitors=$(echo "$yesterday_data" | jq -r '.visitors')
        if [ "$y_visitors" -gt 0 ] 2>/dev/null; then
          local change
          change=$(echo "scale=1; (($visitors - $y_visitors) * 100 / $y_visitors)" | bc 2>/dev/null || echo "0")
          echo "## vs Yesterday" >> "$report"
          echo "- Visitors: $y_visitors → $visitors (${change}%)" >> "$report"
          echo "" >> "$report"
        fi
      fi
      
      if [ -n "$last_week_data" ]; then
        local lw_visitors
        lw_visitors=$(echo "$last_week_data" | jq -r '.visitors')
        if [ "$lw_visitors" -gt 0 ] 2>/dev/null; then
          local week_change
          week_change=$(echo "scale=1; (($visitors - $lw_visitors) * 100 / $lw_visitors)" | bc 2>/dev/null || echo "0")
          echo "## vs Last Week" >> "$report"
          echo "- Visitors: $lw_visitors → $visitors (${week_change}%)" >> "$report"
          echo "" >> "$report"
        fi
      fi
    fi
  fi
  
  # Pending abuse reports (files reported by users, awaiting review)
  local reports_out
  reports_out=$(cd "$PROJECT_DIR" && npx wrangler d1 execute oh-my-share-db --remote --json \
    --command "SELECT id, report_count, reported_at, title FROM files WHERE reported_at IS NOT NULL ORDER BY reported_at DESC LIMIT 20" 2>/dev/null)
  if echo "$reports_out" | jq -e '.[0].results' > /dev/null 2>&1; then
    local pending_count
    pending_count=$(echo "$reports_out" | jq '.[0].results | length')
    echo "## Content Reports" >> "$report"
    if [ "$pending_count" -gt 0 ]; then
      echo "- Pending review: $pending_count" >> "$report"
      echo "$reports_out" | jq -r '.[0].results[] | "- \(.id)  x\(.report_count)  \(.title // "untitled")"' >> "$report"
    else
      echo "- None pending" >> "$report"
    fi
    echo "" >> "$report"
  fi
  
  success "Report generated: $report"
}

# Generate optimization suggestions
generate_optimizations() {
  local date=$1
  local report="$REPORTS_DIR/report_${date}.md"
  
  log "Generating optimization suggestions..."
  echo "## Data" >> "$report"
  echo "" >> "$report"
  
  if [ -f "$DATA_DIR/top_pages_${date}.json" ]; then
    echo "### Top Pages" >> "$report"
    jq -r '.data.viewer.zones[0].httpRequestsAdaptiveGroups | sort_by(-.count) | .[] | "- \(.dimensions.clientRequestPath): \(.count) requests"' \
      "$DATA_DIR/top_pages_${date}.json" 2>/dev/null | head -10 >> "$report"
    echo "" >> "$report"
  fi
  
  if [ -f "$DATA_DIR/site_pages_${date}.json" ]; then
    echo "### Page Views (bot-filtered)" >> "$report"
    jq -r '.[] | "- \(.path): \(.count) views"' \
      "$DATA_DIR/site_pages_${date}.json" 2>/dev/null | head -15 >> "$report"
    echo "" >> "$report"
  fi
  
  if [ -f "$DATA_DIR/referrers_${date}.json" ]; then
    echo "### Top Referrers" >> "$report"
    jq -r '.[] | select(.referer != "") | "- \(.referer): \(.count) visits"' \
      "$DATA_DIR/referrers_${date}.json" 2>/dev/null | head -10 >> "$report"
    echo "" >> "$report"
  fi
  
  echo "## SEO Checklist" >> "$report"
  echo "" >> "$report"
  
  local homepage
  homepage=$(curl -s "https://openanthropic.com" 2>/dev/null | head -200)
  
  if echo "$homepage" | grep -q '<meta name="description"'; then
    echo "- [x] Meta description" >> "$report"
  else
    echo "- [ ] **Add meta description**" >> "$report"
  fi
  
  if echo "$homepage" | grep -q '<meta property="og:'; then
    echo "- [x] Open Graph tags" >> "$report"
  else
    echo "- [ ] **Add Open Graph tags**" >> "$report"
  fi
  
  echo "" >> "$report"
  success "Optimizations added"
}

# Main
# Submit URLs to IndexNow (Bing, Yandex, Naver, Seznam)
indexnow_submit() {
  log "Submitting sitemap URLs to IndexNow..."
  
  local key="dab46c9c750b7c083d5723b8ed9653a5"
  local urls
  urls=$(curl -s "https://openanthropic.com/sitemap.xml" | grep -o "<loc>[^<]*</loc>" | sed 's/<loc>//;s/<\/loc>//' | jq -R . | jq -s .)
  
  if [ "$(echo "$urls" | jq 'length')" -lt 1 ]; then
    warning "No URLs found in sitemap"
    return
  fi
  
  local payload
  payload=$(jq -n --arg host "openanthropic.com" --arg key "$key" \
    --arg keyLocation "https://openanthropic.com/${key}.txt" \
    --argjson urlList "$urls" \
    '{host: $host, key: $key, keyLocation: $keyLocation, urlList: $urlList}')
  
  local code
  code=$(curl -s -X POST "https://api.indexnow.org/indexnow" \
    -H "Content-Type: application/json; charset=utf-8" \
    -d "$payload" -o /dev/null -w "%{http_code}")
  
  if [ "$code" = "200" ] || [ "$code" = "202" ]; then
    success "IndexNow accepted ($code) - $(echo "$urls" | jq 'length') URLs"
  else
    warning "IndexNow returned $code"
  fi
}

main() {
  local today=$(date "+%Y-%m-%d")
  
  log "Starting daily monitoring for $today"
  echo ""
  
  check_deps
  check_token
  echo ""
  
  fetch_analytics "$today"
  fetch_top_pages "$today"
  fetch_referrers "$today"
  echo ""
  
  calculate_trends "$today"
  generate_optimizations "$today"
  indexnow_submit "$today"
  
  echo ""
  success "Done! Report: reports/report_${today}.md"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  main "$@"
fi
