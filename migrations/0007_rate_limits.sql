-- Fixed-window rate limiting for auth + join endpoints.
-- key = "<action>:<scope>" (e.g. "signin:email:a@b.com"), reset_at = epoch ms.
CREATE TABLE IF NOT EXISTS rate_limits (
  key      TEXT PRIMARY KEY,
  count    INTEGER NOT NULL DEFAULT 0,
  reset_at INTEGER NOT NULL
);
