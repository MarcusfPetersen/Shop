import { createClient } from "@supabase/supabase-js";

// Disse to er "publishable"/anon-nøgler — de er lavet til at ligge i
// frontend-kode og er trygge at have med i et repo, fordi Row Level
// Security-policyen på databasen styrer hvad de faktisk må.
const SUPABASE_URL = "https://yuhetjzkxtoistbtzchy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_VeebKToyxulsAlB7k4_bNg_S8fhn-aR";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
