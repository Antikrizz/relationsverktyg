// Supabase-uppgifter — anon-nyckeln är publik per design.
// All dataåtkomst går via Edge Functions som kräver rumskoden;
// anon-nyckeln kan inte läsa databasen direkt (RLS utan policies).
export const SUPABASE_URL = 'https://uydnsxpxcgyuedcnzfyy.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_i99YkdBlVCE9gx1wdP3gyA_9Gt2Bnza'
