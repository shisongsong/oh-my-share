-- OAuth states table for CSRF protection
CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);
