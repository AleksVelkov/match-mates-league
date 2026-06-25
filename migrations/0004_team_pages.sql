-- Team IDs on fixtures for linking to team pages
ALTER TABLE fixtures ADD COLUMN home_team_id TEXT;
ALTER TABLE fixtures ADD COLUMN away_team_id TEXT;

-- Team profiles synced from football-data.org by super admin.
-- One row per team regardless of competition; squad stored as JSON.
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,           -- football-data.org team ID as string
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  tla TEXT NOT NULL,
  crest_url TEXT,
  founded INTEGER,
  venue TEXT,
  club_colors TEXT,
  website TEXT,
  address TEXT,
  coach_name TEXT,
  coach_nationality TEXT,
  squad_json TEXT,               -- JSON array of squad members
  synced_at INTEGER NOT NULL
);

-- Per-competition league standing for each team.
CREATE TABLE IF NOT EXISTS team_standings (
  team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  competition TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  played INTEGER NOT NULL DEFAULT 0,
  won INTEGER NOT NULL DEFAULT 0,
  drawn INTEGER NOT NULL DEFAULT 0,
  lost INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  goal_difference INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  form TEXT,
  synced_at INTEGER NOT NULL,
  PRIMARY KEY (team_id, competition)
);
