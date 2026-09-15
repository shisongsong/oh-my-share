-- 扩展 files 表：添加密码保护、有效期、编辑密钥
ALTER TABLE files ADD COLUMN edit_token TEXT;
ALTER TABLE files ADD COLUMN password_hash TEXT;
ALTER TABLE files ADD COLUMN expires_at INTEGER;
ALTER TABLE files ADD COLUMN updated_at INTEGER DEFAULT 0;

-- 新增 visits 表：访问统计
CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  user_agent TEXT,
  country TEXT,
  visited_at INTEGER NOT NULL,
  FOREIGN KEY (file_id) REFERENCES files(id)
);
CREATE INDEX IF NOT EXISTS idx_visits_file_id ON visits(file_id);
CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON visits(visited_at);
