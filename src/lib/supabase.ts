import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

console.log(
  `[Supabase] Supabase is ${
    isSupabaseConfigured ? "CONFIGURED" : "NOT CONFIGURED"
  }. URL: ${supabaseUrl ? "present" : "missing"}, Anon Key: ${
    supabaseAnonKey ? "present" : "missing"
  }`
);

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl!, supabaseAnonKey!) : null;
