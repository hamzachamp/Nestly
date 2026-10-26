// Nestly — claude-proxy. The browser calls THIS (with the signed-in user's Supabase token) instead of
// Anthropic, so the Anthropic key stays in Supabase secrets and never ships to the browser.
// Deploy WITH JWT verification (the default): supabase functions deploy claude-proxy
import { admin, env } from '../_shared/platform.ts';

const DAILY_CAP = parseInt(env('PROXY_DAILY_CAP_PER_USER', '150'), 10);
const MAX_TOKENS_CEILING = 4000;
const ALLOWED_TOOL_TYPES = new Set(['web_search_20250305']);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const sb = admin();
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: u, error: authErr } = await sb.auth.getUser(token);
  if (authErr || !u?.user) return json(401, { error: 'unauthorized', message: 'Please sign in again.' });

  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: 'bad_request', message: 'Invalid JSON.' }); }
  if (typeof body?.model !== 'string' || !body.model.startsWith('claude-') || !Array.isArray(body?.messages)) {
    return json(400, { error: 'bad_request', message: 'Invalid request.' });
  }
  if (body.tools && !(Array.isArray(body.tools) && body.tools.every((t: any) => ALLOWED_TOOL_TYPES.has(t?.type)))) {
    return json(400, { error: 'bad_request', message: 'Tool not allowed.' });
  }

  // Per-user daily cap (reuses the atomic counter; the user id is the key)
  const day = new Date().toISOString().slice(0, 10);
  const { data: used, error: capErr } = await sb.rpc('assistant_bump_usage', { p_family: u.user.id, p_day: day, p_cap: DAILY_CAP });
  if (capErr) console.error('usage counter failed', capErr.message);
  else if (used === -1) {
    return json(429, { error: 'daily_limit_reached', message: 'Daily AI limit reached. It resets tomorrow.', used: DAILY_CAP, limit: DAILY_CAP });
  }

  const payload: Record<string, unknown> = {
    model: body.model,
    messages: body.messages,
    max_tokens: Math.min(Number(body.max_tokens) || 1500, MAX_TOKENS_CEILING)
  };
  if (body.system) payload.system = body.system;
  if (body.tools) payload.tools = body.tools;

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(payload)
  });
  const text = await resp.text();
  if (!resp.ok) console.error('anthropic error', resp.status, text.slice(0, 300));
  return new Response(text, { status: resp.status, headers: { ...cors, 'content-type': 'application/json' } });
});
