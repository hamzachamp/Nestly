import test from 'node:test';
import assert from 'node:assert/strict';
import {
  localParts, localToUtc, addDays, isValidDate, formatTime12, formatDayLabel,
  resolvePerson, recipientsFor, relevantTo, applyAction, computeDueReminders, buildBrief, agenda, buildSystemPrompt, TOOLS
} from '../supabase/functions/_shared/core.js';

const TZ = 'Australia/Sydney';
// Thu 22 Oct 2026, 08:00 in Sydney (AEDT, UTC+11) = Wed 21 Oct 21:00 UTC
const NOW = new Date('2026-10-21T21:00:00Z');

const data = () => ({
  initialized: true,
  familyName: 'Test Family',
  adults: [{ id: 'a1', name: 'Hamza' }, { id: 'a2', name: 'Sam' }],
  kids: [{ id: 'k1', name: 'Emma', age: 8 }, { id: 'k2', name: 'Jack', age: 5 }],
  events: [],
  tasks: []
});

test('timezone: Sydney wall clock <-> UTC across DST', () => {
  assert.equal(localToUtc('2026-10-22', '08:00', TZ).toISOString(), '2026-10-21T21:00:00.000Z'); // AEDT +11
  assert.equal(localToUtc('2026-07-01', '08:00', TZ).toISOString(), '2026-06-30T22:00:00.000Z'); // AEST +10
  const lp = localParts(NOW, TZ);
  assert.deepEqual([lp.date, lp.time, lp.weekday], ['2026-10-22', '08:00', 'Thu']);
});

test('date helpers', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(isValidDate('2026-02-30'), false);
  assert.equal(isValidDate('2026-10-22'), true);
  assert.equal(formatTime12('00:05'), '12:05 am');
  assert.equal(formatTime12('16:00'), '4:00 pm');
  assert.equal(formatDayLabel('2026-10-23', '2026-10-22'), 'Tomorrow');
  assert.equal(formatDayLabel('2026-10-28', '2026-10-22'), 'Wed 28 Oct');
});

test('resolvePerson handles me, case and first names', () => {
  const d = data();
  assert.equal(resolvePerson(d, 'me', 'Hamza'), 'Hamza');
  assert.equal(resolvePerson(d, 'jack', 'Hamza'), 'Jack');
  assert.equal(resolvePerson(d, 'Nobody', 'Hamza'), undefined);
});

test('add_event creates a manual-source event for an adult or child', () => {
  const r = applyAction(data(), 'add_event', { title: 'Dentist', date: '2026-10-27', start_time: '16:00', person: 'jack' }, { now: NOW, tz: TZ, senderName: 'Hamza' });
  assert.equal(r.changed, true);
  assert.equal(r.data.events.length, 1);
  assert.equal(r.data.events[0].kidName, 'Jack');
  assert.equal(r.data.events[0].source, 'manual');
  assert.match(r.reply, /Tue 27 Oct, 4:00 pm \(Jack\)/);
});

test('add_event rejects a bad date without changing data', () => {
  const d = data();
  const r = applyAction(d, 'add_event', { title: 'X', date: 'next friday' }, { now: NOW, tz: TZ });
  assert.equal(r.changed, false);
  assert.equal(r.data, d);
});

test('add_reminder stores a UTC remindAt and defaults to the sender', () => {
  const r = applyAction(data(), 'add_reminder', { text: 'Call the school', when: '2026-10-22T15:00' }, { now: NOW, tz: TZ, senderName: 'Hamza' });
  assert.equal(r.changed, true);
  const t = r.data.tasks[0];
  assert.equal(t.remindAt, '2026-10-22T04:00:00.000Z');
  assert.equal(t.kidName, 'Hamza');
  assert.match(r.reply, /Today 3:00 pm/);
});

test('add_reminder in the past is refused', () => {
  const r = applyAction(data(), 'add_reminder', { text: 'x', when: '2026-10-22T07:00' }, { now: NOW, tz: TZ });
  assert.equal(r.changed, false);
  assert.match(r.reply, /already passed/);
});

test('complete_task: one match completes, many matches asks', () => {
  let d = data();
  d.tasks = [
    { id: 't1', title: 'Pay Jack term fees', completed: false },
    { id: 't2', title: 'Pay car rego', completed: false }
  ];
  const ambiguous = applyAction(d, 'complete_task', { title_match: 'pay' }, { now: NOW, tz: TZ });
  assert.equal(ambiguous.changed, false);
  assert.match(ambiguous.reply, /Which one/);
  const one = applyAction(d, 'complete_task', { title_match: 'rego' }, { now: NOW, tz: TZ });
  assert.equal(one.changed, true);
  assert.equal(one.data.tasks.find(t => t.id === 't2').completed, true);
  assert.equal(d.tasks.find(t => t.id === 't2').completed, false, 'input must not be mutated');
});

test('privacy: another adult\'s personal items are not shown; kids and household items are', () => {
  const d = data();
  assert.equal(relevantTo('Sam', 'Hamza', d), false);
  assert.equal(relevantTo('Jack', 'Hamza', d), true);
  assert.equal(relevantTo(undefined, 'Hamza', d), true);
  assert.equal(relevantTo('Hamza', 'Hamza', d), true);
});

