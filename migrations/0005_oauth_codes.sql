-- OAuth authorization codes table
CREATE TABLE IF NOT EXISTS oauth_codes (
  code TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  redirect_uri TEXT NOT NULL,
  code_challenge TEXT,
  code_challenge_method TEXT DEFAULT 'S256',
  scope TEXT DEFAULT 'upload manage read',
  state TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- Index for cleanup
CREATE INDEX IF NOT EXISTS idx_oauth_codes_expires ON oauth_codes(expires_at);
