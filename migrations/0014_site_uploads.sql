-- Static-site shares keep their files in R2 under site/<id>/..., while the D1
-- row stores only metadata. Existing rows are ordinary single files.
ALTER TABLE files ADD COLUMN kind TEXT NOT NULL DEFAULT 'file';
ALTER TABLE files ADD COLUMN entry_path TEXT;
ALTER TABLE files ADD COLUMN file_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE files ADD COLUMN total_size INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_files_kind ON files(kind);
