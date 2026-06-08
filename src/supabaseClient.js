// ─── CONFIGURATION SUPABASE ───────────────────────────────────────────────────
// ⚠️  REMPLACE les 2 lignes ci-dessous par TES vraies valeurs (Settings > API dans Supabase)

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://zzmwywnwltiqqpmhqcnf.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6bXd5d253bHRpcXFwbWhxY25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNzMxMDAsImV4cCI6MjA5NTY0OTEwMH0.94fWCDYJgubRuTzLUm_IRQ0J2tFdcvdfFvkcYEvOH5Q";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
