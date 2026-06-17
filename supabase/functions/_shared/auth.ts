import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AuthResult {
  ok: boolean;
  userId: string | null;
  isService: boolean;
  status: number;
  error?: string;
}

/**
 * Validates the request's Authorization header.
 * Accepts either:
 *  - a valid end-user JWT (returns userId), OR
 *  - a Bearer token equal to SUPABASE_SERVICE_ROLE_KEY or CRON_SECRET
 *    (treated as a trusted internal/cron caller).
 */
export async function authenticateRequest(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return { ok: false, userId: null, isService: false, status: 401, error: 'Missing bearer token' };
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return { ok: false, userId: null, isService: false, status: 401, error: 'Empty bearer token' };
  }

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const cronSecret = Deno.env.get('CRON_SECRET') || '';
  if ((serviceKey && token === serviceKey) || (cronSecret && token === cronSecret)) {
    return { ok: true, userId: null, isService: true, status: 200 };
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, anonKey);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return { ok: false, userId: null, isService: false, status: 401, error: 'Invalid token' };
    }
    return { ok: true, userId: data.user.id, isService: false, status: 200 };
  } catch (_e) {
    return { ok: false, userId: null, isService: false, status: 401, error: 'Auth check failed' };
  }
}
