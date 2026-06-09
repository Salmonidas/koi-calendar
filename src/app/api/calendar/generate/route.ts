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

    // Diccionario de siglas de juegos
    const gameAcronyms: Record<string, string> = {
      'league of legends': 'LOL',
      'counter-strike': 'CS2',
      'valorant': 'VAL',
      'teamfight tactics': 'TFT',
      'pokemon': 'PKMN',
      'rocket league': 'RL',
      'ea sports fc': 'FC',
      'call of duty': 'COD',
      'rainbow six siege': 'R6',
      'rainbow 6': 'R6'
    };

    // Build calendar name from game acronyms and suffixes
    const allDbTeams = await teamAdapter.findAll();
    const acronymsRaw = allDbTeams
      .filter((t: any) => sortedIds.includes(t.id.toString()))
      .map((t: any) => {
        // 1. Si el equipo tiene una liga asignada dinámicamente, la priorizamos (ej: LEC, Superliga, TFT, VCT)
        if (t.league) {
          return t.league;
        }

        // 2. Si no hay liga, intentar extraer dinámicamente cualquier sufijo o palabra extra en el nombre del equipo
        // Ej: "Movistar KOI Karps" -> extrae "Karps", "MAD Lions KOI Femenino" -> extrae "Femenino"
        const cleanName = (t.name || '').replace(/movistar koi|mad lions koi|toronto koi|koi/ig, '').trim();
        const extraName = cleanName.length > 0 ? cleanName : '';

        // 3. Obtener la sigla base del juego como fallback
        const gameLower = (t.game || '').toLowerCase();
        let baseAcronym = gameAcronyms[gameLower] || t.game || t.acronym || 'eSports';

        // 4. Retornar de forma dinámica y genérica (ej: LOL (Karps) o simplemente CS2)
        return extraName ? `${baseAcronym} (${extraName})` : baseAcronym;
      });

    const activeAcronyms = Array.from(new Set(acronymsRaw)).join(' + ');

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
