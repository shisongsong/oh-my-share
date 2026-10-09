-- 作品广场：发布状态
ALTER TABLE files ADD COLUMN published_at INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_files_published ON files(published_at DESC) WHERE published_at > 0;
