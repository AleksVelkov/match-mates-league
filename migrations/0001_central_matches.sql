-- Move matches to a central, league-scoped model managed by the super admin,
-- and scope predictions per group. Existing fixtures/predictions are discarded
-- (dev data) — the super admin re-syncs matches centrally after this migration.

DROP INDEX IF EXISTS `idx_fixtures_group_round`;
DROP TABLE IF EXISTS `predictions`;
DROP TABLE IF EXISTS `fixtures`;

-- Central matches, keyed by competition (no group_id).
CREATE TABLE `fixtures` (
  `id` TEXT PRIMARY KEY,
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
  `created_at` INTEGER NOT NULL,
  UNIQUE (`competition`, `external_id`)
);

-- Predictions scoped per group so the same user can predict the same central
-- fixture differently in different groups.
CREATE TABLE `predictions` (
  `id` TEXT PRIMARY KEY,
  `group_id` TEXT NOT NULL REFERENCES `groups`(`id`) ON DELETE CASCADE,
  `fixture_id` TEXT NOT NULL REFERENCES `fixtures`(`id`) ON DELETE CASCADE,
  `user_id` TEXT NOT NULL REFERENCES `user`(`id`) ON DELETE CASCADE,
  `score_home` INTEGER,
  `score_away` INTEGER,
  `is_joker` INTEGER NOT NULL DEFAULT 0,
  `points_earned` INTEGER,
  `submitted_at` INTEGER NOT NULL,
  UNIQUE (`group_id`, `fixture_id`, `user_id`)
);

CREATE INDEX IF NOT EXISTS `idx_fixtures_comp_round` ON `fixtures`(`competition`, `round`);
CREATE INDEX IF NOT EXISTS `idx_predictions_fixture` ON `predictions`(`fixture_id`);
CREATE INDEX IF NOT EXISTS `idx_predictions_user` ON `predictions`(`user_id`);
CREATE INDEX IF NOT EXISTS `idx_predictions_group` ON `predictions`(`group_id`);
