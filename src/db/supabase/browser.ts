import { createBrowserClient as createClient } from "@supabase/ssr";

export function createBrowserClient() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    throw new Error(
      "Environment variables not found for SUPABASE_URL or SUPABASE_ANON_KEY"
    );
  }

  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );
}
