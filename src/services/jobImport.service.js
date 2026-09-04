import { Job } from '../models/Job.js';

/**
 * Job import from public job boards — Module 2 (Adreed Saadad Hasan, 22301190).
 *
 * Pulls listings from Remotive and Arbeitnow, normalises two quite different
 * payloads onto our own Job schema, and upserts them keyed by
 * (source, externalId) so re-running a sync updates rather than duplicates.
 *
 * Neither board requires an API key, which is why they were chosen: the import
 * works on a fresh clone with no extra setup.
 */

const SOURCES = {
  remotive: 'https://remotive.com/api/remote-jobs',
  arbeitnow: 'https://www.arbeitnow.com/api/job-board-api',
};

const DEFAULT_LIMIT = 40;
const REQUEST_TIMEOUT_MS = 20000;

// Remotive and Arbeitnow are free APIs with a fair-use expectation, so the
// cost of an import is an outbound call to each — not a permission concern.
// A global cooldown lets any signed-in seeker ask for fresher jobs while
// keeping the traffic we send the boards bounded, however many users tap it.
const COOLDOWN_MS = 10 * 60 * 1000;

/* --------------------------------------------------------------- helpers --- */

/** Board descriptions arrive as HTML; the app renders plain text. */
function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function truncate(text, max) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

/** Boards spell job types every which way; collapse onto our four. */
function normaliseType(raw) {
  const value = String(raw ?? '').toLowerCase().replace(/[\s_-]/g, '');
  if (value.includes('intern')) return 'internship';
  if (value.includes('parttime')) return 'part-time';
  if (value.includes('contract') || value.includes('freelance')) {
    return 'contract';
  }
  return 'full-time';
}

/**
 * Inferred from the title, because neither board publishes a seniority field.
 * Checked longest-first so "senior" is not shadowed by a bare "engineer", and
 * defaults to mid rather than guessing.
 */
function inferExperienceLevel(title) {
  const t = String(title ?? '').toLowerCase();
  if (/\b(intern|internship|trainee)\b/.test(t)) return 'entry';
  if (/\b(junior|jr\.?|entry[- ]level|graduate)\b/.test(t)) return 'junior';
  if (/\b(lead|principal|staff|head of|director)\b/.test(t)) return 'lead';
  if (/\b(senior|sr\.?)\b/.test(t)) return 'senior';
  return 'mid';
}

/**
 * Best-effort salary parse. Remotive's `salary` is free text — "$60,000 -
 * $90,000", "€50k-70k", "Competitive". Anything we cannot read confidently
 * becomes null rather than a fabricated number, because a wrong salary is worse
 * than a missing one when the search filters on it.
 */
function parseSalary(raw) {
  if (!raw) return { salaryMin: null, salaryMax: null, currency: 'USD' };

  const text = String(raw);
  const currency = /€|eur/i.test(text)
    ? 'EUR'
    : /£|gbp/i.test(text)
      ? 'GBP'
      : 'USD';

  const numbers = [...text.matchAll(/(\d[\d,.]*)\s*(k\b)?/gi)]
    .map((m) => {
      const n = Number(m[1].replace(/[,\s]/g, ''));
      if (Number.isNaN(n)) return null;
      // "70k" is unambiguous. A bare number below 1000 is not — "$14" is far
      // more likely an hourly rate than 14,000 a year — so it is discarded
      // rather than inflated into a figure the salary filter would trust.
      if (m[2]) return n * 1000;
      return n >= 1000 ? n : null;
    })
    .filter((n) => n !== null && n >= 1000 && n <= 1_000_000);

  if (numbers.length === 0) {
    return { salaryMin: null, salaryMax: null, currency };
  }
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  return { salaryMin: min, salaryMax: max, currency };
}

