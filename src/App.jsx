import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Home, Inbox as InboxIcon, ChefHat, MessageCircle, Settings, Plus, X, Sparkles, ChevronRight, Check, Send, AlertCircle, Calendar, Coffee, Trash2, Users, RotateCw, Wand2, Sun, MapPin, CalendarDays, Download, Edit2 } from 'lucide-react';

// --- Supabase client (auto-falls-back to localStorage if env vars not set) ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

const STORAGE_KEY = 'family-coo-v1';

const DEMO_DATA = {
  initialized: true,
  familyName: "The Champion Family",
  kids: [
    { id: 'k1', name: 'Batul', age: 8, school: 'Tallawong Primary', allergies: 'Tree nuts', picky: 'No tomatoes; loves pasta and rice', interests: 'Reading, art, badminton, swimming', colour: 'coral' },
    { id: 'k2', name: 'Insiyah', age: 5, school: 'Tallawong Primary', allergies: 'None', picky: "Won't eat anything visibly green; loves chicken", interests: 'Dance, music, LEGO, drawing', colour: 'sage' }
  ],
  tasks: [
    { id: 't1', title: "Sign Batul's excursion permission slip", dueLabel: 'Today', kidName: 'Batul', priority: 'high', completed: false, source: 'Tallawong Primary' },
    { id: 't2', title: "Pack Insiyah's dance kit for Saturday", dueLabel: 'Fri', kidName: 'Insiyah', priority: 'medium', completed: false, source: 'Manual' },
    { id: 't3', title: "Pay Insiyah's term fees", dueLabel: 'Wed', kidName: 'Insiyah', priority: 'high', completed: false, source: 'Tallawong Primary' },
    { id: 't4', title: "Book-week costume for Batul", dueLabel: 'Next Mon', kidName: 'Batul', priority: 'medium', completed: false, source: 'Tallawong Primary' },
    { id: 't5', title: "Reschedule Batul's dental check-up", dueLabel: 'This week', kidName: 'Batul', priority: 'low', completed: false, source: 'Manual' }
  ],
  mealPlan: null,
  inbox: [],
  chats: [],
  events: [
    { id: 'e1', title: "Insiyah's dance recital", startDate: '2026-06-14', startTime: '15:00', endTime: '17:00', kidName: 'Insiyah', kind: 'event', notes: 'Year-end performance, school hall' },
    { id: 'e2', title: 'Parent-teacher interview', startDate: '2026-06-19', startTime: '17:30', endTime: '18:00', kidName: 'Batul', kind: 'appointment', notes: 'Mr Singh, Year 2 classroom' },
    { id: 'e3', title: "Eli's 7th birthday party", startDate: '2026-06-21', startTime: '11:00', endTime: '13:00', kidName: 'Batul', kind: 'event', notes: 'Sky Zone Castle Hill — pizza lunch' },
    { id: 'e4', title: "Batul's 9th birthday", startDate: '2026-08-22', kidName: 'Batul', kind: 'birthday', notes: 'Plan party 2 weeks ahead' },
    { id: 'e5', title: "Insiyah's 6th birthday", startDate: '2026-11-12', kidName: 'Insiyah', kind: 'birthday' }
  ],
  // Pre-populated with REAL Sydney holiday programs for July 2026 winter break (6-17 July).
  // Demonstrates the search result experience instantly when demo data loads.
  // For non-demo searches, the live AI flow takes over.
  holidayPlan: {
    forKidId: 'k1',
    startDate: '2026-07-06',
    endDate: '2026-07-17',
    location: 'Tallawong, NSW',
    budget: 350,
    saved: [],
    searchedAt: new Date().toISOString(),
    programs: [
      {
        id: 'real-1',
        name: 'Learn to Swim Holiday Program',
        provider: 'Sydney Olympic Park Aquatic Centre',
        type: 'sports',
        ageRange: '5-12 years',
        schedule: 'Mon-Fri, intensive daily sessions',
        weeks: 'Both weeks (6-17 July)',
        costPerWeek: 195,
        distanceKm: 24,
        fitReason: "Direct hit on Batul's swimming interest. AUSTSWIM-qualified instructors run intensive holiday clinics — fast-track skill building over 5 days.",
        bookingHint: 'sydneyolympicpark.nsw.gov.au — book by week'
      },
      {
        id: 'real-2',
        name: 'Archery for 7-9 year olds',
        provider: 'Sydney Olympic Park Archery Centre',
        type: 'sports',
        ageRange: '7-9 years',
        schedule: 'Session-based (1-1.5 hrs)',
        weeks: 'Both weeks, multiple dates',
        costPerWeek: 85,
        distanceKm: 24,
        fitReason: "Targeted at Batul's exact age band. New sport that transfers focus and patience from badminton. Single sessions fit around other programs.",
        bookingHint: 'sydneyolympicpark.nsw.gov.au — individual sessions'
      },
      {
        id: 'real-3',
        name: 'Coding Camp — Beginner Track',
        provider: 'Code Camp Australia',
        type: 'stem',
        ageRange: '5-13 years (split by skill)',
        schedule: 'Mon-Fri 9:30am-3:30pm',
        weeks: '3-day in-person workshop',
        costPerWeek: 281,
        distanceKm: 12,
        fitReason: "Expands beyond Batul's current art/sport interests into creative tech. Drag-and-drop coding to build her own game — keeps the project. Closest venues: Castle Hill, Parramatta.",
        bookingHint: 'codecamp.com.au — choose Sydney West venue'
      },
      {
        id: 'real-4',
        name: 'July Holiday English Course',
        provider: 'Matrix Education',
        type: 'academic',
        ageRange: 'Years 3-12',
        schedule: '4, 5 or 9 days available',
        weeks: 'Week 1 or Week 2',
        costPerWeek: 450,
        distanceKm: 18,
        fitReason: "Builds on Batul's strong reading. Matrix's evidence-based literacy work covers comprehension and writing — pre-Term 3 head start.",
        bookingHint: 'matrix.edu.au/holiday-courses'
      },
      {
        id: 'real-5',
        name: 'Multi-Sport, Art & Mini Olympics',
        provider: 'PCYC Mount Druitt',
        type: 'mixed',
        ageRange: '5-13 years',
        schedule: '9am-3pm (drop-off from 8am, pick-up to 4pm)',
        weeks: 'Both weeks · book 3 days get 4th free',
        costPerWeek: 220,
        distanceKm: 9,
        fitReason: "Closest premium program to Tallawong. Mixed sport days plus arts and crafts cover both Batul's art and badminton interests in one venue. Accepts Active Kids voucher (-$100).",
        bookingHint: 'pcycnsw.org.au/mount-druitt'
      },
      {
        id: 'real-6',
        name: 'Junior Tennis Holiday Clinic',
        provider: 'Blacktown Tennis Centre Stanhope',
        type: 'sports',
        ageRange: '5-12 years',
        schedule: 'Multiple sessions across the holidays',
        weeks: 'Both weeks; flexible',
        costPerWeek: 165,
        distanceKm: 4,
        fitReason: "Closest of any option — 4km from home. Racket-sport movement transfers directly from Batul's badminton; skills cross over fast. Friendly intro environment.",
        bookingHint: 'blacktown.nsw.gov.au — Stanhope Tennis Centre'
      },
      {
        id: 'real-7',
        name: 'KEL Vacation Care',
        provider: 'Blacktown City Council — Kids Early Learning',
        type: 'mixed',
        ageRange: '5-12 years',
        schedule: '8am-6pm — full working-day cover',
        weeks: 'Both weeks',
        costPerWeek: 175,
        distanceKm: 6,
        fitReason: "Budget backstop with council-run quality. Arts, drama, literacy, team games — covers Batul's art interest plus full-day care when you need it. Cheapest reliable option.",
        bookingHint: 'blacktown.nsw.gov.au/Vacation-Care'
      },
      {
        id: 'real-8',
        name: 'Dive into Diving',
        provider: 'Sydney Olympic Park Aquatic Centre',
        type: 'sports',
        ageRange: '8+ years',
        schedule: '6-17 July, daily slots',
        weeks: 'Both weeks',
        costPerWeek: 95,
        distanceKm: 24,
        fitReason: "Natural extension of Batul's swimming on the world-class SOPAC diving platform. Pair with the swim program same day for a full SOPAC day — big confidence boost.",
        bookingHint: 'sydneyolympicpark.nsw.gov.au — diving sessions'
      }
    ]
  }
};

const SAMPLE_EMAIL = `From: Tallawong Primary <admin@tallawongps.nsw.edu.au>
Subject: Year 2 Excursion — Taronga Zoo — Permission required by Friday

Dear Parents/Carers,

Year 2 will visit Taronga Zoo on Tuesday 24 June. Cost: $42 per student. Permission slips and payment must be returned by this Friday 13 June.

Please ensure your child brings:
- Recess and a packed lunch (no nuts please)
- Refillable water bottle
- School hat (mandatory)
- Closed shoes

Also a reminder: Book Week is the following week (17-21 June). Students are encouraged to dress as their favourite book character on Wednesday 18 June.

Kind regards,
Mrs. Patel
Year 2 Coordinator`;

// --- Claude API helper ---
// Reads your API key from .env (VITE_ANTHROPIC_API_KEY=sk-ant-...)
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;
const CLAUDE_MODEL = 'claude-sonnet-4-6'; // current Sonnet. Swap to 'claude-opus-4-7' for higher quality, or 'claude-haiku-4-5-20251001' for cheaper/faster.

async function callClaude(systemPrompt, userPrompt) {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('Missing VITE_ANTHROPIC_API_KEY. Create a .env file at the project root.');
  }
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true"
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
  });
  if (!response.ok) {
    const txt = await response.text().catch(() => '');
    throw new Error('API error ' + response.status + ': ' + txt);
  }
  const data = await response.json();
  return data.content.map(c => c.text || '').join('').trim();
}

function extractJSON(text) {
  // strip markdown fences and find JSON
  let s = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  return JSON.parse(s);
}

