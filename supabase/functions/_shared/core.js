// Nestly assistant core — pure, dependency-free logic shared by the Edge Functions
// and unit-tested in Node (tests/core.test.mjs). No network, no database, no Deno APIs here.
//
// Data model note: the family's events/tasks live in one JSON blob (family_data.data).
// `kidName` is a legacy field name; it now holds ANY household member's name (adult or child).

export const DEFAULT_TZ = 'Australia/Sydney';

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ---------------------------------------------------------------- time helpers

function tzOffsetMs(date, tz) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric'
  });
  const p = {};
  for (const part of dtf.formatToParts(date)) p[part.type] = part.value;
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const t = date.getTime();
  return asUtc - (t - (((t % 1000) + 1000) % 1000));
}

/** Wall-clock parts of `date` in time zone `tz`. */
export function localParts(date, tz = DEFAULT_TZ) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
  const p = {};
  for (const part of dtf.formatToParts(date)) p[part.type] = part.value;
  const dateStr = `${p.year}-${p.month}-${p.day}`;
  return {
    date: dateStr,
    time: `${p.hour}:${p.minute}`,
    hour: +p.hour,
    minute: +p.minute,
    weekday: WD[new Date(dateStr + 'T12:00:00Z').getUTCDay()]
  };
}

/** Convert a local wall-clock date+time in `tz` to a UTC Date. */
export function localToUtc(dateStr, timeStr, tz = DEFAULT_TZ) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const target = Date.UTC(y, m - 1, d, hh, mm);
  let guess = target;
  for (let i = 0; i < 3; i++) guess = target - tzOffsetMs(new Date(guess), tz);
  return new Date(guess);
}

export function isValidDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

