import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

export async function buildAppUser(session: Session) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('company_id, full_name, created_at')
    .eq('user_id', session.user.id)
    .single();

  if (error || !profile) {
    console.error('Failed to fetch profile info:', error);
    return null;
  }

  return {
    id: session.user.id,
    email: session.user.email ?? '',
    role: 'member',
    token: session.access_token,
    company: profile.company_id,
    name: profile.full_name || 'User',
    created_at: profile.created_at,
  };
}
