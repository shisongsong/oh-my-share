-- Tie a social-login OAuth state to a pending MCP authorization request so the
-- callback can hand off to the consent screen instead of logging in and losing
-- the pending client request.
ALTER TABLE oauth_states ADD COLUMN auth_id TEXT;
