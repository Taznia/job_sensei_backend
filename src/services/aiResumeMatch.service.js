import { GoogleGenAI } from '@google/genai';

import { env } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

/**
 * Gemini-backed resume/job-description analysis.
 *
 * The API key lives in `env.geminiApiKey` and never leaves the server. The
 * Flutter app posts a resume and a job description and gets structured advice
 * back, so no key is compiled into the shipped app.
 */

/** Flattens a Resume document into the plain text the prompt works with. */
export function resumeToText(resume) {
  const lines = [];
  const push = (label, value) => {
    if (value && String(value).trim()) lines.push(`${label}: ${value}`);
  };
  const pushList = (label, items) => {
    if (Array.isArray(items) && items.length) {
      lines.push('', `${label}:`);
      for (const item of items) lines.push(`• ${item}`);
    }
  };

  push('Resume Title', resume.title);
  push('Target Field', resume.targetField);
  push('Name', resume.fullName);
  push('Email', resume.email);
  push('Phone', resume.phone);
  push('Location', resume.location);
  push('LinkedIn', resume.linkedin);
  push('Portfolio', resume.portfolio);

  if (resume.summary && resume.summary.trim()) {
    lines.push('', `SUMMARY:\n${resume.summary}`);
  }
  if (Array.isArray(resume.skills) && resume.skills.length) {
    lines.push('', `SKILLS:\n${resume.skills.join(', ')}`);
  }

  pushList('EXPERIENCE', resume.experience);
  pushList('PROJECTS', resume.projects);
  pushList('EDUCATION', resume.education);
  pushList('CERTIFICATIONS', resume.certifications);

  return lines.join('\n');
}

function buildPrompt(resumeText, jobDescription) {
  return `
You are an expert resume and career advisor.

Compare the following resume with the job description and produce a thorough analysis.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Return ONLY valid JSON using exactly this structure (no markdown, no extra keys):

{
  "matchScore": 0,
  "strongKeywords": [],
  "recommendedKeywords": [],
  "projectHighlights": [
    {
      "project": "",
      "reason": "",
      "suggestedBullets": []
    }
  ],
  "skillOrdering": [],
  "summaryImprovement": "",
  "overallFeedback": "",
  "strengths": [],
  "gaps": []
}

Rules:
- matchScore: integer 0-100 representing how well the resume fits the job.
- strongKeywords: keywords already in the resume that match the job well.
- recommendedKeywords: important job keywords missing or underrepresented in the resume.
- projectHighlights: resume projects/experiences worth emphasising; each includes a project name, reason why it is relevant, and 2-3 improved bullet points the user could add/rewrite.
- skillOrdering: the user's skills reordered with the most relevant to this job listed first.
- summaryImprovement: a rewritten, improved professional summary tailored to this job.
- overallFeedback: 2-3 sentences of overall match assessment and top advice.
- strengths: 3-5 things the resume already does well for this role.
- gaps: 3-5 missing areas or weaknesses the resume has for this role.
- Do NOT invent experience, skills, or qualifications not present in the resume.
`;
}

/** Models occasionally wrap JSON in a markdown fence despite being told not to. */
function stripCodeFences(text) {
  let out = String(text).trim();
  if (out.startsWith('```json')) {
    out = out.replace('```json', '').split('```').join('').trim();
  } else if (out.startsWith('```')) {
    out = out.split('```').join('').trim();
  }
  return out;
}

/** Guarantees the saved document has every field, whatever the model returned. */
function normalise(result) {
  const strings = (value) => (Array.isArray(value) ? value.map(String) : []);

  return {
    matchScore:
      typeof result.matchScore === 'number'
        ? Math.min(100, Math.max(0, Math.round(result.matchScore)))
        : 0,
    strongKeywords: strings(result.strongKeywords),
    recommendedKeywords: strings(result.recommendedKeywords),
    projectHighlights: Array.isArray(result.projectHighlights)
      ? result.projectHighlights.map((item) => ({
          project: String(item?.project || ''),
          reason: String(item?.reason || ''),
          suggestedBullets: strings(item?.suggestedBullets),
        }))
      : [],
    skillOrdering: strings(result.skillOrdering),
    summaryImprovement: String(result.summaryImprovement || ''),
    overallFeedback: String(result.overallFeedback || ''),
    strengths: strings(result.strengths),
    gaps: strings(result.gaps),
  };
}

/** Upstream statuses worth retrying: transient overload or rate limiting. */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 800;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function analyseResumeMatch({ resumeText, jobDescription }) {
  if (!env.geminiApiKey) {
    throw new HttpError(
      503,
      'AI Resume Match is not configured. Set GEMINI_API_KEY in the API environment.',
    );
  }

  const ai = new GoogleGenAI({ apiKey: env.geminiApiKey });
  const prompt = buildPrompt(resumeText, jobDescription);

  let text;
  let lastError;

  // Gemini answers a demand spike with a 503 and asks the caller to retry, so
  // a single attempt turns a routine blip into a failed analysis for the user.
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model: env.geminiModel,
        contents: prompt,
        config: { temperature: 0.4, responseMimeType: 'application/json' },
      });
      text = response.text;
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      const status = error?.status ?? error?.response?.status;

      if (!RETRYABLE_STATUSES.has(status) || attempt === MAX_ATTEMPTS) break;

      // Exponential backoff with jitter, so parallel callers do not retry in
      // lockstep and re-create the spike they are backing off from.
      const delay = BASE_BACKOFF_MS * 2 ** (attempt - 1);
      const jitter = Math.floor(Math.random() * 250);
      console.warn(
        `Gemini ${status} on attempt ${attempt}/${MAX_ATTEMPTS}; retrying in ${delay + jitter}ms`,
      );
      await sleep(delay + jitter);
    }
  }

  if (lastError) {
    console.error('Gemini call failed:', lastError);
    const status = lastError?.status ?? lastError?.response?.status;
    if (status === 429) {
      throw new HttpError(429, 'The AI service is rate limited. Try again shortly.');
    }
    if (RETRYABLE_STATUSES.has(status)) {
      throw new HttpError(
        503,
        'The AI service is busy right now. Please try again in a moment.',
      );
    }
    throw new HttpError(502, 'The AI service could not be reached. Try again.');
  }

  if (!text || !String(text).trim()) {
    throw new HttpError(502, 'The AI service returned an empty analysis.');
  }

  try {
    return normalise(JSON.parse(stripCodeFences(text)));
  } catch {
    console.error('Gemini returned invalid JSON:', text);
    throw new HttpError(502, 'The AI service returned a malformed analysis.');
  }
}
