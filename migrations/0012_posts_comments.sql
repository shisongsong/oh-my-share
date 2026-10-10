-- Community v2: discussion posts and comments (on posts and published works).
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  work_id TEXT,
  created_at INTEGER NOT NULL,
  comment_count INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);

CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  parent_id TEXT,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS comments_target_idx ON comments(target_type, target_id, created_at);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON comments(user_id, created_at DESC);
