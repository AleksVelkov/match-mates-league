-- Group-level settings for prediction visibility
ALTER TABLE groups ADD COLUMN show_predictions_before_kickoff INTEGER NOT NULL DEFAULT 0;
