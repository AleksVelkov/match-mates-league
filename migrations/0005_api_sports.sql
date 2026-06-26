-- Add API-Sports team ID to teams table for player data enrichment
ALTER TABLE teams ADD COLUMN api_sports_id INTEGER;
ALTER TABLE teams ADD COLUMN players_synced_at INTEGER;
