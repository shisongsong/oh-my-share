-- Track who created an idempotent upload so a reused key cannot hand the
-- original edit token to a different network or account.
ALTER TABLE files ADD COLUMN idempotency_scope TEXT;