// Mock Gmail inbox parameterised on the family.
// Prototype: simulates what real Gmail OAuth sync surfaces.
function generateMockEmails(kids, familyName) {
  if (!kids || kids.length === 0) return [];
  const lastName = (familyName || '').replace(/^The\s+/i, '').replace(/\s+Family$/i, '').trim() || 'Family';
  const k = kids;
  const now = Date.now();
  const hours = (h) => new Date(now - h * 3600 * 1000).toISOString();
  const emails = [];
  if (k[0]) emails.push({
    id: 'gm-1',
    from: (k[0].school || 'Primary School') + ' <admin@school.edu.au>',
    subject: k[0].name + "'s class excursion — permission slip due Friday",
    preview: 'Dear ' + lastName + ' Family, ' + k[0].name + "'s class will be visiting Taronga Zoo. Cost $42, permission required by Friday…",
    body: 'Dear ' + lastName + " Family,\n\n" + k[0].name + "'s class will be visiting Taronga Zoo on Tuesday 24 June. The cost is $42 per student and permission slips must be returned by this Friday 13 June.\n\nNo nuts in lunches. Closed shoes and school hat are mandatory.\n\nKind regards,\nMrs Patel",
    receivedAt: hours(2),
    kidName: k[0].name,
    triaged: false
  });
  if (k[1]) emails.push({
    id: 'gm-2',
    from: 'Western Sydney Junior Soccer <noreply@wsjs.com.au>',
    subject: k[1].name + ' — Term 3 fees overdue ($165)',
    preview: "Just a reminder that " + k[1].name + "'s Term 3 soccer fees ($165) are now 5 days overdue. Please settle by Friday…",
    body: "Hi,\n\nJust a friendly reminder that " + k[1].name + "'s Term 3 soccer fees ($165) are now 5 days overdue. Please settle by Friday to avoid suspension from Saturday's game.\n\nPayment link: wsjs.com.au/pay\n\nThanks,\nWSJS Admin",
    receivedAt: hours(8),
    kidName: k[1].name,
    triaged: false
  });
  if (k[0]) emails.push({
    id: 'gm-3',
    from: 'Sarah Mitchell <sarah.m@gmail.com>',
    subject: "Eli's 7th birthday — would " + k[0].name + ' like to come?',
    preview: "We're having Eli's 7th birthday at Sky Zone Castle Hill on Saturday 21 June at 11am. RSVP by Monday. Hope " + k[0].name + ' can make it…',
    body: "Hi,\n\nWe're having Eli's 7th birthday at Sky Zone Castle Hill on Saturday 21 June at 11am-1pm. Pizza lunch included. RSVP by next Monday.\n\nHope " + k[0].name + " can make it.\n\nSarah (Eli's mum)",
    receivedAt: hours(14),
    kidName: k[0].name,
    triaged: false
  });
  const healthKid = k[2] || k[0];
  if (healthKid) emails.push({
    id: 'gm-4',
    from: 'Tallawong Family Medical <reminders@tallawongmedical.com.au>',
    subject: 'Appointment reminder: ' + healthKid.name + ' — Wed 11 June 4:30pm',
    preview: "Reminder of " + healthKid.name + "'s appointment with Dr. Chen on Wednesday 11 June at 4:30pm…",
    body: 'This is a reminder of ' + healthKid.name + "'s appointment with Dr. Chen on Wednesday 11 June at 4:30pm. Please arrive 10 minutes early. Reply CANCEL to cancel.\n\nTallawong Family Medical",
    receivedAt: hours(20),
    kidName: healthKid.name,
    triaged: false
  });
  if (k[0]) emails.push({
    id: 'gm-5',
    from: (k[0].school || 'Primary School') + ' <library@school.edu.au>',
    subject: 'Book Week 17–21 June — dress-up day Wednesday',
    preview: 'Book Week is 17–21 June. Students are encouraged to dress as their favourite book character on Wednesday 18 June…',
    body: 'Dear Parents,\n\nBook Week is the week of 17–21 June. Students are encouraged to dress as their favourite book character on Wednesday 18 June.\n\nParade at 9am — parents welcome.\n\nMrs Andrews\nSchool Librarian',
    receivedAt: hours(28),
    kidName: null,
    triaged: false
  });
  if (k[2]) emails.push({
    id: 'gm-6',
    from: (k[2].school || 'Daycare') + ' <info@daycare.com.au>',
    subject: k[2].name + "'s Term 2 portfolio is ready — feedback by 30 June",
    preview: k[2].name + "'s Term 2 portfolio has been updated. Please log in to review and provide feedback by 30 June.",
    body: 'Hello,\n\n' + k[2].name + "'s Term 2 portfolio has been updated with photos and learning notes. Please log in to review and provide feedback by 30 June.\n\nWe also need updated emergency contact details by end of week.\n\nThanks,\nLittle Stars Team",
    receivedAt: hours(36),
    kidName: k[2].name,
    triaged: false
  });
  return emails;
}

// Kid colour palette — curated to harmonise with cream + terracotta/forest accents.
// Each colour has a strong hex (for borders/text) and a soft tint (for badges/backgrounds).
const KID_COLOURS = [
  { id: 'coral', name: 'Coral', hex: '#C26144', tint: '#F4E2DA' },
  { id: 'sage', name: 'Sage', hex: '#6A8265', tint: '#E0E8DE' },
  { id: 'slate', name: 'Slate', hex: '#4A6A7E', tint: '#DCE3E8' },
  { id: 'mustard', name: 'Mustard', hex: '#B89545', tint: '#EFE5CC' },
  { id: 'plum', name: 'Plum', hex: '#7A4B6B', tint: '#E5D8E0' },
  { id: 'rust', name: 'Rust', hex: '#A04E37', tint: '#EBD8D0' }
];

function getKidColour(kidName, kids) {
  if (!kidName || !kids) return null;
  const kid = kids.find(k => k.name === kidName);
  if (!kid) return null;
  if (kid.colour) {
    const found = KID_COLOURS.find(c => c.id === kid.colour);
    if (found) return found;
  }
  // Fallback: rotate by position
  const idx = kids.indexOf(kid);
  return KID_COLOURS[idx % KID_COLOURS.length];
}

// NSW 2026 school holidays + public holidays — surfaces on calendar automatically.
const NSW_2026 = [
  { id: 'sh-autumn', title: 'School holidays — Autumn', startDate: '2026-04-07', endDate: '2026-04-17', kind: 'school-holiday' },
  { id: 'sh-winter', title: 'School holidays — Winter', startDate: '2026-07-06', endDate: '2026-07-17', kind: 'school-holiday' },
  { id: 'sh-spring', title: 'School holidays — Spring', startDate: '2026-09-28', endDate: '2026-10-09', kind: 'school-holiday' },
  { id: 'sh-summer', title: 'School holidays — Summer', startDate: '2026-12-18', endDate: '2027-01-27', kind: 'school-holiday' },
  { id: 'ph-easter', title: 'Easter Monday', startDate: '2026-04-06', kind: 'public-holiday' },
  { id: 'ph-anzac', title: 'ANZAC Day (observed)', startDate: '2026-04-27', kind: 'public-holiday' },
  { id: 'ph-kings', title: "King's Birthday", startDate: '2026-06-08', kind: 'public-holiday' },
  { id: 'ph-labour', title: 'Labour Day', startDate: '2026-10-05', kind: 'public-holiday' },
  { id: 'ph-christmas', title: 'Christmas Day', startDate: '2026-12-25', kind: 'public-holiday' },
  { id: 'ph-boxing', title: 'Boxing Day', startDate: '2026-12-26', kind: 'public-holiday' }
];

// --- iCalendar (.ics) export ---
function formatICSDate(iso) {
  return iso.replace(/-/g, '');
}
function formatICSDateTime(date, time) {
  return formatICSDate(date) + 'T' + time.replace(':', '') + '00';
}
function escapeICS(s) {
  return (s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}
function generateICS(events, calendarName) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Family COO//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:' + escapeICS(calendarName || 'Family COO')
  ];
  events.forEach(e => {
    lines.push('BEGIN:VEVENT');
    lines.push('UID:' + e.id + '@familycoo.app');
    lines.push('DTSTAMP:' + stamp);
    if (e.startTime) {
      lines.push('DTSTART:' + formatICSDateTime(e.startDate, e.startTime));
      lines.push('DTEND:' + formatICSDateTime(e.endDate || e.startDate, e.endTime || e.startTime));
    } else {
      lines.push('DTSTART;VALUE=DATE:' + formatICSDate(e.startDate));
      // For all-day events DTEND is exclusive (next day after final day)
      const endIso = e.endDate || e.startDate;
      const endD = new Date(endIso + 'T00:00:00');
      endD.setDate(endD.getDate() + 1);
      lines.push('DTEND;VALUE=DATE:' + formatICSDate(endD.toISOString().slice(0, 10)));
    }
    lines.push('SUMMARY:' + escapeICS(e.title));
    if (e.notes) lines.push('DESCRIPTION:' + escapeICS(e.notes));
    if (e.kidName) lines.push('CATEGORIES:' + escapeICS(e.kidName));
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
function downloadICS(content, filename) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 200);
}

