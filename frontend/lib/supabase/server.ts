import { createClient } from '@supabase/supabase-js';

// Server-only admin client for API routes
// Uses service role key if available, falls back to publishable key (open RLS for hackathon)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
);
