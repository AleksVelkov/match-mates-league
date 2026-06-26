import { sqliteTable, text, integer, uniqueIndex, primaryKey } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ─── Better Auth tables (managed by Better Auth) ─────────────────────────────

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

// ─── App tables ───────────────────────────────────────────────────────────────

export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("⚽"),
  description: text("description"),
  competition: text("competition").notNull().default("Premier League"),
  inviteCode: text("invite_code").notNull().unique(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => user.id),
  round: integer("round").notNull().default(1),
  showPredictionsBeforeKickoff: integer("show_predictions_before_kickoff", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const groupMembers = sqliteTable(
  "group_members",
  {
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    joinedAt: integer("joined_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.groupId, t.userId] })],
);

// Central, league-scoped matches. Managed by the super admin and shared by all groups
// playing that competition (no per-group copies).
export const fixtures = sqliteTable(
  "fixtures",
  {
    id: text("id").primaryKey(),
    competition: text("competition").notNull(),
    round: integer("round").notNull(),
    home: text("home").notNull(),
    homeShort: text("home_short").notNull(),
    away: text("away").notNull(),
    awayShort: text("away_short").notNull(),
    kickoffAt: integer("kickoff_at", { mode: "timestamp" }).notNull(),
    status: text("status", { enum: ["upcoming", "live", "finished"] })
      .notNull()
      .default("upcoming"),
    resultHome: integer("result_home"),
    resultAway: integer("result_away"),
    externalId: text("external_id"),
    homeCrest: text("home_crest"),
    awayCrest: text("away_crest"),
    homeTeamId: text("home_team_id"),
    awayTeamId: text("away_team_id"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [uniqueIndex("fixtures_competition_external_idx").on(t.competition, t.externalId)],
);

// Predictions are scoped per group, so the same user can predict the same central
// fixture differently in different groups.
export const predictions = sqliteTable(
  "predictions",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    fixtureId: text("fixture_id")
      .notNull()
      .references(() => fixtures.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    scoreHome: integer("score_home"),
    scoreAway: integer("score_away"),
    isJoker: integer("is_joker", { mode: "boolean" }).notNull().default(false),
    pointsEarned: integer("points_earned"),
    submittedAt: integer("submitted_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [uniqueIndex("predictions_group_fixture_user_idx").on(t.groupId, t.fixtureId, t.userId)],
);

// Extended user profile data — country, etc. (avatar URL lives on user.image)
export const userProfiles = sqliteTable("user_profiles", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  country: text("country"),
  countryCode: text("country_code"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// Seasons defined by the super admin for stat aggregation.
export const seasons = sqliteTable("seasons", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  startDate: integer("start_date", { mode: "timestamp" }).notNull(),
  endDate: integer("end_date", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const achievements = sqliteTable(
  "achievements",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    achievementKey: text("achievement_key").notNull(),
    unlockedAt: integer("unlocked_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [uniqueIndex("achievements_user_key_idx").on(t.userId, t.achievementKey)],
);

export const config = sqliteTable("config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// Fixed-window rate limiting for auth/join endpoints.
export const rateLimits = sqliteTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull().default(0),
  resetAt: integer("reset_at").notNull(), // epoch ms
});

// Team profiles synced from football-data.org. One row per team across all competitions.
export const teams = sqliteTable("teams", {
  id: text("id").primaryKey(), // football-data.org team ID as string
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  tla: text("tla").notNull(),
  crestUrl: text("crest_url"),
  founded: integer("founded"),
  venue: text("venue"),
  clubColors: text("club_colors"),
  website: text("website"),
  address: text("address"),
  coachName: text("coach_name"),
  coachNationality: text("coach_nationality"),
  squadJson: text("squad_json"), // JSON: SquadMember[]
  syncedAt: integer("synced_at", { mode: "timestamp" }).notNull(),
  apiSportsId: integer("api_sports_id"),
  playersSyncedAt: integer("players_synced_at", { mode: "timestamp" }),
});

// Per-competition league standing. One row per (team, competition).
export const teamStandings = sqliteTable(
  "team_standings",
  {
    teamId: text("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
    competition: text("competition").notNull(),
    position: integer("position").notNull().default(0),
    played: integer("played").notNull().default(0),
    won: integer("won").notNull().default(0),
    drawn: integer("drawn").notNull().default(0),
    lost: integer("lost").notNull().default(0),
    goalsFor: integer("goals_for").notNull().default(0),
    goalsAgainst: integer("goals_against").notNull().default(0),
    goalDifference: integer("goal_difference").notNull().default(0),
    points: integer("points").notNull().default(0),
    form: text("form"),
    syncedAt: integer("synced_at", { mode: "timestamp" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.competition] })],
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const groupsRelations = relations(groups, ({ one, many }) => ({
  owner: one(user, { fields: [groups.ownerId], references: [user.id] }),
  members: many(groupMembers),
  predictions: many(predictions),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, { fields: [groupMembers.groupId], references: [groups.id] }),
  user: one(user, { fields: [groupMembers.userId], references: [user.id] }),
}));

export const fixturesRelations = relations(fixtures, ({ many }) => ({
  predictions: many(predictions),
}));

export const predictionsRelations = relations(predictions, ({ one }) => ({
  group: one(groups, { fields: [predictions.groupId], references: [groups.id] }),
  fixture: one(fixtures, { fields: [predictions.fixtureId], references: [fixtures.id] }),
  user: one(user, { fields: [predictions.userId], references: [user.id] }),
}));
