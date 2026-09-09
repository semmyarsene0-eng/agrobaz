import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://qwxpibaoflpgnmmxrfqw.supabase.co";

const supabaseAnonKey = "sb_publishable_13nH3ob154wSSgEqCBH6UA_6yi2f-qg";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
