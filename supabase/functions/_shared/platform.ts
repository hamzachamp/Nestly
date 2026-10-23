// Thin platform helpers shared by the Edge Functions (Deno). All business logic lives in core.js.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const env = (name: string, fallback = ''): string => Deno.env.get(name) ?? fallback;

/** Service-role client: bypasses RLS. Only ever used inside Edge Functions, never shipped to the browser. */
export const admin = () =>
  createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false }
  });

export type SendResult = { ok: boolean; blocked: boolean };

/** Send a plain-text Telegram message. `blocked` = the user blocked the bot or deleted the chat. */
export async function sendTelegram(chatId: string, text: string): Promise<SendResult> {
  const token = env('TELEGRAM_BOT_TOKEN');
  const resp = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000), disable_web_page_preview: true })
  });
  if (resp.ok) return { ok: true, blocked: false };
  const blocked = resp.status === 403; // user blocked the bot or left the chat
  console.error('telegram send failed', resp.status, (await resp.text()).slice(0, 200));
  return { ok: false, blocked };
}
