import { CareerProfile } from '../models/CareerProfile.js';
import { Resume } from '../models/Resume.js';

/**
 * Job match scoring — Module 4 (Adreed Saadad Hasan, 22301190).
 *
 * Compares a seeker's career profile, and optionally a chosen resume, against
 * one job's requirements and produces a single suitability score plus the
 * qualifications that earned it.
 *
 * Deliberately says nothing about how to close a gap: learning
 * recommendations are the skill-gap feature's job (Module 3, Taznia), and
 * duplicating them here would put two different answers in front of the user.
 * The breakdown explains each area's score in prose so the number is
 * accountable without turning into a study plan.
 */

/** Sums to 100. Skills dominate because that is what a job listing actually specifies. */
const WEIGHTS = {
  skills: 45,
  experience: 20,
  preferences: 25,
  education: 10,
};

/** Rough years-of-experience bands each seniority label implies. */
const LEVEL_YEARS = {
  entry: 0,
  junior: 1,
  mid: 3,
  senior: 5,
  lead: 8,
};

const norm = (value) => String(value ?? '').trim().toLowerCase();

/** Case- and punctuation-insensitive, so "Node.js" matches "nodejs". */
const key = (value) => norm(value).replace(/[^a-z0-9+#]/g, '');

function monthsBetween(start, end) {
  if (!start) return 0;
  const to = end ? new Date(end) : new Date();
  const from = new Date(start);
  const months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());
  return months > 0 ? months : 0;
}

function totalYearsOfExperience(profile) {
  const months = (profile.experience || []).reduce(
    (sum, role) =>
      sum + monthsBetween(role.startDate, role.isCurrent ? null : role.endDate),
    0,
  );
  return months / 12;
}

/* ---------------------------------------------------------------- areas --- */

/**
 * What share of the job's listed skills the candidate can evidence, from the
 * profile's skill list, the skills attached to past roles, and the chosen
 * resume. A job that lists no skills cannot be scored on them, so the area is
 * treated as neutral rather than as a zero the candidate cannot fix.
 */
function scoreSkills(job, profile, resume) {
  const required = (job.skills || []).filter(Boolean);
  if (required.length === 0) {
    return {
      area: 'Skills',
      score: WEIGHTS.skills * 0.6,
      max: WEIGHTS.skills,
      detail: 'This listing does not name specific skills, so it is scored neutrally.',
      matched: [],
      requiredCount: 0,
    };
  }

  const owned = new Set();
  for (const skill of profile.skills || []) owned.add(key(skill.name));
  for (const role of profile.experience || []) {
    for (const skill of role.skills || []) owned.add(key(skill));
  }
  for (const skill of (resume && resume.skills) || []) owned.add(key(skill));

  const matched = required.filter((skill) => owned.has(key(skill)));
  const ratio = matched.length / required.length;

  return {
    area: 'Skills',
    score: WEIGHTS.skills * ratio,
    max: WEIGHTS.skills,
    detail: `Evidenced ${matched.length} of the ${required.length} skills this role lists.`,
    matched,
    requiredCount: required.length,
  };
}

/**
 * Compares total experience against the years the job's seniority implies.
 * Being over the bar is not penalised — an eight-year engineer is not a worse
 * fit for a mid role — but falling short scales down proportionally.
 */
function scoreExperience(job, profile) {
  const years = totalYearsOfExperience(profile);
  const expected = LEVEL_YEARS[job.experienceLevel] ?? LEVEL_YEARS.mid;

  if (expected === 0) {
    return {
      area: 'Experience',
      score: WEIGHTS.experience,
      max: WEIGHTS.experience,
      detail: 'This is an entry-level role, so prior experience is not required.',
      years,
    };
  }

  const ratio = Math.min(1, years / expected);
  const rounded = Math.round(years * 10) / 10;

  return {
    area: 'Experience',
    score: WEIGHTS.experience * ratio,
    max: WEIGHTS.experience,
    detail:
      years >= expected
        ? `${rounded} years of experience meets what a ${job.experienceLevel} role expects.`
        : `${rounded} of the roughly ${expected} years a ${job.experienceLevel} role expects.`,
    years,
  };
}

/**
 * How well the job fits what the seeker said they want: role title, location,
 * working arrangement, employment type, and pay. Each sub-check only counts
 * when the seeker actually stated a preference, so an empty preferences
 * section does not drag the score down.
 */
function scorePreferences(job, profile) {
  const prefs = profile.preferences || {};
  const checks = [];

  const roles = prefs.preferredRoles || [];
  if (roles.length) {
    const title = norm(job.title);
    const hit = roles.some((role) => {
      const words = norm(role).split(/\s+/).filter((w) => w.length > 3);
      return words.length ? words.some((w) => title.includes(w)) : false;
    });
    checks.push({ label: 'Role title', hit });
  }

  const locations = prefs.preferredLocations || [];
  if (locations.length) {
    const jobLocation = norm(job.location);
    const hit = locations.some((loc) => {
      const l = norm(loc);
      // "Remote" as a preference is satisfied by a remote working arrangement,
      // whatever the listing puts in its location field.
      if (l === 'remote') return job.workMode === 'remote';
      return jobLocation.includes(l) || l.includes(jobLocation);
    });
    checks.push({ label: 'Location', hit });
  }

  if ((prefs.workModes || []).length) {
    checks.push({
      label: 'Working arrangement',
      hit: prefs.workModes.includes(job.workMode),
    });
  }

  if ((prefs.employmentTypes || []).length) {
    checks.push({
      label: 'Employment type',
      hit: prefs.employmentTypes.includes(job.type),
    });
  }

  if (prefs.salary && (job.salaryMin || job.salaryMax)) {
    // Overlap, not containment: any intersection of the two ranges counts.
    const wantMin = prefs.salary.min ?? 0;
    const jobMax = job.salaryMax ?? job.salaryMin ?? 0;
    checks.push({ label: 'Salary', hit: jobMax >= wantMin });
  }

  if (checks.length === 0) {
    return {
      area: 'Preferences',
      score: WEIGHTS.preferences * 0.6,
      max: WEIGHTS.preferences,
      detail: 'No job preferences set yet, so this area is scored neutrally.',
      checks,
    };
  }

  const hits = checks.filter((c) => c.hit);
  return {
    area: 'Preferences',
    score: WEIGHTS.preferences * (hits.length / checks.length),
    max: WEIGHTS.preferences,
    detail: `Matches ${hits.length} of your ${checks.length} stated preferences (${checks
      .map((c) => `${c.label}: ${c.hit ? 'yes' : 'no'}`)
      .join(', ')}).`,
    checks,
  };
}

/** Credit for a completed record, since listings rarely state a degree requirement. */
function scoreEducation(profile, resume) {
  const entries = (profile.education || []).length;
  const fromResume = ((resume && resume.education) || []).length;

  if (entries === 0 && fromResume === 0) {
    return {
      area: 'Education',
      score: 0,
      max: WEIGHTS.education,
      detail: 'No education on file, so this area scores nothing.',
    };
  }

  const certified = (profile.certifications || []).length > 0;
  return {
    area: 'Education',
    score: certified ? WEIGHTS.education : WEIGHTS.education * 0.8,
    max: WEIGHTS.education,
    detail: certified
      ? 'Education and certifications are both on file.'
      : 'Education is on file; certifications would strengthen it.',
  };
}

/* --------------------------------------------------------------- verdict --- */

function verdictFor(score) {
  if (score >= 80) return { verdict: 'strong', label: 'Strong match' };
  if (score >= 60) return { verdict: 'good', label: 'Good match' };
  if (score >= 40) return { verdict: 'fair', label: 'Fair match' };
  return { verdict: 'low', label: 'Low match' };
}

/** The two or three things most worth putting in front of the user. */
function buildStrengths(areas, skillArea) {
  const strengths = [];

  if (skillArea.matched.length) {
    strengths.push({
      label: 'Skills you already have',
      detail: skillArea.matched.slice(0, 6).join(', '),
    });
  }

  for (const area of areas) {
    if (area.area === 'Skills') continue;
    // Only areas scoring well are "strengths"; the rest are just the breakdown.
    if (area.score / area.max >= 0.75) {
      strengths.push({ label: area.area, detail: area.detail });
    }
  }

  return strengths;
}

/* ---------------------------------------------------------------- entry --- */

/**
 * @param job     a Job document (lean or hydrated)
 * @param userId  the signed-in seeker
 * @param resumeId optional; falls back to the default resume, then to none
 */
export async function scoreJobMatch({ job, userId, resumeId }) {
  const profile = await CareerProfile.findOne({ user: userId }).lean();

  if (!profile) {
    return {
      scored: false,
      reason:
        'Create your career profile before matching — there is nothing to compare against yet.',
    };
  }

  let resume = null;
  if (resumeId) {
    resume = await Resume.findOne({ _id: resumeId, userId }).lean();
    if (!resume) {
      return {
        scored: false,
        reason: 'That resume does not exist, or it belongs to another account.',
      };
    }
  } else {
    resume = await Resume.findOne({ userId, isDefault: true }).lean();
  }

  const skills = scoreSkills(job, profile, resume);
  const experience = scoreExperience(job, profile);
  const preferences = scorePreferences(job, profile);
  const education = scoreEducation(profile, resume);

  const areas = [skills, experience, preferences, education];
  const overallScore = Math.round(
    areas.reduce((sum, area) => sum + area.score, 0),
  );
  const { verdict, label } = verdictFor(overallScore);

  return {
    scored: true,
    job: {
      id: String(job._id),
      title: job.title,
      company: job.company,
      experienceLevel: job.experienceLevel,
    },
    resume: resume ? { id: String(resume._id), title: resume.title } : null,
    overallScore,
    verdict,
    verdictLabel: label,
    summary:
      `${label} — you meet ${overallScore}% of what this role looks for` +
      (resume ? `, based on your profile and "${resume.title}".` : ', based on your profile.'),
    strengths: buildStrengths(areas, skills),
    breakdown: areas.map((area) => ({
      area: area.area,
      score: Math.round(area.score),
      max: area.max,
      detail: area.detail,
    })),
    matchedSkills: skills.matched,
    // A count, not a list: naming what is missing alongside a score edges into
    // the skill-gap feature, which owns that conversation and its learning links.
    skillsNotEvidenced: Math.max(0, skills.requiredCount - skills.matched.length),
  };
}
