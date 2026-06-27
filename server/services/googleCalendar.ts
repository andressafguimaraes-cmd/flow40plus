import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

// Google Calendar API configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/auth/google/callback";

// Initialize OAuth2 client
export function createOAuth2Client() {
  return new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

// Generate Google OAuth URL
export function getGoogleAuthUrl() {
  const oauth2Client = createOAuth2Client();
  const scopes = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
  });

  return url;
}

// Exchange authorization code for tokens
export async function getTokensFromCode(code: string) {
  try {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    return tokens;
  } catch (error) {
    console.error("Error getting tokens from code:", error);
    throw new Error("Failed to get tokens from Google");
  }
}

// Create calendar event
export async function createCalendarEvent(
  accessToken: string,
  event: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
    calendarId?: string;
  }
) {
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const googleEvent = {
      summary: event.title,
      description: event.description,
      start: {
        dateTime: event.startTime.toISOString(),
        timeZone: "America/Sao_Paulo",
      },
      end: {
        dateTime: event.endTime.toISOString(),
        timeZone: "America/Sao_Paulo",
      },
    };

    const result = await calendar.events.insert({
      calendarId: event.calendarId || "primary",
      requestBody: googleEvent,
    });

    return result.data;
  } catch (error) {
    console.error("Error creating calendar event:", error);
    throw new Error("Failed to create calendar event");
  }
}

// Export task as calendar event
export async function exportTaskToCalendar(
  accessToken: string,
  task: {
    id: number;
    title: string;
    description?: string;
    totalEstimatedTime?: number;
    createdAt: Date;
  },
  calendarId?: string
) {
  try {
    // Calculate end time based on estimated time
    const startTime = new Date(task.createdAt);
    const endTime = new Date(startTime);
    
    if (task.totalEstimatedTime) {
      endTime.setMinutes(endTime.getMinutes() + task.totalEstimatedTime);
    } else {
      endTime.setHours(endTime.getHours() + 1); // Default 1 hour
    }

    const event = await createCalendarEvent(accessToken, {
      title: `[Flow 40+] ${task.title}`,
      description: task.description || `Task ID: ${task.id}`,
      startTime,
      endTime,
      calendarId,
    });

    return event;
  } catch (error) {
    console.error("Error exporting task to calendar:", error);
    throw new Error("Failed to export task to calendar");
  }
}

// Get calendar list
export async function getCalendarList(accessToken: string) {
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const result = await calendar.calendarList.list();

    return result.data.items || [];
  } catch (error) {
    console.error("Error getting calendar list:", error);
    throw new Error("Failed to get calendar list");
  }
}

// Create a new calendar for Flow 40+ tasks
export async function createFlowCalendar(accessToken: string) {
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const result = await calendar.calendars.insert({
      requestBody: {
        summary: "Flow 40+ Tasks",
        description: "Tasks managed by Flow 40+ productivity app",
        timeZone: "America/Sao_Paulo",
      },
    });

    return result.data;
  } catch (error) {
    console.error("Error creating Flow calendar:", error);
    throw new Error("Failed to create Flow calendar");
  }
}

// Refresh access token using refresh token
export async function refreshAccessToken(refreshToken: string) {
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials;
  } catch (error) {
    console.error("Error refreshing access token:", error);
    throw new Error("Failed to refresh access token");
  }
}

// Verify token is valid
export async function verifyToken(accessToken: string) {
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const tokenInfo = await oauth2Client.getTokenInfo(accessToken);
    return tokenInfo;
  } catch (error) {
    console.error("Error verifying token:", error);
    return null;
  }
}
