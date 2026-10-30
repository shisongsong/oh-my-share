-- Attribution for agent traffic and retry-safe MCP uploads.
ALTER TABLE files ADD COLUMN source TEXT;
ALTER TABLE files ADD COLUMN user_agent TEXT;
ALTER TABLE files ADD COLUMN idempotency_key TEXT;

-- MCP was the only path that could store a null filename. Classify those rows.
UPDATE files SET source = 'mcp' WHERE source IS NULL AND filename IS NULL;

CREATE INDEX IF NOT EXISTS idx_files_source_created ON files(source, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_files_idempotency ON files(idempotency_key);

CREATE TABLE IF NOT EXISTS mcp_calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool TEXT NOT NULL,
  status TEXT NOT NULL,
  auth_source TEXT,
  client TEXT,
  duration_ms INTEGER,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_mcp_calls_created ON mcp_calls(created_at);
