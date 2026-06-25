-- Extended user profile (country, avatar stored separately from Better Auth user table)
CREATE TABLE IF NOT EXISTS `user_profiles` (
  `user_id`      TEXT PRIMARY KEY REFERENCES `user`(`id`) ON DELETE CASCADE,
  `country`      TEXT,
  `country_code` TEXT,
  `created_at`   INTEGER NOT NULL,
  `updated_at`   INTEGER NOT NULL
);

-- Seasons defined by the super admin (date ranges for stat aggregation)
CREATE TABLE IF NOT EXISTS `seasons` (
  `id`         TEXT PRIMARY KEY,
  `name`       TEXT NOT NULL,
  `start_date` INTEGER NOT NULL,
  `end_date`   INTEGER NOT NULL,
  `created_at` INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS `idx_seasons_dates` ON `seasons`(`start_date`, `end_date`);
