-- Community module: profiles (nickname/bio) and likes on published works.
ALTER TABLE users ADD COLUMN nickname TEXT;
ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS likes (
  user_id TEXT NOT NULL,
  file_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, file_id)
);
CREATE INDEX IF NOT EXISTS likes_file_id_idx ON likes(file_id);
