// Nestly assistant — Telegram webhook.
// A linked family member messages the bot; Claude turns it into tool calls; we apply them to the same
// family_data JSON the app uses, so the change appears in the app instantly (Supabase realtime).
//
// Deploy with --no-verify-jwt (Telegram cannot send a Supabase JWT). Security instead comes from:
//   1. the secret-token header Telegram attaches to every webhook call
//   2. only chats linked through a one-time code created inside the signed-in app can act on a family
import { admin, env, sendTelegram } from '../_shared/platform.ts';
import {
  TOOLS, buildSystemPrompt, applyAction, agenda, localParts, addDays, DEFAULT_TZ
} from '../_shared/core.js';

const sb = admin();
const MODEL = env('ASSISTANT_MODEL', 'claude-haiku-5-5');
const DAILY_CAP = parseInt(env('ASSISTANT_DAILY_CAP', '40'), 10);

const HELP =
  'I\'m Nestly. Message me like a person:\n' +
  '• "Dentist for Jack Tuesday 4pm"\n' +
  '• "Remind me to call the school tomorrow at 3"\n' +
  '• "What\'s on this week?"\n' +
  '• "Done: pay term fees"\n\n' +
  'Shortcuts: /today  /week  /stop';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok');
  if (req.headers.get('x-telegram-bot-api-secret-token') !== env('TELEGRAM_WEBHOOK_SECRET')) {
    return new Response('unauthorized', { status: 401 });
  }
  let update: any;
  try { update = await req.json(); } catch { return new Response('bad request', { status: 400 }); }

  const msg = update?.message;
  if (!msg?.text || msg.chat?.type !== 'private') return new Response('ok');
  const chatId = String(msg.chat.id);
  const text = String(msg.text).trim().slice(0, 1000);

  try {
    await handle(chatId, text, update.update_id);
  } catch (e) {
    console.error('handler error', e);
    await sendTelegram(chatId, 'Sorry, something went wrong on my side. Please try again in a moment.');
  }
  return new Response('ok'); // always 200 so Telegram never retry-storms
});