export function isValidTime(s) {
  return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

export function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function formatDayShort(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  return `${WD[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}`;
}

export function formatDayLabel(dateStr, todayStr) {
  if (dateStr === todayStr) return 'Today';
  if (isValidDate(todayStr) && dateStr === addDays(todayStr, 1)) return 'Tomorrow';
  return formatDayShort(dateStr);
}

export function formatTime12(timeStr) {
  if (!isValidTime(timeStr)) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

// ---------------------------------------------------------------- people

export function getPeople(data) {
  return [
    ...((data && data.adults) || []).map(a => ({ ...a, role: 'adult' })),
    ...((data && data.kids) || []).map(k => ({ ...k, role: 'child' }))
  ];
}

export function adultNames(data) {
  return ((data && data.adults) || []).map(a => a.name);
}

/** Map free text ("me", "jack", "Dr") to a canonical household member name, or undefined. */
export function resolvePerson(data, name, senderName) {
  if (!name || typeof name !== 'string') return undefined;
  const n = name.trim().toLowerCase();
  if (!n) return undefined;
  if (['me', 'my', 'myself', 'i'].includes(n)) return senderName || undefined;
  const people = getPeople(data);
  const exact = people.find(p => (p.name || '').toLowerCase() === n);
  if (exact) return exact.name;
  const first = people.filter(p => (p.name || '').toLowerCase().split(/\s+/)[0] === n);
  if (first.length === 1) return first[0].name;
  return undefined;
}

/** Should an item assigned to `itemPerson` be shown to the adult `personName`? */
export function relevantTo(itemPerson, personName, data) {
  if (!itemPerson || !personName) return true;
  if (itemPerson === personName) return true;
  // Other adults' personal items stay private to them; kids' and household items go to every parent.
  return !adultNames(data).includes(itemPerson);
}

/** Which linked accounts should receive a message about `itemPerson`? */
export function recipientsFor(itemPerson, links, data) {
  const active = (links || []).filter(l => l.active !== false);
  if (itemPerson && adultNames(data).includes(itemPerson)) {
    const own = active.filter(l => l.person_name === itemPerson);
    if (own.length) return own;
  }
  return active;
}

function uid(prefix) {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------------------------------------------------------------- agenda / brief

function eventCoversDay(e, day) {
  if (!e || !e.startDate) return false;
  const end = e.endDate && e.endDate >= e.startDate ? e.endDate : e.startDate;
  return e.startDate <= day && day <= end;
}

function sortEvents(a, b) {
  return (a.startTime || '00:00').localeCompare(b.startTime || '00:00') || (a.title || '').localeCompare(b.title || '');
}

function eventLine(e) {
  const when = e.startTime ? formatTime12(e.startTime) : 'All day';
  return `• ${when} — ${e.title}${e.kidName ? ` (${e.kidName})` : ''}`;
}

function taskLine(t) {
  const flag = t.priority === 'high' ? ' ❗' : '';
  return `• ${t.title}${t.kidName ? ` (${t.kidName})` : ''}${flag}`;
}

/** Text agenda for `days` days starting at `fromDate`, optionally filtered for one adult. */
export function agenda(data, { fromDate, days = 1, personName }) {
  const events = (data.events || []).filter(e => relevantTo(e.kidName, personName, data));
  const out = [];
  for (let i = 0; i < days; i++) {
    const day = addDays(fromDate, i);
    const list = events.filter(e => eventCoversDay(e, day)).sort(sortEvents);
    if (list.length) {
      out.push(`${formatDayLabel(day, fromDate)}`);
      list.forEach(e => out.push(eventLine(e)));
      out.push('');
    }
  }
  if (!out.length) return days === 1 ? 'Nothing scheduled.' : 'Nothing scheduled in that period.';
  return out.join('\n').trim();
}

function openTasksFor(data, personName, today) {
  return (data.tasks || [])
    .filter(t => !t.completed && relevantTo(t.kidName, personName, data))
    .filter(t => (t.dueDate && t.dueDate <= today) || t.dueLabel === 'Today' || t.priority === 'high')
    .slice(0, 8);
}

/** Morning brief text for one adult, or null if there is nothing worth sending. */
export function buildBrief(data, { now, tz = DEFAULT_TZ, personName }) {
  const lp = localParts(now, tz);
  const today = lp.date;
  const events = (data.events || [])
    .filter(e => relevantTo(e.kidName, personName, data) && eventCoversDay(e, today))
    .sort(sortEvents);
  const tomorrow = addDays(today, 1);
  const tomorrowEvents = (data.events || [])
    .filter(e => relevantTo(e.kidName, personName, data) && eventCoversDay(e, tomorrow))
    .sort(sortEvents)
    .slice(0, 3);
  const tasks = openTasksFor(data, personName, today);
  if (!events.length && !tasks.length && !tomorrowEvents.length) return null;

  const lines = [`Good morning${personName ? ' ' + personName : ''} ☀️  ${formatDayShort(today)}`, ''];
  if (events.length) { lines.push('Today'); events.forEach(e => lines.push(eventLine(e))); lines.push(''); }
  if (tasks.length) { lines.push('To do'); tasks.forEach(t => lines.push(taskLine(t))); lines.push(''); }
  if (tomorrowEvents.length) { lines.push('Tomorrow'); tomorrowEvents.forEach(e => lines.push(eventLine(e))); lines.push(''); }
  lines.push('Reply here to add or change anything.');
  return lines.join('\n');
}

// ---------------------------------------------------------------- due reminders

/**
 * Reminders that should be sent now. Idempotent via the `key` (the caller dedupes against assistant_sent).
 * - timed events: once, from 60 minutes before the start until the start
 * - birthdays: once, from 6pm the evening before
 * - tasks with `remindAt`: once, from that moment for up to 24 hours
 */
export function computeDueReminders(data, { now, tz = DEFAULT_TZ }) {
  const out = [];
  const t = now.getTime();

  for (const e of data.events || []) {
    if (!e || !isValidDate(e.startDate)) continue;
    if (e.startTime && isValidTime(e.startTime)) {
      const start = localToUtc(e.startDate, e.startTime, tz).getTime();
      if (t >= start - 60 * 60000 && t < start) {
        const mins = Math.max(1, Math.round((start - t) / 60000));
        out.push({
          key: `ev:${e.id}:${e.startDate}:${e.startTime}`,
          personName: e.kidName,
          text: `⏰ ${e.title}${e.kidName ? ` (${e.kidName})` : ''} starts at ${formatTime12(e.startTime)} — in about ${mins} min${e.notes ? `\n${e.notes}` : ''}`
        });
      }
    } else if (e.kind === 'birthday') {
      const eve = localToUtc(addDays(e.startDate, -1), '18:00', tz).getTime();
      const dayStart = localToUtc(e.startDate, '00:00', tz).getTime();
      if (t >= eve && t < dayStart) {
        out.push({ key: `bd:${e.id}:${e.startDate}`, personName: e.kidName, text: `🎂 Tomorrow: ${e.title}` });
      }
    }
  }

  for (const k of data.tasks || []) {
    if (!k || k.completed || !k.remindAt) continue;
    const at = new Date(k.remindAt).getTime();
    if (Number.isNaN(at)) continue;
    if (t >= at && t < at + 24 * 3600000) {
      out.push({ key: `tk:${k.id}:${k.remindAt}`, personName: k.kidName, text: `⏰ Reminder: ${k.title}` });
    }
  }
  return out;
}

// ---------------------------------------------------------------- tools for the model

export const TOOLS = [
  {
    name: 'add_event',
    description: 'Add a calendar event or appointment for a specific date (and optional time).',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        date: { type: 'string', description: 'YYYY-MM-DD in the family time zone' },
        start_time: { type: 'string', description: 'HH:MM 24h, optional' },
        end_time: { type: 'string', description: 'HH:MM 24h, optional' },
        person: { type: 'string', description: 'Household member this is for, or "me"; omit if for the whole household' },
        kind: { type: 'string', enum: ['event', 'appointment', 'birthday'] },
        notes: { type: 'string' }
      },
      required: ['title', 'date']
    }
  },
  {
    name: 'add_task',
    description: 'Add a to-do item, optionally with a due date.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        due_date: { type: 'string', description: 'YYYY-MM-DD, optional' },
        person: { type: 'string', description: 'Household member, or "me"; omit if for the whole household' },
        priority: { type: 'string', enum: ['high', 'medium', 'low'] }
      },
      required: ['title']
    }
  },
  {
    name: 'add_reminder',
    description: 'Set a reminder that will be messaged at an exact local date and time.',
    input_schema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        when: { type: 'string', description: 'Local date and time, YYYY-MM-DDTHH:MM' },
        person: { type: 'string', description: 'Who to remind; defaults to the sender' }
      },
      required: ['text', 'when']
    }
  },
  {
    name: 'complete_task',
    description: 'Mark an open to-do as done. Use words from its title.',
    input_schema: {
      type: 'object',
      properties: { title_match: { type: 'string' } },
      required: ['title_match']
    }
  },
  {
    name: 'list_agenda',
    description: 'Show what is coming up.',
    input_schema: {
      type: 'object',
      properties: {
        range: { type: 'string', enum: ['today', 'tomorrow', 'week'] },
        person: { type: 'string', description: 'Optional household member filter, or "me"' }
      },
      required: ['range']
    }
  }
];

