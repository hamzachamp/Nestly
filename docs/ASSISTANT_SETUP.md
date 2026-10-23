# Nestly personal assistant — setup guide

What this adds: every adult (and the kids' schedules) can **message Nestly on Telegram** — "Dentist for Jack Tuesday 4pm",
"Remind me to call the school tomorrow at 3", "What's on this week?" — and it appears **in the app instantly**.
Nestly also **messages you first**: event alerts 60 minutes before, birthday eve reminders, one-off reminders, and a
personal **morning brief** each day.

Nothing goes live for users until step 7 (a feature flag), so you can set this up safely at your own pace.

## Why Telegram first (and WhatsApp later)
| | Telegram bot | WhatsApp Cloud API |
|---|---|---|
| Setup | ~5 minutes, no business verification | Meta business verification + dedicated number (days to weeks) |
| Cost | Free, unlimited | Free inside 24h reply window; template fees outside it |
| Proactive messages | Anytime | Only approved templates outside the 24h window |
| Reach in Australia | Lower than WhatsApp | Highest |

Telegram lets you prove the product (do families actually use it?) at zero cost. The core logic lives in
`supabase/functions/_shared/core.js` and is channel-independent; WhatsApp is a new sender/receiver pair on top.

## One-time setup (about 30 minutes)

**1. Create the bot.** In Telegram, message **@BotFather** → `/newbot` → pick a name and a username ending in `bot`.
Save the **token** it gives you and the **username** (without the @).

**2. Create the database tables.** Supabase dashboard → SQL Editor → paste the contents of
`supabase/migrations/20261023000000_assistant_channels.sql` → Run.

**3. Add secrets.** Supabase dashboard → Edge Functions → Secrets:

| Name | Value |
|---|---|
| `TELEGRAM_BOT_TOKEN` | token from step 1 |
| `TELEGRAM_WEBHOOK_SECRET` | any long random string (invent one) |
| `CRON_SECRET` | another long random string |
| `ANTHROPIC_API_KEY` | your Anthropic key (server-side only, never in the browser) |
| `ASSISTANT_MODEL` | optional; defaults to `claude-haiku-5-5` (cheapest option that handles this well) |
| `ASSISTANT_DAILY_CAP` | optional; AI messages per family per day, default `40` |

**4. Deploy the two functions** (Telegram and the cron job cannot send a Supabase login token, so they are deployed without
JWT verification and authenticate with the secrets above instead):
```
supabase functions deploy telegram-webhook --no-verify-jwt
supabase functions deploy send-reminders --no-verify-jwt
```
Non-technical shortcut: open Claude Code in this repo and say *"Deploy the two Supabase functions in supabase/functions
using the Supabase CLI with --no-verify-jwt, then confirm they are live."*

**5. Point Telegram at your function** (open this URL once in a browser, filling in the three values):
```
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://<PROJECT_REF>.supabase.co/functions/v1/telegram-webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
```
It should answer `{"ok":true,...}`.

**6. Schedule the reminder sender** (every 5 minutes). Supabase → Database → Extensions → enable **pg_cron** and **pg_net**,
then SQL Editor:
```sql
select cron.schedule('nestly-reminders', '*/5 * * * *', $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', '<CRON_SECRET>'),
    body := '{}'::jsonb
  );
$$);
```

**7. Turn it on in the app.** Netlify → Site settings → Environment variables → add
`VITE_TELEGRAM_BOT_USERNAME` = your bot username (no @) → redeploy. Until this is set, Settings shows "Coming soon".

## Test it
1. Open Nestly → Settings → **Personal assistant** → choose your name → **Connect Telegram** → tap Start in Telegram.
2. Send: `Remind me in the evening to call the school` (it will ask for a time) then `Dentist for Jack next Tuesday 4pm`.
3. Check the event appears in the app's Calendar without refreshing.
4. Send `/today` and `/week` (free, no AI call).
5. Invite your partner (Settings → Family members), add them under **The adults**, and have them connect their own Telegram.

## How it behaves
- **Private by default:** an adult's personal items go only to that adult. Kids' and household items go to every connected parent.
- **Spend control:** `/today` and `/week`, the morning brief and all reminders cost **$0 AI**. Only free-text messages call Claude,
  capped per family per day. Rough guide: a Haiku-class model is a fraction of a cent per message.
- **Safety:** only Telegram chats linked through a one-time, 15-minute code created inside your signed-in app can touch a
  family's data. Telegram's secret header is verified on every call. Links are removable from Settings, and `/stop` pauses instantly.
- **Not stored:** message text is not saved by the function; only the resulting events/tasks are.

## Known limitations (and the next step for each)
1. **Shared JSON blob.** Events/tasks live in one JSON document per family. Assistant writes use a compare-and-swap with
   retries, and the app picks them up live, but if someone saves in the app in the same second the assistant retries once
   or asks you to resend. Longer term: move events/tasks into their own tables.
2. **Tasks have labels, not real dates, in older data.** Only assistant-created tasks carry exact due dates/reminder times.
   Reminders for older tasks come via the morning brief ("Today" / high priority).
3. **Telegram-only.** WhatsApp needs Meta business verification; start that in parallel — the logic is already channel-neutral.
4. **Text only.** Voice notes and photos (e.g. snap a school flyer → events) are the natural next feature.
5. **One time zone per family** for event reminders (taken from the first linked account, default Australia/Sydney).
6. **Privacy Policy/Terms** must mention Telegram as a processor and that message content is sent to Anthropic — update before launch.
