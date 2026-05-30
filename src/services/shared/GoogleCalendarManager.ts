import { google, calendar_v3 } from 'googleapis';

export class GoogleCalendarManager {
  private calendar: calendar_v3.Calendar;

  constructor() {
    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      console.warn('[GoogleCalendarManager] Missing GOOGLE_CLIENT_EMAIL or GOOGLE_PRIVATE_KEY. Calendar operations will fail.');
    }

    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL || '',
        private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    this.calendar = google.calendar({ version: 'v3', auth });
  }

  async getOrCreateCalendar(calendarName: string, colorId: string = '3'): Promise<string> {
    const res = await this.calendar.calendarList.list();
    const existing = res.data.items?.find(c => c.summary === calendarName);

    let calendarId: string;

    if (existing && existing.id) {
      // Verify the calendar actually exists (calendarList can have stale ghost entries)
      try {
        await this.calendar.calendars.get({ calendarId: existing.id });
        calendarId = existing.id;
      } catch (verifyErr: any) {
        // Ghost entry: remove from calendarList and create fresh
        console.warn(`[GoogleCalendarManager] Calendar ${existing.id} is in calendarList but doesn't exist. Purging and recreating.`);
        try { await this.calendar.calendarList.delete({ calendarId: existing.id }); } catch (_) {}
        calendarId = await this._createFreshCalendar(calendarName);
      }
    } else {
      calendarId = await this._createFreshCalendar(calendarName);
    }

    // Set calendarList color
    try {
      await this.calendar.calendarList.patch({
        calendarId,
        requestBody: { colorId }
      });
    } catch (e: any) {
      console.warn(`[GoogleCalendarManager] Failed to set color ${colorId} for ${calendarId}:`, e.message);
    }

    return calendarId;
  }

  private async _createFreshCalendar(calendarName: string): Promise<string> {
    const newCal = await this.calendar.calendars.insert({
      requestBody: { summary: calendarName, timeZone: 'Europe/Madrid' }
    });
    const calendarId = newCal.data.id!;
    await this.calendar.acl.insert({
      calendarId,
      requestBody: { role: 'reader', scope: { type: 'default' } }
    });
    return calendarId;
  }

  async deleteCalendar(calendarId: string): Promise<boolean> {
    let deleted = false;
    try {
      await this.calendar.calendars.delete({ calendarId });
      deleted = true;
    } catch (e: any) {
      console.warn(`[GoogleCalendarManager] Calendar ${calendarId} may already be deleted: ${e.message}`);
    }
    // Always purge from calendarList to prevent ghost entries
    try {
      await this.calendar.calendarList.delete({ calendarId });
    } catch (_) {}
    return deleted;
  }
}
