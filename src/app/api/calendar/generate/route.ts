import { NextResponse } from 'next/server';
import { calendarAdapter } from '@/db/adapters/calendarAdapter';
import { teamAdapter } from '@/db/adapters/teamAdapter';
import { GoogleCalendarManager } from '@/services/shared/GoogleCalendarManager';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { teamIds, lang = 'es', colorId = '3' } = body;

    if (!teamIds || !Array.isArray(teamIds) || teamIds.length === 0) {
      return NextResponse.json({ error: 'teamIds array is required' }, { status: 400 });
    }

    if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      return NextResponse.json({
        error: 'Las credenciales de Google (GOOGLE_CLIENT_EMAIL y GOOGLE_PRIVATE_KEY) no están configuradas en el servidor.'
      }, { status: 500 });
    }

    // Sort to ensure hash consistency regardless of selection order
    const sortedIds = [...teamIds].sort();
    const hash = crypto.createHash('md5').update(sortedIds.join(',') + lang).digest('hex');

    // Return existing calendar if already created for this combination
    const existingCal = await calendarAdapter.findByHash(hash);
    if (existingCal) {
      return NextResponse.json({
        success: true,
        calendarId: existingCal.google_calendar_id,
        link: `https://calendar.google.com/calendar/u/0/r?cid=${existingCal.google_calendar_id}`
      });
    }

    // Build calendar name from team acronyms
    const allDbTeams = await teamAdapter.findAll();
    const activeAcronyms = allDbTeams
      .filter((t: any) => sortedIds.includes(t.id.toString()))
      .map((t: any) => t.acronym || t.name.replace('Movistar KOI ', '').replace('KOI ', ''))
      .join(' + ');

    const calendarName = `KOI: ${activeAcronyms || 'Multi-Roster'} (${lang.toUpperCase()})`;
    const manager = new GoogleCalendarManager();
    const googleCalendarId = await manager.getOrCreateCalendar(calendarName, colorId);

    // Save as 'pending' — the home server cron will populate matches shortly
    await calendarAdapter.create(hash, googleCalendarId, JSON.stringify(sortedIds), lang, colorId);

    return NextResponse.json({
      success: true,
      calendarId: googleCalendarId,
      link: `https://calendar.google.com/calendar/u/0/r?cid=${googleCalendarId}`,
      message: '¡Tu calendario está listo! Los partidos aparecerán en unos minutos.'
    });

  } catch (error: any) {
    console.error('[API Calendar Generate] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
