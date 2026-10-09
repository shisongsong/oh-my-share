-- Abuse reporting + remix provenance
ALTER TABLE files ADD COLUMN reported_at INTEGER;
ALTER TABLE files ADD COLUMN report_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE files ADD COLUMN remixed_from TEXT;

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id TEXT NOT NULL,
  reason TEXT,
  details TEXT,
  reporter_hash TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_reports_file ON reports(file_id);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at);
