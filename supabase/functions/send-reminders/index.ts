// Nestly assistant — scheduled sender. Called every 5 minutes by pg_cron (see docs/ASSISTANT_SETUP.md).
// Sends (1) due reminders and (2) the personal morning brief. Contains NO AI calls, so it costs nothing
// beyond Telegram (free). Deploy with --no-verify-jwt; it authenticates with the x-cron-secret header.
import { admin, env, sendTelegram } from '../_shared/platform.ts';
import { computeDueReminders, buildBrief, recipientsFor, localParts, DEFAULT_TZ } from '../_shared/core.js';

const sb = admin();

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== env('CRON_SECRET') || !env('CRON_SECRET')) {
    return new Response('unauthorized', { status: 401 });
  }
  const now = new Date();
  const stats = { families: 0, reminders: 0, briefs: 0, errors: 0 };

  const { data: links, error } = await sb.from('channel_links').select('*').eq('active', true).eq('channel', 'telegram');
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const byFamily = new Map<string, any[]>();
  for (const l of links || []) byFamily.set(l.family_id, [...(byFamily.get(l.family_id) || []), l]);

  for (const [familyId, famLinks] of byFamily) {
    try {
      const { data: row } = await sb.from('family_data').select('data').eq('family_id', familyId).maybeSingle();
      const data = row?.data;
      if (!data?.initialized) continue;
      stats.families++;

      // 1) due reminders -------------------------------------------------------------
      const familyTz = famLinks[0].timezone || DEFAULT_TZ;
      for (const r of computeDueReminders(data, { now, tz: familyTz })) {
        for (const l of recipientsFor(r.personName, famLinks, data).filter((x: any) => x.reminders_enabled)) {
          if (await claim(familyId, l.id, r.key)) {
            const res = await sendTelegram(l.chat_id, r.text);
            if (res.ok) stats.reminders++;
            else { await release(l.id, r.key); await maybeDeactivate(l, res.blocked); stats.errors++; }
          }
        }
      }

      // 2) morning brief, once per local day, within 3 hours after the chosen hour -------
      for (const l of famLinks) {
        if (!l.brief_enabled) continue;
        const lp = localParts(now, l.timezone || DEFAULT_TZ);
        if (lp.hour < l.brief_hour || lp.hour > l.brief_hour + 3) continue;
        const { data: won } = await sb.from('channel_links').update({ last_brief_date: lp.date })
          .eq('id', l.id).or(`last_brief_date.is.null,last_brief_date.neq.${lp.date}`).select('id');
        if (!won || !won.length) continue;
        const text = buildBrief(data, { now, tz: l.timezone || DEFAULT_TZ, personName: l.person_name });
        if (!text) continue;
        const res = await sendTelegram(l.chat_id, text);
        if (res.ok) stats.briefs++;
        else { stats.errors++; await maybeDeactivate(l, res.blocked); }
      }
    } catch (e) {
      console.error('family failed', familyId, e);
      stats.errors++;
    }
  }

  // housekeeping: keep the dedupe log small
  await sb.from('assistant_sent').delete().lt('sent_at', new Date(Date.now() - 14 * 86400000).toISOString());
  return new Response(JSON.stringify(stats), { headers: { 'content-type': 'application/json' } });
});

/** Returns true only for the first caller to claim this (link, key) pair. */
async function claim(familyId: string, linkId: string, key: string): Promise<boolean> {
  const { data } = await sb.from('assistant_sent')
    .upsert({ family_id: familyId, link_id: linkId, key }, { onConflict: 'link_id,key', ignoreDuplicates: true })
    .select('key');
  return !!data && data.length > 0;
}

async function release(linkId: string, key: string) {
  await sb.from('assistant_sent').delete().eq('link_id', linkId).eq('key', key);
}

async function maybeDeactivate(link: any, blocked: boolean) {
  if (blocked) await sb.from('channel_links').update({ active: false }).eq('id', link.id);
}
