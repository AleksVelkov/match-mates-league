-- Better Auth tables
CREATE TABLE IF NOT EXISTS `user` (
  `id` TEXT PRIMARY KEY,
  `name` TEXT NOT NULL,
  `email` TEXT NOT NULL UNIQUE,
  `email_verified` INTEGER NOT NULL DEFAULT 0,
  `image` TEXT,
  `created_at` INTEGER NOT NULL,
  `updated_at` INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS `session` (
  `id` TEXT PRIMARY KEY,
  `expires_at` INTEGER NOT NULL,
  `token` TEXT NOT NULL UNIQUE,
  `created_at` INTEGER NOT NULL,
  `updated_at` INTEGER NOT NULL,
  `ip_address` TEXT,
  `user_agent` TEXT,
  `user_id` TEXT NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `account` (
  `id` TEXT PRIMARY KEY,
  `account_id` TEXT NOT NULL,
  `provider_id` TEXT NOT NULL,
  `user_id` TEXT NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `access_token` TEXT,
  `refresh_token` TEXT,
  `id_token` TEXT,
  `access_token_expires_at` INTEGER,
  `refresh_token_expires_at` INTEGER,
  `scope` TEXT,
  `password` TEXT,
  `created_at` INTEGER NOT NULL,
  `updated_at` INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS `verification` (
  `id` TEXT PRIMARY KEY,
  `identifier` TEXT NOT NULL,
  `value` TEXT NOT NULL,
  `expires_at` INTEGER NOT NULL,
  `created_at` INTEGER,
  `updated_at` INTEGER
);

-- App tables
CREATE TABLE IF NOT EXISTS `groups` (
  `id` TEXT PRIMARY KEY,
  `name` TEXT NOT NULL,
  `emoji` TEXT NOT NULL DEFAULT '⚽',
  `description` TEXT,
  `competition` TEXT NOT NULL DEFAULT 'Premier League',
  `invite_code` TEXT NOT NULL UNIQUE,
  `owner_id` TEXT NOT NULL REFERENCES `user`(`id`),
  `round` INTEGER NOT NULL DEFAULT 1,
  `created_at` INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS `group_members` (
  `group_id` TEXT NOT NULL REFERENCES `groups`(`id`) ON DELETE CASCADE,
  `user_id` TEXT NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `joined_at` INTEGER NOT NULL,
  PRIMARY KEY (`group_id`, `user_id`)
);

CREATE TABLE IF NOT EXISTS `fixtures` (
  `id` TEXT PRIMARY KEY,
  `group_id` TEXT NOT NULL REFERENCES `groups`(`id`) ON DELETE CASCADE,
  `competition` TEXT NOT NULL,
  `round` INTEGER NOT NULL,
  `home` TEXT NOT NULL,
  `home_short` TEXT NOT NULL,
  `away` TEXT NOT NULL,
  `away_short` TEXT NOT NULL,
  `kickoff_at` INTEGER NOT NULL,
  `status` TEXT NOT NULL DEFAULT 'upcoming',
  `result_home` INTEGER,
  `result_away` INTEGER,
  `external_id` TEXT,
  `created_at` INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS `predictions` (
  `id` TEXT PRIMARY KEY,
  `fixture_id` TEXT NOT NULL REFERENCES `fixtures`(`id`) ON DELETE CASCADE,
  `user_id` TEXT NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `score_home` INTEGER,
  `score_away` INTEGER,
  `is_joker` INTEGER NOT NULL DEFAULT 0,
  `points_earned` INTEGER,
  `submitted_at` INTEGER NOT NULL,
  UNIQUE (`fixture_id`, `user_id`)
);

CREATE TABLE IF NOT EXISTS `achievements` (
  `id` TEXT PRIMARY KEY,
  `user_id` TEXT NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `achievement_key` TEXT NOT NULL,
  `unlocked_at` INTEGER NOT NULL,
  UNIQUE (`user_id`, `achievement_key`)
);

-- Super admin config
CREATE TABLE IF NOT EXISTS `config` (
  `key` TEXT PRIMARY KEY,
  `value` TEXT NOT NULL
);
INSERT OR IGNORE INTO `config` (`key`, `value`) VALUES (
  'enabled_competitions',
  '["Premier League","Champions League","Europa League","La Liga","Bundesliga","Serie A","Ligue 1","Eredivisie","Primeira Liga","Championship"]'
);

-- Indexes
CREATE INDEX IF NOT EXISTS `idx_group_members_user` ON `group_members`(`user_id`);
CREATE INDEX IF NOT EXISTS `idx_fixtures_group_round` ON `fixtures`(`group_id`, `round`);
CREATE INDEX IF NOT EXISTS `idx_predictions_fixture` ON `predictions`(`fixture_id`);
CREATE INDEX IF NOT EXISTS `idx_predictions_user` ON `predictions`(`user_id`);
CREATE INDEX IF NOT EXISTS `idx_achievements_user` ON `achievements`(`user_id`);