/** Splits a description into bullet-ish lines to fill `responsibilities`. */
function extractResponsibilities(text, max = 6) {
  return text
    .split('\n')
    .map((line) => line.replace(/^[•\-*•]\s*/, '').trim())
    .filter((line) => line.length >= 25 && line.length <= 200)
    .slice(0, max);
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'JobSensei/1.0' },
    });
    if (!res.ok) {
      throw new Error(`${url} responded ${res.status} ${res.statusText}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------ normalisers --- */

function fromRemotive(job) {
  const description = stripHtml(job.description);
  const { salaryMin, salaryMax, currency } = parseSalary(job.salary);
  const location = (job.candidate_required_location || 'Remote').trim();

  return {
    title: String(job.title || '').trim(),
    company: String(job.company_name || '').trim(),
    location,
    type: normaliseType(job.job_type),
    // Every Remotive listing is a remote role — that is the whole board.
    workMode: 'remote',
    experienceLevel: inferExperienceLevel(job.title),
    description: truncate(description, 4000) || 'No description provided.',
    responsibilities: extractResponsibilities(description),
    requirements: [],
    skills: (job.tags || []).map((t) => String(t).trim()).filter(Boolean),
    salaryMin,
    salaryMax,
    currency,
    deadline: null,
    sourceLink: job.url || null,
    source: 'remotive',
    externalId: String(job.id),
    postedAt: job.publication_date ? new Date(job.publication_date) : new Date(),
    status: 'open',
  };
}

function fromArbeitnow(job) {
  const description = stripHtml(job.description);

  return {
    title: String(job.title || '').trim(),
    company: String(job.company_name || '').trim(),
    location: String(job.location || 'Not specified').trim(),
    type: normaliseType((job.job_types || [])[0]),
    workMode: job.remote ? 'remote' : 'onsite',
    experienceLevel: inferExperienceLevel(job.title),
    description: truncate(description, 4000) || 'No description provided.',
    responsibilities: extractResponsibilities(description),
    requirements: [],
    skills: (job.tags || []).map((t) => String(t).trim()).filter(Boolean),
    // Arbeitnow publishes no salary figures at all.
    salaryMin: null,
    salaryMax: null,
    currency: 'EUR',
    deadline: null,
    sourceLink: job.url || null,
    source: 'arbeitnow',
    externalId: String(job.slug),
    postedAt: job.created_at ? new Date(job.created_at * 1000) : new Date(),
    status: 'open',
  };
}

/* ---------------------------------------------------------------- import --- */

/**
 * When an imported listing was last written. Derived from the jobs themselves
 * rather than stored separately, so it survives a restart and doesn't need a
 * collection of its own.
 */
export async function lastImportAt() {
  const newest = await Job.findOne({ source: { $ne: 'internal' } })
    .sort({ updatedAt: -1 })
    .select('updatedAt')
    .lean();
  return newest?.updatedAt ?? null;
}

async function loadSource(source, limit) {
  if (source === 'remotive') {
    const payload = await fetchJson(`${SOURCES.remotive}?limit=${limit}`);
    return (payload.jobs || []).slice(0, limit).map(fromRemotive);
  }
  if (source === 'arbeitnow') {
    const payload = await fetchJson(SOURCES.arbeitnow);
    return (payload.data || []).slice(0, limit).map(fromArbeitnow);
  }
  throw new Error(`Unknown source "${source}"`);
}

/**
 * Imports from the named sources. Each source is handled independently so one
 * board being down does not lose the other's results — a failure is reported in
 * the response rather than thrown.
 *
 * @returns per-source counts plus the combined totals.
 */
export async function importJobs({
  sources = Object.keys(SOURCES),
  limit = DEFAULT_LIMIT,
  force = false,
} = {}) {
  const last = await lastImportAt();
  const nextAllowedAt = last ? new Date(last.getTime() + COOLDOWN_MS) : null;

  // Inside the cooldown this is a no-op rather than an error: the caller asked
  // for fresh jobs and the jobs are already fresh, which is a success.
  if (!force && nextAllowedAt && nextAllowedAt > new Date()) {
    return {
      skipped: true,
      lastImportAt: last,
      nextAllowedAt,
      cooldownMinutes: Math.round(COOLDOWN_MS / 60000),
      totals: { fetched: 0, created: 0, updated: 0, skipped: 0 },
      sources: [],
    };
  }

  const results = [];

  for (const source of sources) {
    const started = Date.now();
    try {
      const listings = await loadSource(source, limit);
      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const listing of listings) {
        if (!listing.title || !listing.company || !listing.externalId) {
          skipped++;
          continue;
        }
        const outcome = await Job.updateOne(
          { source: listing.source, externalId: listing.externalId },
          { $set: listing },
          { upsert: true },
        );
        if (outcome.upsertedCount) created++;
        else updated++;
      }

      results.push({
        source,
        ok: true,
        fetched: listings.length,
        created,
        updated,
        skipped,
        ms: Date.now() - started,
      });
    } catch (error) {
      results.push({
        source,
        ok: false,
        error: error.message,
        ms: Date.now() - started,
      });
    }
  }

  const totals = results.reduce(
    (acc, r) => ({
      fetched: acc.fetched + (r.fetched || 0),
      created: acc.created + (r.created || 0),
      updated: acc.updated + (r.updated || 0),
      skipped: acc.skipped + (r.skipped || 0),
    }),
    { fetched: 0, created: 0, updated: 0, skipped: 0 },
  );

  return {
    skipped: false,
    lastImportAt: new Date(),
    cooldownMinutes: Math.round(COOLDOWN_MS / 60000),
    totals,
    sources: results,
  };
}

/** Counts of what is currently stored, grouped by where it came from. */
export async function importStatus() {
  const rows = await Job.aggregate([
    {
      $group: {
        _id: { $ifNull: ['$source', 'internal'] },
        count: { $sum: 1 },
        latest: { $max: '$postedAt' },
      },
    },
    { $sort: { count: -1 } },
  ]);

  return {
    available: Object.keys(SOURCES),
    lastImportAt: await lastImportAt(),
    cooldownMinutes: Math.round(COOLDOWN_MS / 60000),
    stored: rows.map((r) => ({
      source: r._id,
      count: r.count,
      latest: r.latest,
    })),
    total: rows.reduce((sum, r) => sum + r.count, 0),
  };
}

export const IMPORT_SOURCES = Object.keys(SOURCES);