async function handle(chatId: string, text: string, updateId: number) {
  // /start CODE  -> link this chat to a family member
  const start = /^\/start(?:\s+(\S+))?$/i.exec(text);
  if (start?.[1]) return linkAccount(start[1], chatId);

  const { data: link } = await sb.from('channel_links').select('*')
    .eq('channel', 'telegram').eq('chat_id', chatId).maybeSingle();

  if (!link) {
    return void await sendTelegram(chatId,
      'Hi! To connect, open Nestly → Settings → Assistant and tap "Connect Telegram". I\'ll recognise you then.');
  }
  if (/^\/start$/i.test(text)) {
    await sb.from('channel_links').update({ active: true }).eq('id', link.id);
    return void await sendTelegram(chatId, 'Welcome back — I\'m on again.\n\n' + HELP);
  }
  if (/^\/stop$/i.test(text)) {
    await sb.from('channel_links').update({ active: false }).eq('id', link.id);
    return void await sendTelegram(chatId, 'Paused. I won\'t message you. Send /start to turn me back on.');
  }
  if (!link.active) return; // paused: stay silent

  // Ignore redelivered updates
  const { data: fresh } = await sb.from('assistant_sent')
    .upsert({ family_id: link.family_id, link_id: link.id, key: `upd:${updateId}` },
      { onConflict: 'link_id,key', ignoreDuplicates: true })
    .select('key');
  if (!fresh || fresh.length === 0) return;

  if (/^\/help$/i.test(text)) return void await sendTelegram(chatId, HELP);

  const tz = link.timezone || DEFAULT_TZ;
  const now = new Date();

  // Zero-cost commands (no AI call)
  if (/^\/(today|week)$/i.test(text)) {
    const { data } = await loadFamily(link.family_id);
    if (!data?.initialized) return void await sendTelegram(chatId, 'Your family isn\'t set up in Nestly yet.');
    const today = localParts(now, tz).date;
    const days = /week/i.test(text) ? 7 : 1;
    const label = days === 1 ? 'Today' : 'Next 7 days';
    return void await sendTelegram(chatId, `${label}\n${agenda(data, { fromDate: today, days, personName: link.person_name })}`);
  }

  // AI path — capped per family per day to protect margin
  const day = localParts(now, tz).date;
  const { data: used, error: capErr } = await sb.rpc('assistant_bump_usage', { p_family: link.family_id, p_day: day, p_cap: DAILY_CAP });
  if (capErr) throw capErr;
  if (used === -1) {
    return void await sendTelegram(chatId, `You've reached today's limit of ${DAILY_CAP} assistant messages. /today and /week still work.`);
  }

  // Up to 3 attempts: re-read and re-apply if the app saved at the same moment (optimistic concurrency)
  const ctx = { now, tz, senderName: link.person_name || undefined };
  let modelOut: any = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, updatedAt } = await loadFamily(link.family_id);
    if (!data?.initialized) return void await sendTelegram(chatId, 'Your family isn\'t set up in Nestly yet. Open the app first.');

    if (!modelOut) modelOut = await callModel(buildSystemPrompt(data, ctx), text);

    const toolCalls = (modelOut.content || []).filter((b: any) => b.type === 'tool_use');
    if (toolCalls.length === 0) {
      const reply = (modelOut.content || []).filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n').trim();
      return void await sendTelegram(chatId, reply || HELP);
    }

    let working = data;
    const replies: string[] = [];
    let changed = false;
    for (const call of toolCalls.slice(0, 5)) {
      const r = applyAction(working, call.name, call.input, ctx);
      working = r.data;
      replies.push(r.reply);
      changed = changed || r.changed;
    }

    if (!changed) return void await sendTelegram(chatId, replies.join('\n'));

    const { data: saved, error } = await sb.from('family_data')
      .update({ data: working, updated_at: new Date().toISOString(), updated_by: link.user_id })
      .eq('family_id', link.family_id)
      .eq('updated_at', updatedAt)
      .select('family_id');
    if (error) throw error;
    if (saved && saved.length) return void await sendTelegram(chatId, replies.join('\n'));
    // else: someone saved first — loop re-reads and re-applies the same tool calls
  }
  await sendTelegram(chatId, 'The app was busy updating, so I didn\'t save that. Please send it again.');
}

async function loadFamily(familyId: string) {
  const { data, error } = await sb.from('family_data').select('data, updated_at').eq('family_id', familyId).maybeSingle();
  if (error) throw error;
  return { data: data?.data ?? null, updatedAt: data?.updated_at ?? null };
}

async function callModel(system: string, userText: string) {
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env('ANTHROPIC_API_KEY'),
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: MODEL, max_tokens: 600, system, tools: TOOLS,
      messages: [{ role: 'user', content: userText }]
    })
  });
  if (!resp.ok) throw new Error(`anthropic ${resp.status}: ${(await resp.text()).slice(0, 300)}`);
  return await resp.json();
}

async function linkAccount(rawCode: string, chatId: string) {
  const code = rawCode.trim().toUpperCase();
  const nowIso = new Date().toISOString();
  const { data: row } = await sb.from('link_codes').select('*')
    .eq('code', code).is('used_at', null).gt('expires_at', nowIso).maybeSingle();
  const expired = 'That link has expired. In Nestly open Settings → Assistant and tap "Connect Telegram" again.';
  if (!row) return void await sendTelegram(chatId, expired);

  // Claim the code atomically so it can only be used once
  const { data: claimed } = await sb.from('link_codes').update({ used_at: nowIso })
    .eq('code', code).is('used_at', null).select('code').maybeSingle();
  if (!claimed) return void await sendTelegram(chatId, expired);

  const { error } = await sb.from('channel_links').upsert({
    family_id: row.family_id, user_id: row.user_id, channel: 'telegram', chat_id: chatId,
    person_name: row.person_name, active: true
  }, { onConflict: 'channel,chat_id' });
  if (error) throw error;

  await sendTelegram(chatId,
    `Connected${row.person_name ? ', ' + row.person_name : ''}! ✅ Anything you tell me shows up in Nestly straight away, and I'll message you reminders and a morning brief.\n\n${HELP}`);
}
