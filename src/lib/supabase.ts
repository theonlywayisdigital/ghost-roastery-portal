import { createClient } from "@supabase/supabase-js";
import {
  createBrowserClient as createBrowserSupabaseClient,
  createServerClient as createSSRServerClient,
} from "@supabase/ssr";

// Browser client (uses anon key — respects RLS)
export function createBrowserClient() {
  return createBrowserSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Cookie-based auth server client (reads Supabase Auth session from cookies)
// Use this for checking who is logged in from Server Components / Route Handlers.
export async function createAuthServerClient() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignored in Server Components (read-only cookies)
          }
        },
      },
    }
  );
}

// Server client with service role (bypasses RLS)
// Use this for admin operations and data queries.
export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      global: {
        fetch: (url, options) =>
          fetch(url, { ...options, cache: "no-store" }),
      },
    }
  );
}
