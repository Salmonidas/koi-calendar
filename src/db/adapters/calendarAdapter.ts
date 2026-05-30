import { getSupabase } from '../supabase';

export const calendarAdapter = {
  async findByHash(hash: string) {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('calendars')
      .select('*')
      .eq('combination_hash', hash)
      .maybeSingle();

    if (error) {
      console.error('[calendarAdapter] Supabase findByHash Error:', error);
      return null;
    }
    return data || null;
  },

  async create(hash: string, googleCalendarId: string, teamsJson: string, lang: string, colorId: string) {
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase client not initialized');

    const payload = {
      combination_hash: hash,
      google_calendar_id: googleCalendarId,
      teams_json: teamsJson,
      lang,
      color_id: colorId,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('calendars')
      .insert(payload);

    if (error) {
      console.error('[calendarAdapter] Supabase create Error:', error);
      throw error;
    }
    return { changes: 1 };
  }
};
