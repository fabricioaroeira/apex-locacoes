// =====================================================================
// Cliente Supabase — projeto APEX LOCAÇÕES (tlexdevulwjozjiuacct)
// =====================================================================

export const MOCK_MODE = false;

export const SUPABASE_URL = 'https://tlexdevulwjozjiuacct.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsZXhkZXZ1bHdqb3pqaXVhY2N0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNTM1NDgsImV4cCI6MjEwMjYyOTU0OH0.xM2JNLeEljuosPiskUNgAyWi0DPD6sm2TBD1hC1Q4c8';

let _client = null;

export async function getSupabase() {
  if (MOCK_MODE) return null;
  if (_client) return _client;
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
  return _client;
}
