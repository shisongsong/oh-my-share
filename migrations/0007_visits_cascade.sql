-- 重建 visits 表：外键加 ON DELETE CASCADE
-- 修复：删除有访问记录的文件时 FOREIGN KEY constraint failed → 503
CREATE TABLE visits_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_id TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  user_agent TEXT,
  country TEXT,
  visited_at INTEGER NOT NULL,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE CASCADE
);
INSERT INTO visits_new (id, file_id, ip_hash, user_agent, country, visited_at)
  SELECT id, file_id, ip_hash, user_agent, country, visited_at FROM visits;
DROP TABLE visits;
ALTER TABLE visits_new RENAME TO visits;
CREATE INDEX IF NOT EXISTS idx_visits_file_id ON visits(file_id);
CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON visits(visited_at);
