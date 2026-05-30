import { getSupabase } from '../supabase';

export const teamAdapter = {
  async findAll() {
    const supabase = getSupabase();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('teams')
      .select('*');

    if (error) {
      console.error('[teamAdapter] Supabase findAll Error:', error);
      return [];
    }
    return data || [];
  }
};