test('recipients: adult item goes to that adult only; kid/household items go to all', () => {
  const d = data();
  const links = [
    { id: 'l1', person_name: 'Hamza', active: true },
    { id: 'l2', person_name: 'Sam', active: true },
    { id: 'l3', person_name: 'Old', active: false }
  ];
  assert.deepEqual(recipientsFor('Sam', links, d).map(l => l.id), ['l2']);
  assert.deepEqual(recipientsFor('Jack', links, d).map(l => l.id), ['l1', 'l2']);
  assert.deepEqual(recipientsFor(undefined, links, d).map(l => l.id), ['l1', 'l2']);
  // adult with no linked account falls back to everyone rather than dropping the reminder
  assert.deepEqual(recipientsFor('Hamza', [{ id: 'l2', person_name: 'Sam' }], d).map(l => l.id), ['l2']);
});

test('due reminders: timed event fires only inside the 60 minute window', () => {
  const d = data();
  d.events = [{ id: 'e1', title: 'Soccer', startDate: '2026-10-22', startTime: '09:00', kidName: 'Jack' }];
  assert.equal(computeDueReminders(d, { now: NOW, tz: TZ }).length, 1); // 08:00 local, 60 min before
  assert.equal(computeDueReminders(d, { now: new Date('2026-10-21T20:30:00Z'), tz: TZ }).length, 0); // 07:30 local
  assert.equal(computeDueReminders(d, { now: new Date('2026-10-21T22:00:00Z'), tz: TZ }).length, 0); // 09:00 local: started
});

test('due reminders: task remindAt fires once it is due and expires after 24h', () => {
  const d = data();
  d.tasks = [{ id: 't1', title: 'Call school', remindAt: '2026-10-21T21:00:00.000Z', kidName: 'Hamza', completed: false }];
  assert.equal(computeDueReminders(d, { now: new Date('2026-10-21T20:59:00Z'), tz: TZ }).length, 0);
  assert.equal(computeDueReminders(d, { now: NOW, tz: TZ }).length, 1);
  assert.equal(computeDueReminders(d, { now: new Date('2026-10-23T00:00:00Z'), tz: TZ }).length, 0);
  d.tasks[0].completed = true;
  assert.equal(computeDueReminders(d, { now: NOW, tz: TZ }).length, 0);
});

test('due reminders: birthday reminder from 6pm the evening before', () => {
  const d = data();
  d.events = [{ id: 'b1', title: "Jack's birthday", startDate: '2026-10-23', kind: 'birthday', kidName: 'Jack' }];
  assert.equal(computeDueReminders(d, { now: new Date('2026-10-22T06:59:00Z'), tz: TZ }).length, 0); // 17:59 local
  assert.equal(computeDueReminders(d, { now: new Date('2026-10-22T07:00:00Z'), tz: TZ }).length, 1); // 18:00 local
  assert.equal(computeDueReminders(d, { now: new Date('2026-10-22T13:00:00Z'), tz: TZ }).length, 0); // after midnight
});

test('morning brief: personalised, hides other adult items, null when empty', () => {
  const d = data();
  assert.equal(buildBrief(d, { now: NOW, tz: TZ, personName: 'Hamza' }), null);
  d.events = [
    { id: 'e1', title: 'Dance recital', startDate: '2026-10-22', startTime: '15:00', kidName: 'Jack' },
    { id: 'e2', title: 'Sam board meeting', startDate: '2026-10-22', startTime: '10:00', kidName: 'Sam' }
  ];
  d.tasks = [{ id: 't1', title: 'Pay fees', priority: 'high', completed: false, kidName: 'Emma' }];
  const brief = buildBrief(d, { now: NOW, tz: TZ, personName: 'Hamza' });
  assert.match(brief, /Good morning Hamza/);
  assert.match(brief, /Thu 22 Oct/);
  assert.match(brief, /3:00 pm — Dance recital \(Jack\)/);
  assert.doesNotMatch(brief, /board meeting/);
  assert.match(brief, /Pay fees/);
});

test('agenda week view groups by day', () => {
  const d = data();
  d.events = [
    { id: 'e1', title: 'A', startDate: '2026-10-22', startTime: '09:00' },
    { id: 'e2', title: 'B', startDate: '2026-10-24' }
  ];
  const text = agenda(d, { fromDate: '2026-10-22', days: 7 });
  assert.match(text, /Today\n• 9:00 am — A/);
  assert.match(text, /Sat 24 Oct\n• All day — B/);
});

test('system prompt names household and local time; tools are well-formed', () => {
  const p = buildSystemPrompt(data(), { now: NOW, tz: TZ, senderName: 'Hamza' });
  assert.match(p, /Hamza \(adult\)/);
  assert.match(p, /Jack \(child, 5\)/);
  assert.match(p, /Thu 2026-10-22 08:00/);
  for (const t of TOOLS) {
    assert.ok(t.name && t.description && t.input_schema.type === 'object');
    for (const r of t.input_schema.required) assert.ok(t.input_schema.properties[r], `${t.name}.${r}`);
  }
});
