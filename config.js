// Supabase-uppgifter — anon-nyckeln är publik per design, säkerheten sitter i RLS-policies
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const SUPABASE_URL = 'https://uydnsxpxcgyuedcnzfyy.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_i99YkdBlVCE9gx1wdP3gyA_9Gt2Bnza'

// Skapar en klient som används för alla databasanrop i appen
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