export function buildSystemPrompt(data, { now, tz = DEFAULT_TZ, senderName }) {
  const lp = localParts(now, tz);
  const people = getPeople(data)
    .map(p => `${p.name} (${p.role}${p.role === 'child' && p.age ? ', ' + p.age : ''})`)
    .join(', ') || 'none listed';
  return [
    `You are Nestly, a concise personal assistant for the ${data.familyName || 'family'} household, chatting over a messaging app.`,
    `Household members: ${people}.`,
    `The person messaging you is ${senderName || 'a parent'}. "me"/"my" means ${senderName || 'the sender'}.`,
    `Right now it is ${lp.weekday} ${lp.date} ${lp.time} in ${tz}. Resolve relative dates ("tomorrow", "Friday") against this.`,
    'Use the tools to add events, tasks and reminders, complete tasks, or list the agenda. Tools change the shared family app instantly.',
    'If a date or time is genuinely ambiguous or missing for a reminder, ask one short clarifying question instead of guessing.',
    'For small talk or questions you can answer without tools, reply in one or two short sentences. Never invent events or tasks.'
  ].join('\n');
}

// ---------------------------------------------------------------- apply a tool call to the data blob

function clean(s, max) {
  return String(s || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

/**
 * Apply one tool call. Pure: returns { data, reply, changed } without mutating the input.
 * ctx: { now: Date, tz: string, senderName?: string }
 */
export function applyAction(data, name, input, ctx) {
  const tz = ctx.tz || DEFAULT_TZ;
  const lp = localParts(ctx.now, tz);
  const today = lp.date;
  input = input || {};

  if (name === 'add_event') {
    const title = clean(input.title, 120);
    if (!title) return { data, reply: 'What should I call the event?', changed: false };
    if (!isValidDate(input.date)) return { data, reply: `I couldn't work out the date for "${title}". What day is it on?`, changed: false };
    const startTime = isValidTime(input.start_time) ? input.start_time : undefined;
    const endTime = isValidTime(input.end_time) ? input.end_time : undefined;
    const person = resolvePerson(data, input.person, ctx.senderName);
    const kind = ['event', 'appointment', 'birthday'].includes(input.kind) ? input.kind : 'event';
    const ev = {
      id: uid('e'), title, startDate: input.date, startTime, endTime,
      kidName: person, kind, notes: clean(input.notes, 300) || undefined,
      source: 'manual', createdVia: 'assistant'
    };
    const next = { ...data, events: [...(data.events || []), ev] };
    const when = `${formatDayLabel(input.date, today)}${startTime ? ', ' + formatTime12(startTime) : ''}`;
    return { data: next, reply: `Added: ${title} — ${when}${person ? ` (${person})` : ''}`, changed: true };
  }

  if (name === 'add_task') {
    const title = clean(input.title, 140);
    if (!title) return { data, reply: 'What is the task?', changed: false };
    const due = isValidDate(input.due_date) ? input.due_date : undefined;
    const person = resolvePerson(data, input.person, ctx.senderName);
    const task = {
      id: uid('t'), title, kidName: person,
      priority: ['high', 'medium', 'low'].includes(input.priority) ? input.priority : 'medium',
      completed: false, source: 'Assistant', createdVia: 'assistant',
      dueDate: due, dueLabel: due ? formatDayLabel(due, today) : 'Anytime'
    };
    const next = { ...data, tasks: [...(data.tasks || []), task] };
    return { data: next, reply: `Added to-do: ${title}${due ? ` — due ${formatDayLabel(due, today)}` : ''}${person ? ` (${person})` : ''}`, changed: true };
  }

  if (name === 'add_reminder') {
    const text = clean(input.text, 140);
    const m = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})$/.exec(String(input.when || ''));
    if (!text) return { data, reply: 'What should I remind you about?', changed: false };
    if (!m || !isValidDate(m[1]) || !isValidTime(m[2])) {
      return { data, reply: `When should I remind you about "${text}"? (e.g. tomorrow 3pm)`, changed: false };
    }
    const at = localToUtc(m[1], m[2], tz);
    if (at.getTime() < ctx.now.getTime() - 60000) {
      return { data, reply: `That time has already passed. When should I remind you about "${text}"?`, changed: false };
    }
    const person = resolvePerson(data, input.person, ctx.senderName) || ctx.senderName || undefined;
    const task = {
      id: uid('t'), title: text, kidName: person, priority: 'medium', completed: false,
      source: 'Assistant', createdVia: 'assistant',
      dueDate: m[1], dueTime: m[2], remindAt: at.toISOString(),
      dueLabel: `${formatDayLabel(m[1], today)} ${formatTime12(m[2])}`
    };
    const next = { ...data, tasks: [...(data.tasks || []), task] };
    return { data: next, reply: `Reminder set: ${text} — ${task.dueLabel}${person ? ` (${person})` : ''}`, changed: true };
  }

  if (name === 'complete_task') {
    const q = clean(input.title_match, 100).toLowerCase();
    if (!q) return { data, reply: 'Which task?', changed: false };
    const open = (data.tasks || []).filter(t => !t.completed && (t.title || '').toLowerCase().includes(q));
    if (open.length === 0) return { data, reply: `I couldn't find an open task matching "${q}".`, changed: false };
    if (open.length > 1) {
      return { data, reply: `Which one?\n${open.slice(0, 5).map(t => '• ' + t.title).join('\n')}`, changed: false };
    }
    const id = open[0].id;
    const next = {
      ...data,
      tasks: data.tasks.map(t => t.id === id ? { ...t, completed: true, completedAt: ctx.now.toISOString() } : t)
    };
    return { data: next, reply: `Done: ${open[0].title}`, changed: true };
  }

  if (name === 'list_agenda') {
    const person = resolvePerson(data, input.person, ctx.senderName) || ctx.senderName;
    const range = input.range;
    if (range === 'week') return { data, reply: agenda(data, { fromDate: today, days: 7, personName: person }), changed: false };
    const from = range === 'tomorrow' ? addDays(today, 1) : today;
    const body = agenda(data, { fromDate: from, days: 1, personName: person });
    const tasks = range === 'tomorrow' ? [] : openTasksFor(data, person, today);
    const parts = [`${range === 'tomorrow' ? 'Tomorrow' : 'Today'}\n${body}`];
    if (tasks.length) parts.push('To do\n' + tasks.map(taskLine).join('\n'));
    return { data, reply: parts.join('\n\n'), changed: false };
  }

  return { data, reply: "I can add events, to-dos and reminders, or tell you what's on. What would you like?", changed: false };
}