// =====================================================================
// MAIN APP
// =====================================================================
export default function App() {
  const [data, setData] = useState(null);
  const [view, setView] = useState('today');
  const [showSettings, setShowSettings] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Inject fonts
  useEffect(() => {
    const existing = document.getElementById('coo-fonts');
    if (existing) { setFontsReady(true); return; }
    const link = document.createElement('link');
    link.id = 'coo-fonts';
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400&family=DM+Sans:wght@300;400;500;600;700&display=swap';
    link.rel = 'stylesheet';
    link.onload = () => setFontsReady(true);
    document.head.appendChild(link);
    setTimeout(() => setFontsReady(true), 600);
  }, []);

  // Load Google Maps Places library (only if key is configured)
  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key) return;
    if (window.google?.maps?.places) return;
    if (document.getElementById('gmaps-script')) return;
    const script = document.createElement('script');
    script.id = 'gmaps-script';
    script.src = 'https://maps.googleapis.com/maps/api/js?key=' + key + '&libraries=places&loading=async';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  // Auth state — only active when Supabase is configured
  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return; }
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Load data: Supabase if signed in, localStorage otherwise
  useEffect(() => {
    if (authLoading) return;
    if (supabase && !session) { setData(null); return; }
    (async () => {
      try {
        if (supabase && session) {
          const { data: row, error } = await supabase
            .from('user_data')
            .select('data')
            .eq('user_id', session.user.id)
            .maybeSingle();
          if (error) throw error;
          if (row?.data && row.data.initialized) setData(row.data);
          else setData({ initialized: false });
        } else {
          const v = localStorage.getItem(STORAGE_KEY);
          if (v) setData(JSON.parse(v));
          else setData({ initialized: false });
        }
      } catch {
        setData({ initialized: false });
      }
    })();
  }, [session, authLoading]);

  // Persist data — debounced 500ms to avoid spamming Supabase on rapid edits
  useEffect(() => {
    if (!data?.initialized) return;
    const timer = setTimeout(async () => {
      try {
        if (supabase && session) {
          await supabase.from('user_data').upsert({
            user_id: session.user.id,
            data: data,
            updated_at: new Date().toISOString()
          });
        } else {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
      } catch (e) {
        console.error('Save failed:', e);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [data, session]);

  const baseFont = "'DM Sans', -apple-system, sans-serif";
  const displayFont = "'Fraunces', Georgia, serif";

  if (!fontsReady || authLoading) {
    return (
      <div style={{ background: '#FAF6EE', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: baseFont }}>
        <div style={{ fontFamily: displayFont, fontSize: 22, color: '#1A1612', fontStyle: 'italic', letterSpacing: '-0.01em' }}>One moment…</div>
      </div>
    );
  }

  // If Supabase is configured but no user is signed in, show auth screen
  if (supabase && !session) {
    return <AuthScreen displayFont={displayFont} baseFont={baseFont} />;
  }

  if (!data) {
    return (
      <div style={{ background: '#FAF6EE', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: baseFont }}>
        <div style={{ fontFamily: displayFont, fontSize: 22, color: '#1A1612', fontStyle: 'italic', letterSpacing: '-0.01em' }}>Setting things up…</div>
      </div>
    );
  }

  if (!data.initialized) {
    return <Onboarding onComplete={(d) => setData(d)} onDemo={() => setData(DEMO_DATA)} displayFont={displayFont} baseFont={baseFont} />;
  }

  return (
    <div style={{ background: '#FAF6EE', minHeight: '100vh', fontFamily: baseFont, color: '#1A1612', paddingBottom: 88 }}>
      <Header familyName={data.familyName} onSettings={() => setShowSettings(true)} displayFont={displayFont} />
      <main style={{ maxWidth: 640, margin: '0 auto', padding: '0 20px' }}>
        {view === 'today' && <TodayView data={data} setData={setData} displayFont={displayFont} />}
        {view === 'calendar' && <CalendarView data={data} setData={setData} setView={setView} displayFont={displayFont} />}
        {view === 'inbox' && <InboxView data={data} setData={setData} displayFont={displayFont} />}
        {view === 'meals' && <MealsView data={data} setData={setData} displayFont={displayFont} />}
        {view === 'holidays' && <HolidaysView data={data} setData={setData} displayFont={displayFont} />}
        {view === 'assistant' && <AssistantView data={data} setData={setData} displayFont={displayFont} />}
      </main>
      <BottomNav view={view} setView={setView} />
      {showSettings && <SettingsPanel data={data} setData={setData} onClose={() => setShowSettings(false)} displayFont={displayFont} session={session} />}
    </div>
  );
}

// =====================================================================
// HEADER
// =====================================================================
function Header({ familyName, onSettings, displayFont }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <header style={{ borderBottom: '1px solid #E8E0D3', background: '#FAF6EE', position: 'sticky', top: 0, zIndex: 10, backdropFilter: 'blur(8px)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '20px 20px 18px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: '#8B7E70', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 4 }}>{greeting}</div>
          <h1 style={{ fontFamily: displayFont, fontSize: 26, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.05, margin: 0, color: '#1A1612' }}>
            {familyName}
          </h1>
        </div>
        <button onClick={onSettings} style={{ background: 'transparent', border: '1px solid #D8CFC0', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#6B6259' }} aria-label="Settings">
          <Settings size={16} />
        </button>
      </div>
    </header>
  );
}

// =====================================================================
// BOTTOM NAV
// =====================================================================
function BottomNav({ view, setView }) {
  const tabs = [
    { id: 'today', icon: Home, label: 'Today' },
    { id: 'calendar', icon: CalendarDays, label: 'Calendar' },
    { id: 'inbox', icon: InboxIcon, label: 'Inbox' },
    { id: 'meals', icon: ChefHat, label: 'Meals' },
    { id: 'holidays', icon: Sun, label: 'Holidays' },
    { id: 'assistant', icon: MessageCircle, label: 'Ask' }
  ];
  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#FFFFFF', borderTop: '1px solid #E8E0D3', padding: '10px 6px 14px', zIndex: 20 }}>
      <div style={{ maxWidth: 640, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 1 }}>
        {tabs.map(t => {
          const Icon = t.icon;
          const active = view === t.id;
          return (
            <button key={t.id} onClick={() => setView(t.id)} style={{ background: 'transparent', border: 'none', padding: '6px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, cursor: 'pointer', color: active ? '#8B3A2C' : '#8B7E70' }}>
              <Icon size={20} strokeWidth={active ? 2.2 : 1.7} />
              <span style={{ fontSize: 10.5, fontWeight: active ? 600 : 500, letterSpacing: '0.04em' }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// =====================================================================
// AUTH SCREEN (shown when Supabase is configured + no session)
// =====================================================================
function AuthScreen({ displayFont, baseFont }) {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setMessage('Check your email to confirm your account, then sign in.');
          setMode('signin');
        }
      }
    } catch (e) {
      setError(e.message || 'Something went wrong.');
    }
    setLoading(false);
  };

  return (
    <div style={{ background: '#FAF6EE', minHeight: '100vh', fontFamily: baseFont, color: '#1A1612', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 400, width: '100%', padding: '40px 28px' }}>
        <div style={{ fontSize: 11, color: '#8B3A2C', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 14 }}>The Family COO</div>
        <h1 style={{ fontFamily: displayFont, fontSize: 36, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1.05, margin: '0 0 28px' }}>
          {mode === 'signin' ? <>Welcome <em>back.</em></> : <>Set up <em>your family.</em></>}
        </h1>

        <label style={labelStyle}>Email</label>
        <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="you@example.com" style={inputStyle} autoFocus autoComplete="email" />

        <label style={labelStyle}>Password</label>
        <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="At least 6 characters" style={inputStyle} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />

        {error && <div style={{ padding: '10px 14px', background: '#FCEBE6', border: '1px solid #F0C8BD', borderRadius: 10, color: '#8B3A2C', fontSize: 12.5, marginTop: 6, marginBottom: 12, lineHeight: 1.45 }}>{error}</div>}
        {message && <div style={{ padding: '10px 14px', background: '#E8F0EA', border: '1px solid #C8DBCD', borderRadius: 10, color: '#2D5240', fontSize: 12.5, marginTop: 6, marginBottom: 12, lineHeight: 1.45 }}>{message}</div>}

        <button onClick={handleSubmit} disabled={loading || !email || !password} style={{ ...btnPrimary, width: '100%', justifyContent: 'center', marginTop: 14, padding: '13px 20px', fontSize: 15, opacity: (loading || !email || !password) ? 0.5 : 1, cursor: loading ? 'wait' : 'pointer' }}>
          {loading && <RotateCw size={15} className="spin" />}
          {loading ? 'One moment…' : (mode === 'signin' ? 'Sign in' : 'Create account')}
        </button>

        <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setMessage(null); }} style={{ background: 'transparent', border: 'none', color: '#6B6259', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginTop: 20, padding: 0, display: 'block', textAlign: 'center', width: '100%' }}>
          {mode === 'signin' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
        </button>

        <p style={{ fontSize: 11, color: '#A89E92', marginTop: 28, lineHeight: 1.55, textAlign: 'center' }}>
          Your data is private and syncs across all your devices. Cancel anytime.
        </p>
      </div>
    </div>
  );
}

// =====================================================================
// ONBOARDING
// =====================================================================
function Onboarding({ onComplete, onDemo, displayFont, baseFont }) {
  const [step, setStep] = useState(0);
  const [familyName, setFamilyName] = useState('');
  const [kids, setKids] = useState([{ id: 'k' + Date.now(), name: '', age: '', school: '', allergies: '', picky: '', interests: '', colour: KID_COLOURS[0].id }]);

  const finish = () => {
    onComplete({
      initialized: true,
      familyName: familyName || 'My Family',
      kids: kids.filter(k => k.name.trim()).map((k, i) => ({ ...k, age: parseInt(k.age) || 0, colour: k.colour || KID_COLOURS[i % KID_COLOURS.length].id })),
      tasks: [],
      mealPlan: null,
      inbox: [],
      chats: [],
      events: []
    });
  };

  return (
    <div style={{ background: '#FAF6EE', minHeight: '100vh', fontFamily: baseFont, color: '#1A1612' }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '60px 24px 40px' }}>
        <div style={{ fontSize: 11, color: '#8B3A2C', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 18 }}>The Family COO</div>
        <h1 style={{ fontFamily: displayFont, fontSize: 44, fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1.0, margin: '0 0 18px', color: '#1A1612' }}>
          The household runs<br /><em style={{ fontWeight: 400 }}>itself, almost.</em>
        </h1>
        <p style={{ fontSize: 16, lineHeight: 1.55, color: '#5C534A', margin: '0 0 36px', maxWidth: 440 }}>
          An AI Chief of Staff for your family. School admin, meal planning, scheduling, and the mental load — handled, so you can be present for the parts that matter.
        </p>

        {step === 0 && (
          <>
            <button onClick={() => setStep(1)} style={btnPrimary}>
              Set up your family <ChevronRight size={16} />
            </button>
            <button onClick={onDemo} style={btnGhost}>
              Try with the demo family
            </button>
            <div style={{ marginTop: 28, padding: '18px 0', borderTop: '1px solid #E8E0D3', fontSize: 13, color: '#8B7E70', lineHeight: 1.5 }}>
              Data stays on your device. Designed for two-income families with kids under ten. <span style={{ color: '#8B3A2C', fontWeight: 600 }}>$49/month at launch.</span>
            </div>
          </>
        )}

        {step === 1 && (
          <div>
            <label style={labelStyle}>What's your family called?</label>
            <input value={familyName} onChange={e => setFamilyName(e.target.value)} placeholder="The Smith Family" style={inputStyle} autoFocus />
            <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
              <button onClick={() => setStep(0)} style={btnGhost}>Back</button>
              <button onClick={() => setStep(2)} disabled={!familyName.trim()} style={{ ...btnPrimary, opacity: familyName.trim() ? 1 : 0.4 }}>
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <label style={labelStyle}>Tell me about your kids</label>
            <p style={{ fontSize: 13, color: '#8B7E70', margin: '0 0 16px' }}>The more I know, the smarter I can be. Edit anytime.</p>
            {kids.map((k, i) => (
              <div key={k.id} style={{ background: '#FFFFFF', border: '1px solid #E8E0D3', borderRadius: 14, padding: 14, marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <input placeholder="Name" value={k.name} onChange={e => updateKid(kids, setKids, i, 'name', e.target.value)} style={{ ...inputStyle, marginBottom: 0, flex: 2 }} />
                  <input placeholder="Age" value={k.age} onChange={e => updateKid(kids, setKids, i, 'age', e.target.value)} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
                </div>
                <input placeholder="School / daycare" value={k.school} onChange={e => updateKid(kids, setKids, i, 'school', e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
                <input placeholder="Allergies (or 'None')" value={k.allergies} onChange={e => updateKid(kids, setKids, i, 'allergies', e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
                <input placeholder="Picky-eater notes" value={k.picky} onChange={e => updateKid(kids, setKids, i, 'picky', e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
                <input placeholder="Interests / activities" value={k.interests} onChange={e => updateKid(kids, setKids, i, 'interests', e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
                {kids.length > 1 && (
                  <button onClick={() => setKids(kids.filter((_, ix) => ix !== i))} style={{ background: 'transparent', border: 'none', color: '#8B7E70', fontSize: 12, cursor: 'pointer', padding: '8px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Trash2 size={12} /> Remove
                  </button>
                )}
              </div>
            ))}
            <button onClick={() => setKids([...kids, { id: 'k' + Date.now(), name: '', age: '', school: '', allergies: '', picky: '', interests: '', colour: KID_COLOURS[kids.length % KID_COLOURS.length].id }])} style={{ background: 'transparent', border: '1px dashed #D8CFC0', borderRadius: 12, padding: '10px 14px', cursor: 'pointer', color: '#6B6259', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', fontSize: 13, width: '100%', justifyContent: 'center' }}>
              <Plus size={14} /> Add another child
            </button>
            <div style={{ display: 'flex', gap: 8, marginTop: 24 }}>
              <button onClick={() => setStep(1)} style={btnGhost}>Back</button>
              <button onClick={finish} disabled={!kids.some(k => k.name.trim())} style={{ ...btnPrimary, opacity: kids.some(k => k.name.trim()) ? 1 : 0.4 }}>
                Enter the COO <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function updateKid(kids, setKids, i, field, value) {
  const next = [...kids];
  next[i] = { ...next[i], [field]: value };
  setKids(next);
}

// =====================================================================
// TODAY VIEW
// =====================================================================
function TodayView({ data, setData, displayFont }) {
  const [digest, setDigest] = useState(null);
  const [digestLoading, setDigestLoading] = useState(false);
  const tasks = data.tasks || [];
  const open = tasks.filter(t => !t.completed);
  const high = open.filter(t => t.priority === 'high');
  const today = new Date().toLocaleDateString('en-AU', { weekday: 'long', month: 'long', day: 'numeric' });

  const toggleTask = (id) => {
    setData({ ...data, tasks: tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t) });
  };

  const generateDigest = async () => {
    setDigestLoading(true);
    try {
      const kidsContext = data.kids.map(k => `${k.name} (${k.age})`).join(', ');
      const tasksContext = open.map(t => `- ${t.title} [${t.priority}, ${t.dueLabel}, ${t.kidName || 'family'}]`).join('\n');
      const prompt = `Family: ${data.familyName}. Kids: ${kidsContext}. Open tasks:\n${tasksContext || 'None'}.\n\nWrite a calm, 2-sentence daily orientation for the parent — what truly matters today, what can wait. Warm, dry-witty, no fluff. Address them directly.`;
      const result = await callClaude("You are a warm, sharp family chief of staff. Brief and human. Never use emojis or exclamation marks.", prompt);
      setDigest(result);
    } catch (e) {
      setDigest("Couldn't generate brief: " + (e.message || 'unknown error') + '. Check your VITE_ANTHROPIC_API_KEY in .env and model name in App.jsx.');
    }
    setDigestLoading(false);
  };

  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ fontSize: 11, color: '#8B7E70', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 6 }}>{today}</div>
      <h2 style={{ fontFamily: displayFont, fontSize: 32, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1.05, margin: '0 0 24px' }}>
        {open.length === 0 ? <>Nothing pressing. <em>Enjoy the breath.</em></> : <>{high.length || open.length} {high.length ? 'high-priority' : 'open'} {(high.length || open.length) === 1 ? 'item' : 'items'} <em>today.</em></>}
      </h2>

      {/* AI Digest card */}
      <div style={{ background: 'linear-gradient(135deg, #2D5240 0%, #1F3D2F 100%)', borderRadius: 18, padding: 20, marginBottom: 24, color: '#F5F0E4', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, opacity: 0.75 }}>
          <Sparkles size={12} /> Your morning brief
        </div>
        {digest ? (
          <p style={{ fontFamily: displayFont, fontSize: 18, lineHeight: 1.45, fontWeight: 400, margin: 0, letterSpacing: '-0.01em' }}>{digest}</p>
        ) : (
          <>
            <p style={{ fontSize: 14, lineHeight: 1.5, margin: '0 0 14px', opacity: 0.82 }}>A two-sentence orientation, written for you, every morning.</p>
            <button onClick={generateDigest} disabled={digestLoading} style={{ background: '#F5F0E4', color: '#1F3D2F', border: 'none', borderRadius: 100, padding: '9px 16px', fontWeight: 600, fontSize: 13, fontFamily: 'inherit', cursor: digestLoading ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {digestLoading ? <RotateCw size={13} className="spin" /> : <Wand2 size={13} />}
              {digestLoading ? 'Thinking…' : 'Generate brief'}
            </button>
          </>
        )}
      </div>

      {/* Task list */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontFamily: displayFont, fontSize: 20, fontWeight: 500, margin: 0, letterSpacing: '-0.02em' }}>Open items</h3>
          <span style={{ fontSize: 12, color: '#8B7E70' }}>{open.length} of {tasks.length}</span>
        </div>
        {open.length === 0 && (
          <div style={{ background: '#FFFFFF', border: '1px solid #E8E0D3', borderRadius: 16, padding: 22, textAlign: 'center', color: '#8B7E70', fontSize: 14 }}>
            All caught up. Process a school email or generate a meal plan from the tabs below.
          </div>
        )}
        {open.map(t => (
          <TaskRow key={t.id} task={t} kidColour={getKidColour(t.kidName, data.kids)} onToggle={() => toggleTask(t.id)} />
        ))}
      </div>

      {/* Kids overview */}
      {data.kids.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ fontFamily: displayFont, fontSize: 20, fontWeight: 500, margin: '0 0 12px', letterSpacing: '-0.02em' }}>The crew</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {data.kids.map(k => {
              const count = open.filter(t => t.kidName === k.name).length;
              const c = getKidColour(k.name, data.kids);
              return (
                <div key={k.id} style={{ background: '#FFFFFF', border: '1px solid #E8E0D3', borderLeft: '3px solid ' + (c?.hex || '#D8CFC0'), borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontFamily: displayFont, fontSize: 17, fontWeight: 500, letterSpacing: '-0.01em' }}>{k.name}</div>
                    <div style={{ fontSize: 12, color: '#8B7E70', marginTop: 2 }}>{k.age ? `Age ${k.age} · ` : ''}{k.school || 'No school set'}</div>
                  </div>
                  {count > 0 && <span style={{ background: c?.tint || '#F1E9D8', color: c?.hex || '#8B3A2C', fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 100, letterSpacing: '0.02em' }}>{count} open</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskRow({ task, kidColour, onToggle }) {
  const accent = task.priority === 'high' ? '#8B3A2C' : task.priority === 'medium' ? '#B8753B' : '#8B7E70';
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E8E0D3', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
      <button onClick={onToggle} style={{ background: task.completed ? accent : 'transparent', border: `1.5px solid ${accent}`, borderRadius: '50%', width: 22, height: 22, minWidth: 22, marginTop: 2, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
        {task.completed && <Check size={13} color="#fff" />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 500, lineHeight: 1.4, color: task.completed ? '#A89E92' : '#1A1612', textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, fontSize: 11.5, color: '#8B7E70', flexWrap: 'wrap' }}>
          <span style={{ color: accent, fontWeight: 600 }}>{task.dueLabel}</span>
          {task.kidName && <>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#D8CFC0' }} />
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: kidColour?.hex || '#8B7E70' }} />
              {task.kidName}
            </span>
          </>}
          {task.source && <><span style={{ width: 3, height: 3, borderRadius: '50%', background: '#D8CFC0' }} />{task.source}</>}
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// INBOX VIEW
// =====================================================================
function InboxView({ data, setData, displayFont }) {
  const [emailText, setEmailText] = useState('');
  const [pasteLoading, setPasteLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [triagingId, setTriagingId] = useState(null);
  const [batchTriaging, setBatchTriaging] = useState(false);
  const [error, setError] = useState(null);
  const [showPaste, setShowPaste] = useState(false);

  const gmailConnected = !!data.gmailConnected;
  const gmailEmails = data.gmailEmails || [];
  const untriaged = gmailEmails.filter(e => !e.triaged);

  const runTriage = async (text, kids) => {
    const kidNames = (kids || []).map(k => k.name).join(', ');
    const system = `You are an inbox triage assistant for busy parents. Extract structured action items from school/childcare/family communications. Return ONLY valid JSON, no prose, no markdown fences. Schema: {"summary": "1 sentence", "actionItems": [{"title": "concrete action", "dueLabel": "Today|Tomorrow|This week|Fri|next Mon|etc", "priority": "high|medium|low", "kidName": "name or null"}]}`;
    const user = `Family kids: ${kidNames || '(none specified)'}\n\nEmail:\n${text}\n\nReturn JSON only.`;
    const raw = await callClaude(system, user);
    return extractJSON(raw);
  };

  const connectGmail = async () => {
    setConnecting(true);
    await new Promise(r => setTimeout(r, 1600));
    const mocks = generateMockEmails(data.kids, data.familyName);
    const addr = 'parent.' + (data.familyName || 'family').toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '') + '@gmail.com';
    setData({ ...data, gmailConnected: true, gmailAddress: addr, gmailEmails: mocks });
    setConnecting(false);
  };

  const disconnectGmail = () => {
    setData({ ...data, gmailConnected: false, gmailEmails: [], gmailAddress: null });
  };

  const triageEmail = async (email, baseData) => {
    const current = baseData || data;
    try {
      const result = await runTriage(email.body, current.kids);
      const sourceName = email.from.split('<')[0].trim();
      const newTasks = (result.actionItems || []).map((a, i) => ({
        id: 'gm-task-' + Date.now() + '-' + i + '-' + Math.random().toString(36).slice(2, 5),
        title: a.title,
        dueLabel: a.dueLabel || 'Soon',
        priority: ['high', 'medium', 'low'].includes(a.priority) ? a.priority : 'medium',
        kidName: a.kidName && a.kidName !== 'null' ? a.kidName : (email.kidName || null),
        completed: false,
        source: sourceName
      }));
      const updatedEmails = (current.gmailEmails || []).map(e =>
        e.id === email.id ? { ...e, triaged: true, tasksAdded: newTasks.length, summary: result.summary } : e
      );
      return {
        ...current,
        tasks: [...newTasks, ...(current.tasks || [])],
        gmailEmails: updatedEmails,
        inbox: [{ id: 'i' + Date.now() + Math.random(), summary: result.summary, count: newTasks.length, processedAt: new Date().toISOString(), source: sourceName }, ...(current.inbox || [])]
      };
    } catch {
      return null;
    }
  };

  const triageOne = async (email) => {
    setTriagingId(email.id);
    setError(null);
    const next = await triageEmail(email);
    if (next) setData(next); else setError('Could not process that email. Try again.');
    setTriagingId(null);
  };

  const triageAll = async () => {
    setBatchTriaging(true);
    setError(null);
    let current = data;
    for (const e of (data.gmailEmails || []).filter(x => !x.triaged)) {
      setTriagingId(e.id);
      const next = await triageEmail(e, current);
      if (next) {
        current = next;
        setData(current);
      }
    }
    setTriagingId(null);
    setBatchTriaging(false);
  };

  const processPaste = async () => {
    if (!emailText.trim()) return;
    setPasteLoading(true);
    setError(null);
    try {
      const result = await runTriage(emailText, data.kids);
      const source = (emailText.match(/From: ([^\n<]+)/) || [])[1]?.trim() || 'Pasted email';
      const newTasks = (result.actionItems || []).map((a, i) => ({
        id: 'p-task-' + Date.now() + '-' + i,
        title: a.title,
        dueLabel: a.dueLabel || 'Soon',
        priority: ['high', 'medium', 'low'].includes(a.priority) ? a.priority : 'medium',
        kidName: a.kidName && a.kidName !== 'null' ? a.kidName : null,
        completed: false,
        source
      }));
      setData({
        ...data,
        tasks: [...newTasks, ...(data.tasks || [])],
        inbox: [{ id: 'i' + Date.now(), summary: result.summary, count: newTasks.length, processedAt: new Date().toISOString(), source }, ...(data.inbox || [])]
      });
      setEmailText('');
      setShowPaste(false);
    } catch (e) {
      setError('Could not parse: ' + (e.message || 'unknown error'));
    }
    setPasteLoading(false);
  };

  const timeAgo = (iso) => {
    const ms = Date.now() - new Date(iso).getTime();
    const h = Math.floor(ms / 3600000);
    if (h < 1) return 'just now';
    if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
  };

  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ fontSize: 11, color: '#8B7E70', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 6 }}>Inbox Triage</div>
      <h2 style={{ fontFamily: displayFont, fontSize: 30, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1.05, margin: '0 0 8px' }}>
        Every kid-related email. <em>Read for you.</em>
      </h2>
      <p style={{ fontSize: 14, color: '#5C534A', lineHeight: 1.5, margin: '0 0 20px', maxWidth: 480 }}>
        Connect Gmail and the assistant scans for school emails — plus anything addressed to you that mentions one of your kids — pulling deadlines, payments, and decisions out of the noise.
      </p>

      {!gmailConnected ? (
        <div style={{ background: 'linear-gradient(135deg, #FFFFFF 0%, #F1E9D8 100%)', border: '1px solid #E0D3BC', borderRadius: 18, padding: 22, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <GmailIcon />
            <span style={{ fontSize: 11, color: '#8B7E70', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>Continuous monitoring</span>
          </div>
          <h3 style={{ fontFamily: displayFont, fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', margin: '0 0 8px' }}>Connect your inbox</h3>
          <p style={{ fontSize: 13.5, color: '#5C534A', lineHeight: 1.55, margin: '0 0 14px' }}>
            We only read emails involving your kids — school, daycare, sports clubs, doctors, friends' parents. Everything else is ignored. Disconnect anytime.
          </p>
          <button onClick={connectGmail} disabled={connecting} style={{ ...btnPrimary, opacity: connecting ? 0.6 : 1, cursor: connecting ? 'wait' : 'pointer' }}>
            {connecting ? <RotateCw size={14} className="spin" /> : <GmailIcon mini />}
            {connecting ? 'Connecting…' : 'Connect Gmail'}
          </button>
          <p style={{ fontSize: 11, color: '#A89E92', marginTop: 14, lineHeight: 1.5, fontStyle: 'italic' }}>Prototype: simulated Gmail with realistic sample emails for your kids. Real Gmail OAuth is a 1–2 week production build.</p>
        </div>
      ) : (
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E0D3', borderRadius: 18, padding: 18, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
              <GmailIcon />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1612' }}>Gmail connected</div>
                <div style={{ fontSize: 11.5, color: '#8B7E70', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.gmailAddress || 'parent@gmail.com'} · {untriaged.length} for triage</div>
              </div>
            </div>
            <button onClick={disconnectGmail} style={{ background: 'transparent', border: 'none', color: '#8B7E70', fontSize: 11.5, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Disconnect</button>
          </div>

          {untriaged.length > 0 && (
            <button onClick={triageAll} disabled={batchTriaging} style={{ ...btnPrimary, width: '100%', justifyContent: 'center', marginBottom: 14, opacity: batchTriaging ? 0.6 : 1, cursor: batchTriaging ? 'wait' : 'pointer' }}>
              {batchTriaging ? <RotateCw size={14} className="spin" /> : <Sparkles size={14} />}
              {batchTriaging ? 'Triaging all…' : 'Triage all ' + untriaged.length + ' now'}
            </button>
          )}

          {gmailEmails.length === 0 && (
            <div style={{ textAlign: 'center', padding: 20, color: '#8B7E70', fontSize: 13 }}>No kid-related emails found. Inbox is quiet.</div>
          )}

          {gmailEmails.map(email => (
            <div key={email.id} style={{ borderTop: '1px solid #F0E8D8', padding: '12px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11.5, color: '#8B7E70', fontWeight: 500 }}>{email.from.split('<')[0].trim()}</span>
                {email.kidName && <span style={{ background: '#F1E9D8', color: '#8B3A2C', fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 6, letterSpacing: '0.02em' }}>{email.kidName}</span>}
                <span style={{ fontSize: 11, color: '#A89E92' }}>· {timeAgo(email.receivedAt)}</span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1A1612', lineHeight: 1.35, marginBottom: 3 }}>{email.subject}</div>
              <div style={{ fontSize: 12.5, color: '#6B6259', lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {email.triaged && email.summary ? email.summary : email.preview}
              </div>
              <div style={{ marginTop: 8 }}>
                {email.triaged ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: '#2D5240', fontWeight: 600 }}>
                    <Check size={12} /> Triaged · {email.tasksAdded || 0} task{email.tasksAdded === 1 ? '' : 's'} added
                  </div>
                ) : (
                  <button onClick={() => triageOne(email)} disabled={triagingId === email.id || batchTriaging} style={{ background: 'transparent', border: '1px solid #D8CFC0', color: '#8B3A2C', borderRadius: 8, padding: '5px 10px', fontSize: 11.5, fontWeight: 600, cursor: (triagingId === email.id || batchTriaging) ? 'wait' : 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    {triagingId === email.id ? <RotateCw size={11} className="spin" /> : <Sparkles size={11} />}
                    {triagingId === email.id ? 'Triaging…' : 'Triage with AI'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <details open={showPaste} onToggle={e => setShowPaste(e.currentTarget.open)} style={{ background: '#FFFFFF', border: '1px solid #E8E0D3', borderRadius: 14, padding: 14, marginBottom: 16 }}>
        <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#1A1612', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Or paste an email manually
          <ChevronRight size={14} style={{ transform: showPaste ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }} />
        </summary>
        <textarea
          value={emailText}
          onChange={e => setEmailText(e.target.value)}
          placeholder="Paste the email body…"
          rows={6}
          style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10, border: '1px solid #D8CFC0', background: '#FAF6EE', fontSize: 13.5, lineHeight: 1.5, fontFamily: 'inherit', color: '#1A1612', resize: 'vertical', outline: 'none', marginTop: 10 }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button onClick={processPaste} disabled={pasteLoading || !emailText.trim()} style={{ ...btnPrimary, padding: '9px 16px', fontSize: 13, opacity: (pasteLoading || !emailText.trim()) ? 0.5 : 1 }}>
            {pasteLoading ? <RotateCw size={13} className="spin" /> : <Sparkles size={13} />}
            {pasteLoading ? 'Extracting…' : 'Triage'}
          </button>
          {!emailText && <button onClick={() => setEmailText(SAMPLE_EMAIL)} style={{ ...btnGhost, padding: '9px 16px', fontSize: 13 }}>Use sample</button>}
        </div>
      </details>

      {error && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#FCEBE6', border: '1px solid #F0C8BD', borderRadius: 10, color: '#8B3A2C', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {(data.inbox || []).length > 0 && (
        <div style={{ marginTop: 8 }}>
          <h3 style={{ fontFamily: displayFont, fontSize: 18, fontWeight: 500, margin: '0 0 10px', letterSpacing: '-0.02em' }}>Recently triaged</h3>
          {(data.inbox || []).slice(0, 5).map(item => (
            <div key={item.id} style={{ background: '#FFFFFF', border: '1px solid #E8E0D3', borderRadius: 12, padding: '10px 14px', marginBottom: 6, fontSize: 12.5 }}>
              <div style={{ color: '#8B7E70', fontSize: 11, marginBottom: 3 }}>{item.source}</div>
              <div style={{ color: '#1A1612', lineHeight: 1.4 }}>{item.summary}</div>
              <div style={{ color: '#8B3A2C', fontSize: 11, fontWeight: 600, marginTop: 3 }}>+{item.count} task{item.count === 1 ? '' : 's'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GmailIcon({ mini }) {
  const size = mini ? 14 : 22;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <rect x="2" y="4" width="20" height="16" rx="2.5" fill="#FFFFFF" stroke="#D8CFC0" strokeWidth="1.2"/>
      <path d="M2.5 5.5 L12 13 L21.5 5.5" stroke="#8B3A2C" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// =====================================================================
// MEALS VIEW
// =====================================================================
function MealsView({ data, setData, displayFont }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeDay, setActiveDay] = useState(0);

  const generatePlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const kidsContext = data.kids.map(k => `- ${k.name} (${k.age}y): allergies=${k.allergies || 'none'}; picky=${k.picky || 'none'}`).join('\n');
      const system = `You are a practical Australian family meal planner. Generate dinner plans that work for time-poor parents. Hide vegetables in kid-friendly ways. Avoid allergens absolutely. Use ingredients available at Coles/Woolworths. Return ONLY valid JSON, no prose. Schema: {"days":[{"day":"Monday","name":"meal name","description":"1 short sentence","prepTime":15,"kidAppeal":"high|medium|low"}],"shoppingList":["item 1","item 2"]}`;
      const user = `Family kids:\n${kidsContext}\n\nGenerate a 7-day dinner plan (Monday to Sunday). 4-5 weeknight quick meals (≤25 min), 2 more elaborate weekend meals. Return JSON only.`;
      const raw = await callClaude(system, user);
      const parsed = extractJSON(raw);
      setData({ ...data, mealPlan: { ...parsed, generatedAt: new Date().toISOString() } });
      setActiveDay(0);
    } catch (e) {
      setError("Couldn't generate plan: " + (e.message || 'unknown error'));
    }
    setLoading(false);
  };

  const plan = data.mealPlan;

  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ fontSize: 11, color: '#8B7E70', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 6 }}>This Week's Menu</div>
      <h2 style={{ fontFamily: displayFont, fontSize: 30, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1.05, margin: '0 0 8px' }}>
        Seven dinners. <em>Already decided.</em>
      </h2>
      <p style={{ fontSize: 14, color: '#5C534A', lineHeight: 1.5, margin: '0 0 20px', maxWidth: 480 }}>
        Built around your kids' allergies, fussiness, and ages. Veg hidden where they won't see it. Shopping list at the bottom.
      </p>

      {!plan && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E0D3', borderRadius: 18, padding: 28, textAlign: 'center' }}>
          <div style={{ fontFamily: displayFont, fontSize: 22, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 8, color: '#1A1612' }}>No plan yet.</div>
          <p style={{ fontSize: 14, color: '#8B7E70', lineHeight: 1.5, margin: '0 0 18px' }}>Let me draft one based on what I know about your kids.</p>
          <button onClick={generatePlan} disabled={loading || data.kids.length === 0} style={{ ...btnPrimary, opacity: (loading || data.kids.length === 0) ? 0.5 : 1, cursor: loading ? 'wait' : 'pointer' }}>
            {loading ? <RotateCw size={14} className="spin" /> : <Wand2 size={14} />}
            {loading ? 'Cooking up your week…' : 'Generate weekly plan'}
          </button>
          {data.kids.length === 0 && <p style={{ fontSize: 12, color: '#8B3A2C', marginTop: 12 }}>Add kids first from the Settings menu.</p>}
        </div>
      )}

      {error && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#FCEBE6', border: '1px solid #F0C8BD', borderRadius: 10, color: '#8B3A2C', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {plan && plan.days && (
        <>
          {/* Day strip */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 12, marginBottom: 4, marginLeft: -20, paddingLeft: 20, paddingRight: 20 }}>
            {plan.days.map((d, i) => (
              <button key={i} onClick={() => setActiveDay(i)} style={{ background: activeDay === i ? '#1A1612' : '#FFFFFF', color: activeDay === i ? '#FAF6EE' : '#1A1612', border: `1px solid ${activeDay === i ? '#1A1612' : '#E8E0D3'}`, borderRadius: 12, padding: '10px 14px', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>
                {d.day.slice(0, 3)}
              </button>
            ))}
          </div>
          {/* Active day card */}
          {plan.days[activeDay] && (() => {
            const d = plan.days[activeDay];
            const appealColor = d.kidAppeal === 'high' ? '#2D5240' : d.kidAppeal === 'medium' ? '#B8753B' : '#8B3A2C';
            return (
              <div style={{ background: '#FFFFFF', border: '1px solid #E8E0D3', borderRadius: 18, padding: 22, marginBottom: 20 }}>
                <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#8B7E70', fontWeight: 600, marginBottom: 8 }}>{d.day}</div>
                <h3 style={{ fontFamily: displayFont, fontSize: 26, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1.1, margin: '0 0 10px', color: '#1A1612' }}>{d.name}</h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.55, color: '#5C534A', margin: '0 0 16px' }}>{d.description}</p>
                <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#6B6259', flexWrap: 'wrap' }}>
                  <span><strong style={{ color: '#1A1612' }}>{d.prepTime}</strong> min prep</span>
                  <span style={{ color: appealColor, fontWeight: 600, textTransform: 'capitalize' }}>{d.kidAppeal} kid appeal</span>
                </div>
              </div>
            );
          })()}

          {/* Shopping list */}
          {plan.shoppingList && plan.shoppingList.length > 0 && (
            <div style={{ background: '#F1E9D8', border: '1px solid #E0D3BC', borderRadius: 18, padding: 22, marginBottom: 16 }}>
              <h3 style={{ fontFamily: displayFont, fontSize: 20, fontWeight: 500, margin: '0 0 12px', letterSpacing: '-0.02em' }}>Shopping list</h3>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '6px 12px' }}>
                {plan.shoppingList.map((item, i) => (
                  <li key={i} style={{ fontSize: 13.5, color: '#1A1612', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 4, height: 4, background: '#8B3A2C', borderRadius: '50%', display: 'inline-block' }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button onClick={generatePlan} disabled={loading} style={btnGhost}>
            {loading ? <RotateCw size={13} className="spin" /> : <RotateCw size={13} />}
            {loading ? 'Regenerating…' : 'Regenerate plan'}
          </button>
        </>
      )}
    </div>
  );
}

// =====================================================================
// CALENDAR VIEW
// =====================================================================
function CalendarView({ data, setData, setView, displayFont }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [exportDone, setExportDone] = useState(false);

  // Aggregate events from all sources, attaching the kid's colour
  const aggregateEvents = () => {
    const list = [];
    (data.events || []).forEach(e => list.push({ ...e, source: e.source || 'manual', kidColour: getKidColour(e.kidName, data.kids) }));

    const plan = data.holidayPlan;
    if (plan?.saved?.length && plan.programs && plan.startDate && plan.endDate) {
      const planKid = data.kids.find(k => k.id === plan.forKidId);
      const kidName = planKid?.name;
      const kidColour = getKidColour(kidName, data.kids);
      plan.programs.filter(p => plan.saved.includes(p.id)).forEach(p => {
        list.push({
          id: 'hp-' + p.id,
          title: p.name,
          startDate: plan.startDate,
          endDate: plan.endDate,
          kidName: kidName,
          kidColour: kidColour,
          kind: 'holiday-program',
          notes: p.provider + ' · ' + p.schedule + ' · $' + p.costPerWeek + '/week',
          source: 'holiday-plan'
        });
      });
    }

    NSW_2026.forEach(h => list.push({ ...h, source: 'nsw' }));
    return list.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  };

  const allEvents = aggregateEvents();

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString().slice(0, 10);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString().slice(0, 10);
  const inSeven = new Date(today); inSeven.setDate(inSeven.getDate() + 7);
  const inFourteen = new Date(today); inFourteen.setDate(inFourteen.getDate() + 14);
  const inNinety = new Date(today); inNinety.setDate(inNinety.getDate() + 90);

  const buckets = { today: [], tomorrow: [], thisWeek: [], nextWeek: [], later: [] };
  allEvents.forEach(e => {
    const start = new Date(e.startDate + 'T00:00:00');
    const end = e.endDate ? new Date(e.endDate + 'T00:00:00') : start;
    if (end < today) return; // past — skip from upcoming buckets
    if (start <= today && end >= today) buckets.today.push(e);
    else if (start.toISOString().slice(0, 10) === tomorrowISO) buckets.tomorrow.push(e);
    else if (start > tomorrow && start <= inSeven) buckets.thisWeek.push(e);
    else if (start > inSeven && start <= inFourteen) buckets.nextWeek.push(e);
    else if (start > inFourteen && start <= inNinety) buckets.later.push(e);
  });

  const totalCount = buckets.today.length + buckets.tomorrow.length + buckets.thisWeek.length + buckets.nextWeek.length + buckets.later.length;

  const handleExport = () => {
    const upcoming = allEvents.filter(e => {
      const end = new Date((e.endDate || e.startDate) + 'T00:00:00');
      return end >= today;
    });
    const ics = generateICS(upcoming, (data.familyName || 'Family') + ' COO');
    const date = new Date().toISOString().slice(0, 10);
    downloadICS(ics, 'family-coo-' + date + '.ics');
    setExportDone(true);
    setTimeout(() => setExportDone(false), 5000);
  };

  const saveEvent = (event) => {
    const existing = data.events || [];
    if (editing && editing.source === 'manual') {
      setData({ ...data, events: existing.map(e => e.id === editing.id ? { ...event, id: editing.id } : e) });
    } else {
      setData({ ...data, events: [...existing, { ...event, id: 'e-' + Date.now() }] });
    }
    setShowAdd(false);
    setEditing(null);
  };

  const deleteEvent = (id) => {
    setData({ ...data, events: (data.events || []).filter(e => e.id !== id) });
    setShowAdd(false);
    setEditing(null);
  };

  const handleEdit = (e) => {
    if (e.source === 'manual') {
      setEditing(e);
      setShowAdd(true);
    }
  };

  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ fontSize: 11, color: '#8B7E70', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 6 }}>The Family Calendar</div>
      <h2 style={{ fontFamily: displayFont, fontSize: 30, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1.05, margin: '0 0 8px' }}>
        Everyone's dates. <em>One place.</em>
      </h2>
      <p style={{ fontSize: 14, color: '#5C534A', lineHeight: 1.5, margin: '0 0 18px', maxWidth: 480 }}>
        Events, appointments, school holidays, saved holiday programs, and birthdays — auto-aggregated. Export to Apple, Google, or Outlook with one tap.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
        <button onClick={() => { setEditing(null); setShowAdd(true); }} style={{ ...btnPrimary, justifyContent: 'center', padding: '11px 12px', fontSize: 13.5 }}>
          <Plus size={14} /> Add event
        </button>
        <button onClick={handleExport} style={{ ...btnGhost, justifyContent: 'center', padding: '11px 12px', fontSize: 13.5 }}>
          <Download size={14} /> Add to phone
        </button>
      </div>

      {exportDone && (
        <div style={{ background: '#E8F0EA', border: '1px solid #C8DBCD', borderRadius: 10, padding: '10px 14px', marginBottom: 12, color: '#2D5240', fontSize: 12.5, lineHeight: 1.45 }}>
          <strong>Calendar file downloaded.</strong> Open it from your phone's Downloads to add to Apple Calendar or Google Calendar. Re-export to refresh with new events.
        </div>
      )}

      <button onClick={() => setView('holidays')} style={{ background: 'linear-gradient(135deg, #F1E9D8 0%, #E8DCC2 100%)', border: '1px solid #D8CBA6', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20, gap: 8 }}>
        <div style={{ textAlign: 'left', minWidth: 0 }}>
          <div style={{ fontSize: 11, color: '#8B7E70', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Winter break · 6–17 July</div>
          <div style={{ fontFamily: displayFont, fontSize: 16, fontWeight: 500, color: '#1A1612', letterSpacing: '-0.01em' }}>Find programs for the next school holidays</div>
        </div>
        <ChevronRight size={18} color="#8B3A2C" style={{ flexShrink: 0 }} />
      </button>

      <Section title="Today" events={buckets.today} onEdit={handleEdit} displayFont={displayFont} />
      <Section title="Tomorrow" events={buckets.tomorrow} onEdit={handleEdit} displayFont={displayFont} />
      <Section title="This week" events={buckets.thisWeek} onEdit={handleEdit} displayFont={displayFont} />
      <Section title="Next week" events={buckets.nextWeek} onEdit={handleEdit} displayFont={displayFont} />
      <Section title="Coming up" events={buckets.later} onEdit={handleEdit} displayFont={displayFont} />

      {totalCount === 0 && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E0D3', borderRadius: 16, padding: 24, textAlign: 'center', marginTop: 16 }}>
          <div style={{ fontFamily: displayFont, fontSize: 20, fontWeight: 500, letterSpacing: '-0.02em', marginBottom: 8 }}>Nothing on the horizon.</div>
          <p style={{ fontSize: 13.5, color: '#8B7E70', lineHeight: 1.5, margin: 0 }}>Add an event, or let the inbox triage and holiday search fill it for you.</p>
        </div>
      )}

      <p style={{ fontSize: 11, color: '#A89E92', marginTop: 20, lineHeight: 1.5, fontStyle: 'italic', textAlign: 'center' }}>
        Saved holiday programs, NSW school holidays, and birthdays appear automatically. In production: two-way Google &amp; Apple Calendar sync replaces snapshot export.
      </p>

      {showAdd && <AddEventModal kids={data.kids} initial={editing} onSave={saveEvent} onDelete={editing && editing.source === 'manual' ? () => deleteEvent(editing.id) : null} onClose={() => { setShowAdd(false); setEditing(null); }} displayFont={displayFont} />}
    </div>
  );
}

function Section({ title, events, onEdit, displayFont }) {
  if (!events.length) return null;
  return (
    <div style={{ marginTop: 18 }}>
      <h3 style={{ fontFamily: displayFont, fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#8B7E70', margin: '0 0 10px' }}>{title}</h3>
      {events.map(e => <EventRow key={e.id + (e.source || '')} event={e} onEdit={onEdit} />)}
    </div>
  );
}

function EventRow({ event, onEdit }) {
  const kindColor = {
    'event': '#8B3A2C',
    'birthday': '#A8538C',
    'appointment': '#3D5A78',
    'holiday-program': '#2D5240',
    'school-holiday': '#B8753B',
    'public-holiday': '#6B6259',
    'task': '#8B3A2C'
  };
  const kindLabel = {
    'event': 'Event',
    'birthday': 'Birthday',
    'appointment': 'Appointment',
    'holiday-program': 'Holiday program',
    'school-holiday': 'School holiday',
    'public-holiday': 'Public holiday',
    'task': 'Task'
  };
  const c = kindColor[event.kind] || '#6B6259';

  const formatDate = (iso) => {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  };
  const dateText = (event.endDate && event.endDate !== event.startDate)
    ? formatDate(event.startDate) + ' → ' + formatDate(event.endDate)
    : formatDate(event.startDate);
  const timeText = event.startTime
    ? (event.endTime ? event.startTime + '–' + event.endTime : event.startTime)
    : null;

  const editable = event.source === 'manual';

  return (
    <div onClick={() => editable && onEdit && onEdit(event)} style={{
      background: '#FFFFFF',
      border: '1px solid #E8E0D3',
      borderLeft: '3px solid ' + c,
      borderRadius: 12,
      padding: '12px 14px',
      marginBottom: 8,
      cursor: editable ? 'pointer' : 'default',
      display: 'flex',
      gap: 10
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: c, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{kindLabel[event.kind] || 'Event'}</span>
          {event.kidName && <span style={{ background: event.kidColour?.tint || '#F1E9D8', color: event.kidColour?.hex || '#8B3A2C', fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 5, letterSpacing: '0.02em' }}>{event.kidName}</span>}
        </div>
        <div style={{ fontSize: 14.5, fontWeight: 600, color: '#1A1612', lineHeight: 1.35, marginBottom: 4 }}>{event.title}</div>
        <div style={{ fontSize: 12, color: '#6B6259', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600 }}>{dateText}</span>
          {timeText && <span>· {timeText}</span>}
        </div>
        {event.notes && <div style={{ fontSize: 12, color: '#8B7E70', marginTop: 6, lineHeight: 1.45 }}>{event.notes}</div>}
      </div>
      {editable && <Edit2 size={14} style={{ color: '#A89E92', flexShrink: 0, marginTop: 2 }} />}
    </div>
  );
}

function AddEventModal({ kids, initial, onSave, onDelete, onClose, displayFont }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [startDate, setStartDate] = useState(initial?.startDate || new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(initial?.endDate || '');
  const [startTime, setStartTime] = useState(initial?.startTime || '');
  const [endTime, setEndTime] = useState(initial?.endTime || '');
  const [kidName, setKidName] = useState(initial?.kidName || '');
  const [kind, setKind] = useState(initial?.kind || 'event');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const canSave = title.trim() && startDate;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      title: title.trim(),
      startDate,
      endDate: endDate || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      kidName: kidName || undefined,
      kind,
      notes: notes.trim() || undefined,
      source: 'manual'
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,22,18,0.4)', zIndex: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#FAF6EE', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto', padding: '24px 24px 40px', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <h3 style={{ fontFamily: displayFont, fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em', margin: 0 }}>{initial ? 'Edit event' : 'New event'}</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B6259' }}><X size={20} /></button>
        </div>

        <label style={labelStyle}>Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Soccer training" style={inputStyle} autoFocus />

        <label style={labelStyle}>Type</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 14 }}>
          {[
            { id: 'event', label: 'Event' },
            { id: 'appointment', label: 'Appointment' },
            { id: 'birthday', label: 'Birthday' }
          ].map(k => (
            <button key={k.id} onClick={() => setKind(k.id)} style={{
              background: kind === k.id ? '#1A1612' : '#FFFFFF',
              color: kind === k.id ? '#FAF6EE' : '#1A1612',
              border: '1px solid ' + (kind === k.id ? '#1A1612' : '#D8CFC0'),
              borderRadius: 10,
              padding: '8px 10px',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}>{k.label}</button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label style={labelStyle}>Start date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>End date <span style={{ color: '#A89E92', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>· opt</span></label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Start time <span style={{ color: '#A89E92', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>· opt</span></label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>End time <span style={{ color: '#A89E92', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>· opt</span></label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <label style={{ ...labelStyle, marginTop: 4 }}>For which child <span style={{ color: '#A89E92', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>· optional</span></label>
        <select value={kidName} onChange={e => setKidName(e.target.value)} style={{ ...inputStyle, appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238B7E70' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 32 }}>
          <option value="">— None / whole family —</option>
          {(kids || []).map(k => <option key={k.id} value={k.name}>{k.name}</option>)}
        </select>

        <label style={labelStyle}>Notes <span style={{ color: '#A89E92', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>· optional</span></label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Location, what to bring, etc." rows={3} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={btnGhost}>Cancel</button>
          <button onClick={handleSave} disabled={!canSave} style={{ ...btnPrimary, opacity: canSave ? 1 : 0.4, flex: 1, justifyContent: 'center' }}>
            {initial ? 'Save changes' : 'Add to calendar'}
          </button>
        </div>

        {onDelete && (
          <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid #E8E0D3' }}>
            {!confirmingDelete ? (
              <button onClick={() => setConfirmingDelete(true)} style={{ background: 'transparent', border: 'none', color: '#8B3A2C', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <Trash2 size={12} /> Delete this event
              </button>
            ) : (
              <div style={{ padding: 10, background: '#FCEBE6', border: '1px solid #F0C8BD', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12.5, color: '#8B3A2C' }}>Delete event?</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => setConfirmingDelete(false)} style={{ background: 'transparent', border: '1px solid #D8CFC0', color: '#1A1612', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                  <button onClick={onDelete} style={{ background: '#8B3A2C', color: '#FAF6EE', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// HOLIDAYS VIEW
// =====================================================================
function HolidaysView({ data, setData, displayFont }) {
  const initial = data.holidayPlan || {};
  const [forKidId, setForKidId] = useState(initial.forKidId || (data.kids[0]?.id || ''));
  const [startDate, setStartDate] = useState(initial.startDate || '');
  const [endDate, setEndDate] = useState(initial.endDate || '');
  const [location, setLocation] = useState(initial.location || '');
  const [budget, setBudget] = useState(initial.budget || '');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(initial.programs || []);
  const [saved, setSaved] = useState(initial.saved || []);
  const locationInputRef = useRef(null);

  // Google Places Autocomplete on the suburb input
  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (!key || !locationInputRef.current) return;

    let autocomplete = null;
    let listener = null;

    const init = () => {
      if (!window.google?.maps?.places || !locationInputRef.current) return false;
      autocomplete = new window.google.maps.places.Autocomplete(locationInputRef.current, {
        componentRestrictions: { country: 'au' },
        types: ['(regions)'],
        fields: ['name', 'formatted_address', 'geometry', 'place_id', 'address_components']
      });
      listener = autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (!place) return;
        // Prefer suburb name; fall back to formatted address
        const suburbComponent = place.address_components?.find(c => c.types.includes('locality'));
        const stateComponent = place.address_components?.find(c => c.types.includes('administrative_area_level_1'));
        if (suburbComponent && stateComponent) {
          setLocation(suburbComponent.long_name + ', ' + stateComponent.short_name);
        } else {
          setLocation(place.formatted_address || place.name || '');
        }
      });
      return true;
    };

    // Try immediately, then poll while script loads
    if (!init()) {
      const timer = setInterval(() => { if (init()) clearInterval(timer); }, 250);
      const stopTimer = setTimeout(() => clearInterval(timer), 8000); // give up after 8s
      return () => { clearInterval(timer); clearTimeout(stopTimer); };
    }

    return () => {
      if (listener && window.google?.maps?.event) {
        window.google.maps.event.removeListener(listener);
      }
    };
  }, []);

  const selectedKid = data.kids.find(k => k.id === forKidId);

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
  };

  const search = async () => {
    if (!selectedKid) { setError('Pick a child first.'); return; }
    if (!startDate || !endDate) { setError('Set both holiday dates.'); return; }
    if (!location.trim()) { setError('Tell me the suburb so I can search the area.'); return; }
    setSearching(true);
    setError(null);
    try {
      const system = `You are a holiday program advisor for Australian families. Suggest realistic holiday programs for the specified child, location and dates.

Draw on knowledge of real Australian providers across categories:
- Sports: PCYC, local council holiday camps, sports academies, swimming schools, gymnastics centres, tennis clubs, badminton clubs
- STEM: Code Camp, Robogals, Lego/robotics workshops, science museum programs
- Arts: NIDA Open, ACTORS Drama, art studios, music academies, dance schools
- Outdoor: Bushcraft camps, scout/girl-guide day programs, surf camps, ranger programs
- Mixed/vacation care: OOSH, KidsClub, council vacation care programs
- Academic: Reading recovery, maths enrichment, language immersion

Use realistic Australian pricing ($150-450/week typical, premium specialty programs up to $600). Match the child's specific interests precisely. Return ONLY valid JSON, no markdown fences, no prose.

Schema: {"programs":[{"name":"program name","provider":"provider org","type":"sports|stem|arts|outdoor|academic|mixed","ageRange":"e.g. 5-10 years","schedule":"e.g. Mon-Fri 9am-3pm","weeks":"which week(s) of the holidays","costPerWeek":295,"distanceKm":3,"fitReason":"1-2 sentences why this suits THIS child specifically (use their name and interests)","bookingHint":"how/where to book"}]}`;

      const user = `Child: ${selectedKid.name}, age ${selectedKid.age}
Interests: ${selectedKid.interests || 'not specified'}
Allergies: ${selectedKid.allergies || 'none'}
Location: ${location} (Australia)
Holiday period: ${formatDate(startDate)} to ${formatDate(endDate)}
${budget ? `Budget per week: $${budget}` : 'Budget: flexible'}

Generate 6-8 specific holiday program recommendations realistic for this suburb during these dates. Mix categories. Best fit first.`;

      const raw = await callClaude(system, user);
      const parsed = extractJSON(raw);
      const programs = (parsed.programs || []).map((p, i) => ({ ...p, id: 'hp-' + Date.now() + '-' + i }));
      setResults(programs);
      setData({
        ...data,
        holidayPlan: {
          forKidId, startDate, endDate, location, budget,
          programs, saved,
          searchedAt: new Date().toISOString()
        }
      });
    } catch (e) {
      setError('Search failed: ' + (e.message || 'unknown error'));
    }
    setSearching(false);
  };

  const toggleSave = (programId) => {
    const newSaved = saved.includes(programId) ? saved.filter(id => id !== programId) : [...saved, programId];
    setSaved(newSaved);
    setData({ ...data, holidayPlan: { ...(data.holidayPlan || {}), saved: newSaved } });
  };

  const typeColor = (type) => {
    const map = { sports: '#2D5240', stem: '#3D5A78', arts: '#8B3A2C', outdoor: '#5B7C3A', academic: '#5C4A33', mixed: '#6B6259' };
    return map[type] || '#6B6259';
  };

  const savedPrograms = results.filter(p => saved.includes(p.id));

  return (
    <div style={{ paddingTop: 24 }}>
      <div style={{ fontSize: 11, color: '#8B7E70', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 6 }}>School Holidays</div>
      <h2 style={{ fontFamily: displayFont, fontSize: 30, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1.05, margin: '0 0 8px' }}>
        Two weeks off. <em>Already covered.</em>
      </h2>
      <p style={{ fontSize: 14, color: '#5C534A', lineHeight: 1.5, margin: '0 0 20px', maxWidth: 480 }}>
        Tell me when the holidays are, where you are, and which child. I'll find programs in your area that match their interests.
      </p>

      {/* Search form */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E0D3', borderRadius: 18, padding: 20, marginBottom: 16 }}>
        <label style={labelStyle}>Plan for</label>
        {data.kids.length > 0 ? (
          <select value={forKidId} onChange={e => setForKidId(e.target.value)} style={{ ...inputStyle, appearance: 'none', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238B7E70' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: 32 }}>
            {data.kids.map(k => <option key={k.id} value={k.id}>{k.name}{k.age ? ` (age ${k.age})` : ''}{k.interests ? ` — ${k.interests}` : ''}</option>)}
          </select>
        ) : (
          <div style={{ padding: '12px 14px', background: '#F1E9D8', borderRadius: 10, fontSize: 13, color: '#8B3A2C', marginBottom: 8 }}>Add a child in Settings first.</div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
          <div>
            <label style={labelStyle}>Start date</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
          </div>
          <div>
            <label style={labelStyle}>End date</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ ...inputStyle, marginBottom: 0 }} />
          </div>
        </div>

        <label style={{ ...labelStyle, marginTop: 14 }}>Suburb / area</label>
        <div style={{ position: 'relative' }}>
          <MapPin size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8B7E70', zIndex: 1 }} />
          <input ref={locationInputRef} value={location} onChange={e => setLocation(e.target.value)} placeholder="Start typing a suburb…" style={{ ...inputStyle, paddingLeft: 32 }} autoComplete="off" />
        </div>

        <label style={labelStyle}>Budget per week <span style={{ color: '#A89E92', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>· optional</span></label>
        <input value={budget} onChange={e => setBudget(e.target.value)} placeholder="e.g. 350" type="number" style={{ ...inputStyle, marginBottom: 4 }} />

        <button onClick={search} disabled={searching || data.kids.length === 0} style={{ ...btnPrimary, width: '100%', justifyContent: 'center', marginTop: 16, opacity: (searching || data.kids.length === 0) ? 0.5 : 1, cursor: searching ? 'wait' : 'pointer' }}>
          {searching ? <RotateCw size={14} className="spin" /> : <Sparkles size={14} />}
          {searching ? 'Searching programs in your area…' : 'Search holiday programs'}
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: '#FCEBE6', border: '1px solid #F0C8BD', borderRadius: 10, color: '#8B3A2C', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* Saved summary strip */}
      {savedPrograms.length > 0 && (
        <div style={{ background: 'linear-gradient(135deg, #2D5240 0%, #1F3D2F 100%)', borderRadius: 14, padding: '14px 16px', marginBottom: 12, color: '#F5F0E4' }}>
          <div style={{ fontSize: 10.5, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 600, opacity: 0.75, marginBottom: 4 }}>In your plan</div>
          <div style={{ fontSize: 14, fontWeight: 500 }}>
            {savedPrograms.length} program{savedPrograms.length === 1 ? '' : 's'} · ${savedPrograms.reduce((s, p) => s + (p.costPerWeek || 0), 0)}/week total
          </div>
        </div>
      )}

      {results.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, marginTop: 16 }}>
            <h3 style={{ fontFamily: displayFont, fontSize: 20, fontWeight: 500, letterSpacing: '-0.02em', margin: 0 }}>{results.length} matches</h3>
            {selectedKid && <span style={{ fontSize: 12, color: '#8B7E70' }}>for {selectedKid.name}</span>}
          </div>

          {results.map(p => {
            const isSaved = saved.includes(p.id);
            return (
              <div key={p.id} style={{ background: '#FFFFFF', border: '1px solid #E8E0D3', borderRadius: 16, padding: 16, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, color: typeColor(p.type), background: typeColor(p.type) + '15', padding: '3px 8px', borderRadius: 6, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>{p.type}</span>
                  <span style={{ fontSize: 11.5, color: '#8B7E70' }}>{p.ageRange}</span>
                  {p.distanceKm !== undefined && p.distanceKm !== null && <span style={{ fontSize: 11.5, color: '#8B7E70' }}>· {p.distanceKm}km</span>}
                </div>
                <h4 style={{ fontFamily: displayFont, fontSize: 19, fontWeight: 500, letterSpacing: '-0.015em', margin: '0 0 4px', color: '#1A1612', lineHeight: 1.2 }}>{p.name}</h4>
                <div style={{ fontSize: 12.5, color: '#6B6259', marginBottom: 10 }}>{p.provider}</div>
                <p style={{ fontSize: 13.5, lineHeight: 1.5, color: '#3D352D', margin: '0 0 12px' }}>{p.fitReason}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px', fontSize: 11.5, color: '#8B7E70', marginBottom: 12, paddingTop: 10, borderTop: '1px solid #F0E8D8' }}>
                  <div><span style={{ color: '#1A1612', fontWeight: 700 }}>${p.costPerWeek}</span> / week</div>
                  <div style={{ textAlign: 'right' }}>{p.schedule}</div>
                  <div style={{ gridColumn: 'span 2' }}>{p.weeks}</div>
                  {p.bookingHint && <div style={{ gridColumn: 'span 2', color: '#A89E92', fontStyle: 'italic', marginTop: 2 }}>{p.bookingHint}</div>}
                </div>
                <button onClick={() => toggleSave(p.id)} style={{ background: isSaved ? '#2D5240' : 'transparent', color: isSaved ? '#FAF6EE' : '#1A1612', border: `1px solid ${isSaved ? '#2D5240' : '#D8CFC0'}`, borderRadius: 100, padding: '7px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {isSaved ? <><Check size={12} /> Saved to plan</> : <><Plus size={12} /> Add to plan</>}
                </button>
              </div>
            );
          })}

          <p style={{ fontSize: 11, color: '#A89E92', marginTop: 14, lineHeight: 1.5, fontStyle: 'italic', textAlign: 'center', padding: '12px 16px', background: '#F1E9D8', borderRadius: 10 }}>
            AI-suggested matches based on known providers in your area. In production these connect to live booking via ActiveKids, council program APIs, and provider websites — with one-tap enrolment.
          </p>
        </>
      )}
    </div>
  );
}

// =====================================================================
// ASSISTANT VIEW
// =====================================================================
function AssistantView({ data, setData, displayFont }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState(data.chats || []);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async (text) => {
    const userMsg = text || input;
    if (!userMsg.trim()) return;
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    const kidsContext = data.kids.map(k => `${k.name} (${k.age}y, ${k.school || 'no school'}, allergies: ${k.allergies || 'none'}, picky: ${k.picky || 'none'}, interests: ${k.interests || 'none'})`).join('; ');
    const tasksContext = (data.tasks || []).filter(t => !t.completed).map(t => `${t.title} [${t.priority}, ${t.dueLabel}]`).join('; ') || 'none';
    const system = `You are the AI Chief of Staff for ${data.familyName}. You speak with the warmth of a trusted friend who's seen it all and the precision of an excellent operator. You are concise, dry, and never sycophantic. You never use emojis or exclamation marks. Address the parent directly. Two-to-four sentences typically; longer only when listing concrete options.

Family context:
- Kids: ${kidsContext || 'none yet'}
- Open tasks: ${tasksContext}
- This week's meal plan: ${data.mealPlan ? data.mealPlan.days.map(d => `${d.day}: ${d.name}`).join('; ') : 'none'}`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 1000,
          system,
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });
      if (!response.ok) {
        const txt = await response.text().catch(() => '');
        throw new Error('API ' + response.status + ': ' + txt.slice(0, 200));
      }
      const result = await response.json();
      const reply = result.content.map(c => c.text || '').join('').trim();
      const updated = [...newMessages, { role: 'assistant', content: reply }];
      setMessages(updated);
      setData({ ...data, chats: updated });
    } catch (e) {
      setMessages([...newMessages, { role: 'assistant', content: "Couldn't reach me: " + (e.message || 'unknown error') + '. Check VITE_ANTHROPIC_API_KEY and the model name.' }]);
    }
    setLoading(false);
  };

  const suggestions = [
    "What truly matters today?",
    "Plan Saturday around Idris' soccer",
    "Cheap birthday party ideas for a 5-year-old",
    "How do I handle Zara's fussy eating?"
  ];

  return (
    <div style={{ paddingTop: 24, display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 200px)' }}>
      <div style={{ fontSize: 11, color: '#8B7E70', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 500, marginBottom: 6 }}>The Chief of Staff</div>
      <h2 style={{ fontFamily: displayFont, fontSize: 30, fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1.05, margin: '0 0 20px' }}>
        Ask me <em>anything.</em>
      </h2>

      <div ref={scrollRef} style={{ flex: 1, marginBottom: 12, minHeight: 220 }}>
        {messages.length === 0 && (
          <div>
            <p style={{ fontSize: 13.5, color: '#8B7E70', lineHeight: 1.55, margin: '0 0 14px' }}>I know your family. Try one of these to start:</p>
            <div style={{ display: 'grid', gap: 6 }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => send(s)} style={{ background: '#FFFFFF', border: '1px solid #E8E0D3', borderRadius: 12, padding: '12px 14px', textAlign: 'left', fontSize: 14, fontFamily: 'inherit', color: '#1A1612', cursor: 'pointer', lineHeight: 1.4, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span>{s}</span>
                  <ChevronRight size={14} color="#8B3A2C" />
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
            <div style={{
              maxWidth: '85%',
              padding: '11px 15px',
              borderRadius: 16,
              background: m.role === 'user' ? '#1A1612' : '#FFFFFF',
              color: m.role === 'user' ? '#FAF6EE' : '#1A1612',
              border: m.role === 'user' ? 'none' : '1px solid #E8E0D3',
              fontSize: 14.5,
              lineHeight: 1.55,
              fontFamily: m.role === 'assistant' ? displayFont : 'inherit',
              letterSpacing: m.role === 'assistant' ? '-0.005em' : 0,
              fontWeight: m.role === 'assistant' ? 400 : 400,
              whiteSpace: 'pre-wrap'
            }}>{m.content}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '12px 15px', borderRadius: 16, background: '#FFFFFF', border: '1px solid #E8E0D3', color: '#8B7E70', fontSize: 13, fontStyle: 'italic' }}>thinking…</div>
          </div>
        )}
      </div>

      <div style={{ position: 'sticky', bottom: 88, background: '#FAF6EE', paddingTop: 8 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Type your question…"
            style={{ flex: 1, padding: '12px 16px', borderRadius: 14, border: '1px solid #D8CFC0', background: '#FFFFFF', fontSize: 14.5, fontFamily: 'inherit', color: '#1A1612', outline: 'none' }}
          />
          <button onClick={() => send()} disabled={loading || !input.trim()} style={{ background: '#1A1612', color: '#FAF6EE', border: 'none', borderRadius: 14, padding: '0 16px', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', opacity: loading || !input.trim() ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Send size={16} />
          </button>
        </div>
        {messages.length > 0 && (
          <button onClick={() => { setMessages([]); setData({ ...data, chats: [] }); }} style={{ background: 'transparent', border: 'none', color: '#8B7E70', fontSize: 11.5, marginTop: 6, cursor: 'pointer', fontFamily: 'inherit' }}>Clear conversation</button>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// SETTINGS PANEL
// =====================================================================
function SettingsPanel({ data, setData, onClose, displayFont, session }) {
  const [confirmingReset, setConfirmingReset] = useState(false);

  const reset = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    window.location.reload();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,22,18,0.4)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#FAF6EE', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 640, maxHeight: '85vh', overflow: 'auto', padding: '24px 24px 40px', boxShadow: '0 -8px 40px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: displayFont, fontSize: 24, fontWeight: 500, letterSpacing: '-0.02em', margin: 0 }}>Settings</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#6B6259' }}><X size={20} /></button>
        </div>

        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Family name</label>
          <input value={data.familyName} onChange={e => setData({ ...data, familyName: e.target.value })} style={inputStyle} />
        </div>

        <h4 style={{ fontFamily: displayFont, fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em', margin: '24px 0 12px' }}>The kids</h4>
        {data.kids.map((k, i) => (
          <KidEditor key={k.id} kid={k} onChange={(updated) => {
            const nextKids = [...data.kids];
            nextKids[i] = updated;
            setData({ ...data, kids: nextKids });
          }} onRemove={() => {
            setData({ ...data, kids: data.kids.filter((_, ix) => ix !== i) });
          }} />
        ))}
        <button onClick={() => setData({ ...data, kids: [...data.kids, { id: 'k' + Date.now(), name: 'New child', age: 0, school: '', allergies: '', picky: '', interests: '', colour: KID_COLOURS[data.kids.length % KID_COLOURS.length].id }] })} style={{ ...btnGhost, width: '100%', justifyContent: 'center' }}>
          <Plus size={14} /> Add child
        </button>

        {supabase && session && (
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #E8E0D3' }}>
            <label style={labelStyle}>Signed in as</label>
            <div style={{ fontSize: 13, color: '#1A1612', marginBottom: 12, wordBreak: 'break-all' }}>{session.user.email}</div>
            <button onClick={() => supabase.auth.signOut()} style={{ background: 'transparent', border: '1px solid #D8CFC0', color: '#1A1612', borderRadius: 100, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Sign out
            </button>
            <p style={{ fontSize: 11, color: '#8B7E70', marginTop: 10, lineHeight: 1.5 }}>Your data is synced across all your devices. Signing out doesn't delete anything — sign in again from another device to continue.</p>
          </div>
        )}

        <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid #E8E0D3' }}>
          {!confirmingReset ? (
            <button onClick={() => setConfirmingReset(true)} style={{ background: 'transparent', border: '1px solid #D8CFC0', color: '#8B3A2C', borderRadius: 100, padding: '9px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Reset all data
            </button>
          ) : (
            <div style={{ padding: 12, background: '#FCEBE6', border: '1px solid #F0C8BD', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: '#8B3A2C' }}>Clear all data permanently?</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setConfirmingReset(false)} style={{ background: 'transparent', border: '1px solid #D8CFC0', color: '#1A1612', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={reset} style={{ background: '#8B3A2C', color: '#FAF6EE', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Reset</button>
              </div>
            </div>
          )}
          <p style={{ fontSize: 11.5, color: '#8B7E70', marginTop: 14, lineHeight: 1.5 }}>Family COO prototype · v0.3 · {supabase ? 'Synced across devices via Supabase' : 'Data stored locally on this device'}.</p>
        </div>
      </div>
    </div>
  );
}

function KidEditor({ kid, onChange, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const currentColour = KID_COLOURS.find(c => c.id === kid.colour) || KID_COLOURS[0];
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E8E0D3', borderLeft: '3px solid ' + currentColour.hex, borderRadius: 14, padding: 14, marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: expanded ? 12 : 0 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{kid.name || '(unnamed)'}</div>
          <div style={{ fontSize: 12, color: '#8B7E70' }}>Age {kid.age || '?'} · {kid.school || 'no school'}</div>
        </div>
        <button onClick={() => { setExpanded(!expanded); setConfirmingRemove(false); }} style={{ background: 'transparent', border: 'none', color: '#8B3A2C', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{expanded ? 'Done' : 'Edit'}</button>
      </div>
      {expanded && (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input placeholder="Name" value={kid.name} onChange={e => onChange({ ...kid, name: e.target.value })} style={{ ...inputStyle, marginBottom: 0, flex: 2 }} />
            <input placeholder="Age" value={kid.age} onChange={e => onChange({ ...kid, age: parseInt(e.target.value) || 0 })} style={{ ...inputStyle, marginBottom: 0, flex: 1 }} />
          </div>
          <input placeholder="School" value={kid.school} onChange={e => onChange({ ...kid, school: e.target.value })} style={inputStyle} />
          <input placeholder="Allergies" value={kid.allergies} onChange={e => onChange({ ...kid, allergies: e.target.value })} style={inputStyle} />
          <input placeholder="Picky notes" value={kid.picky} onChange={e => onChange({ ...kid, picky: e.target.value })} style={inputStyle} />
          <input placeholder="Interests" value={kid.interests} onChange={e => onChange({ ...kid, interests: e.target.value })} style={inputStyle} />
          <label style={{ ...labelStyle, marginTop: 4 }}>Colour</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            {KID_COLOURS.map(c => (
              <button key={c.id} onClick={() => onChange({ ...kid, colour: c.id })} title={c.name} style={{
                width: 32, height: 32, borderRadius: '50%',
                background: c.hex,
                border: kid.colour === c.id ? '3px solid #1A1612' : '2px solid transparent',
                cursor: 'pointer',
                padding: 0,
                outlineOffset: 2
              }} />
            ))}
          </div>
          {!confirmingRemove ? (
            <button onClick={() => setConfirmingRemove(true)} style={{ background: 'transparent', border: 'none', color: '#8B3A2C', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Trash2 size={12} /> Remove this child
            </button>
          ) : (
            <div style={{ marginTop: 12, padding: 10, background: '#FCEBE6', border: '1px solid #F0C8BD', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12.5, color: '#8B3A2C' }}>Remove {kid.name || 'this child'}?</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setConfirmingRemove(false)} style={{ background: 'transparent', border: '1px solid #D8CFC0', color: '#1A1612', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                <button onClick={onRemove} style={{ background: '#8B3A2C', color: '#FAF6EE', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Remove</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// =====================================================================
// SHARED STYLES
// =====================================================================
const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 14px',
  borderRadius: 10,
  border: '1px solid #D8CFC0',
  background: '#FFFFFF',
  fontSize: 14,
  fontFamily: 'inherit',
  color: '#1A1612',
  marginBottom: 8,
  outline: 'none'
};

const labelStyle = {
  display: 'block',
  fontSize: 11,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  fontWeight: 600,
  color: '#8B7E70',
  marginBottom: 8
};

const btnPrimary = {
  background: '#8B3A2C',
  color: '#FAF6EE',
  border: 'none',
  borderRadius: 100,
  padding: '11px 20px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  letterSpacing: '0.01em'
};

const btnGhost = {
  background: 'transparent',
  color: '#1A1612',
  border: '1px solid #D8CFC0',
  borderRadius: 100,
  padding: '11px 20px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8
};

// Inject spin animation
if (typeof document !== 'undefined' && !document.getElementById('coo-anim')) {
  const style = document.createElement('style');
  style.id = 'coo-anim';
  style.textContent = `
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .spin { animation: spin 0.9s linear infinite; }
    *::-webkit-scrollbar { display: none; }
    * { scrollbar-width: none; }
  `;
  document.head.appendChild(style);
}
