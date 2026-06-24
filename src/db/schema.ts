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
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
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
  ownerId: text("owner_id").notNull().references(() => user.id),
  round: integer("round").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const groupMembers = sqliteTable("group_members", {
  groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  joinedAt: integer("joined_at", { mode: "timestamp" }).notNull(),
}, (t) => [primaryKey({ columns: [t.groupId, t.userId] })]);

export const fixtures = sqliteTable("fixtures", {
  id: text("id").primaryKey(),
  groupId: text("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  competition: text("competition").notNull(),
  round: integer("round").notNull(),
  home: text("home").notNull(),
  homeShort: text("home_short").notNull(),
  away: text("away").notNull(),
  awayShort: text("away_short").notNull(),
  kickoffAt: integer("kickoff_at", { mode: "timestamp" }).notNull(),
  status: text("status", { enum: ["upcoming", "live", "finished"] }).notNull().default("upcoming"),
  resultHome: integer("result_home"),
  resultAway: integer("result_away"),
  externalId: text("external_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const predictions = sqliteTable("predictions", {
  id: text("id").primaryKey(),
  fixtureId: text("fixture_id").notNull().references(() => fixtures.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  scoreHome: integer("score_home"),
  scoreAway: integer("score_away"),
  isJoker: integer("is_joker", { mode: "boolean" }).notNull().default(false),
  pointsEarned: integer("points_earned"),
  submittedAt: integer("submitted_at", { mode: "timestamp" }).notNull(),
}, (t) => [uniqueIndex("predictions_fixture_user_idx").on(t.fixtureId, t.userId)]);

export const achievements = sqliteTable("achievements", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  achievementKey: text("achievement_key").notNull(),
  unlockedAt: integer("unlocked_at", { mode: "timestamp" }).notNull(),
}, (t) => [uniqueIndex("achievements_user_key_idx").on(t.userId, t.achievementKey)]);

// ─── Relations ────────────────────────────────────────────────────────────────

export const groupsRelations = relations(groups, ({ one, many }) => ({
  owner: one(user, { fields: [groups.ownerId], references: [user.id] }),
  members: many(groupMembers),
  fixtures: many(fixtures),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  group: one(groups, { fields: [groupMembers.groupId], references: [groups.id] }),
  user: one(user, { fields: [groupMembers.userId], references: [user.id] }),
}));

export const fixturesRelations = relations(fixtures, ({ one, many }) => ({
  group: one(groups, { fields: [fixtures.groupId], references: [groups.id] }),
  predictions: many(predictions),
}));

export const predictionsRelations = relations(predictions, ({ one }) => ({
  fixture: one(fixtures, { fields: [predictions.fixtureId], references: [fixtures.id] }),
  user: one(user, { fields: [predictions.userId], references: [user.id] }),
}));
