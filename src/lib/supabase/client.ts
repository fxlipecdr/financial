import { createBrowserClient } from "@supabase/ssr";
import { Database } from "./types";

/**
 * Verifica se as variáveis de ambiente do Supabase estão configuradas com valores reais válidos.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return false;
  if (url.includes("your-project") || anonKey.includes("your-anon-key")) return false;
  return url.startsWith("https://") && anonKey.length > 20;
}

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Retorna o cliente Supabase para uso no navegador (Client Components).
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(url, anonKey);
  }

  return browserClient;
}