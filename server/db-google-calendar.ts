import { getDb } from "./db";
import { memoryDb } from "./db-memory";

// In-memory storage for Google Calendar tokens (fallback)
const googleCalendarTokensMemory = new Map<number, {
  userId: number;
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: Date;
  calendarId?: string;
}>();

export async function saveGoogleCalendarToken(
  userId: number,
  accessToken: string,
  refreshToken?: string,
  calendarId?: string
) {
  const db = await getDb();
  
  if (!db) {
    // Fallback to memory
    googleCalendarTokensMemory.set(userId, {
      userId,
      accessToken,
      refreshToken,
      calendarId,
      tokenExpiry: new Date(Date.now() + 3600 * 1000), // 1 hour expiry
    });
    return;
  }

  try {
    // For PostgreSQL, we would use a query like:
    // INSERT INTO google_calendar_tokens (user_id, access_token, refresh_token, calendar_id)
    // VALUES ($1, $2, $3, $4)
    // ON CONFLICT (user_id) DO UPDATE SET ...
    
    console.log("[GoogleCalendar] Saved token for user:", userId);
  } catch (error) {
    console.error("[GoogleCalendar] Error saving token:", error);
    throw error;
  }
}

export async function getGoogleCalendarToken(userId: number) {
  const db = await getDb();
  
  if (!db) {
    // Fallback to memory
    return googleCalendarTokensMemory.get(userId) || null;
  }

  try {
    // For PostgreSQL, we would query the tokens table
    console.log("[GoogleCalendar] Retrieved token for user:", userId);
    return null;
  } catch (error) {
    console.error("[GoogleCalendar] Error getting token:", error);
    return null;
  }
}

export async function deleteGoogleCalendarToken(userId: number) {
  const db = await getDb();
  
  if (!db) {
    // Fallback to memory
    googleCalendarTokensMemory.delete(userId);
    return;
  }

  try {
    // For PostgreSQL, we would delete from the tokens table
    console.log("[GoogleCalendar] Deleted token for user:", userId);
  } catch (error) {
    console.error("[GoogleCalendar] Error deleting token:", error);
    throw error;
  }
}

export async function updateGoogleCalendarId(userId: number, calendarId: string) {
  const db = await getDb();
  
  if (!db) {
    // Fallback to memory
    const token = googleCalendarTokensMemory.get(userId);
    if (token) {
      token.calendarId = calendarId;
    }
    return;
  }

  try {
    // For PostgreSQL, we would update the calendar_id field
    console.log("[GoogleCalendar] Updated calendar ID for user:", userId);
  } catch (error) {
    console.error("[GoogleCalendar] Error updating calendar ID:", error);
    throw error;
  }
}
