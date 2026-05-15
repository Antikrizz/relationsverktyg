// Supabase-uppgifter — anon-nyckeln är publik per design, säkerheten sitter i RLS-policies
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const SUPABASE_URL = 'https://uydnsxpxcgyuedcnzfyy.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5ZG5zeHB4Y2d5dWVkY256Znl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg3OTk5OTQsImV4cCI6MjA5NDM3NTk5NH0.gwI8G0FIEmr-jT1uSdw-Ddtg2NSYNsHnFzAPjkijikw'

// Skapar en klient som används för alla databasanrop i appen
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
