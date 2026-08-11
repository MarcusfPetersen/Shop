import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://yuhetjzkxtoistbtzchy.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_VeebKToyxulsAlB7k4_bNg_S8fhn-aR";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
