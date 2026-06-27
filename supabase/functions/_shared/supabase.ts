// Klien Supabase dengan SERVICE ROLE — hanya hidup di Edge Function, tak pernah di klien.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
export function serviceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}
