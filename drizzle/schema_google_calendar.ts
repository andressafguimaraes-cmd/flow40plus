import { 
  integer, 
  pgTable, 
  text, 
  timestamp, 
  varchar,
  serial
} from "drizzle-orm/pg-core";

/**
 * Store Google Calendar OAuth tokens for users
 */
export const googleCalendarTokens = pgTable("google_calendar_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  calendarId: varchar("calendar_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type GoogleCalendarToken = typeof googleCalendarTokens.$inferSelect;
export type InsertGoogleCalendarToken = typeof googleCalendarTokens.$inferInsert;
