/**
 * Smoke test for the three ported features, plus a regression pass over the
 * endpoints they touch, so a reviewer can see nothing existing broke.
 *
 *   npm start                                   (in another terminal)
 *   node scripts/smoke-merged-features.js
 */

const BASE = process.env.SMOKE_BASE || 'http://localhost:5100';

let token = null;
let pass = 0;
let fail = 0;

function check(name, condition, detail) {
  if (condition) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${name}${detail === undefined ? '' : ` -> ${JSON.stringify(detail)}`}`);
  }
}

async function call(method, path, body, useAuth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (useAuth && token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { status: res.status, data };
}

async function main() {
  console.log('\n===== REGRESSION: their existing endpoints =====\n');

  let r = await call('GET', '/api/health', undefined, false);
  check('health', r.status === 200 && r.data.data.status === 'ok', r.data);

  const email = `merge_${Date.now()}@example.com`;
  r = await call('POST', '/api/auth/register',
    { name: 'Merge Tester', email, password: 'secret12345', role: 'seeker' }, false);
  check('their auth/register still works', r.status === 201 && Boolean(r.data.data?.token), r.data);
  token = r.data.data?.token;

  r = await call('GET', '/api/auth/me');
  // Their /auth/me returns the user object at `data`, not `data.user`.
  check('their auth/me still works', r.status === 200 && r.data.data?.email === email, r.data);

  // Their original create flow: no builder fields at all.
  r = await call('POST', '/api/resumes', { title: 'Plain resume', summary: 'Old flow' });
  check('their resume create (no new fields) still works',
    r.status === 201 && r.data.data?.title === 'Plain resume', r.data);
  const plainId = r.data.data?.id;
  check('untouched resume defaults are sane',
    r.data.data?.targetField === '' && r.data.data?.template === 'Professional'
      && Array.isArray(r.data.data?.projects) && r.data.data.projects.length === 0,
    r.data.data);
  check('their isDefault logic still applies', r.data.data?.isDefault === true, r.data.data);

  r = await call('GET', '/api/resumes');
  check('their resume list still works', r.status === 200 && r.data.data.length === 1, r.data);

  r = await call('GET', '/api/applications');
  check('their application list still works',
    r.status === 200 && Array.isArray(r.data.data), r.data);

  r = await call('POST', '/api/ai/chat', { message: 'interview tips', history: [], attachments: [] });
  check('their ai/chat still works',
    r.status === 200 && r.data.data?.provider === 'offline', r.data);

  console.log('\n===== FEATURE 1: resume builder fields =====\n');

  const fullResume = {
    title: 'Backend Engineer Resume',
    targetField: 'Senior Backend Engineer',
    template: 'Modern',
    fullName: 'Nazifa Rahman',
    email: 'nazifa@example.com',
    phone: '+8801700000000',
    location: 'Dhaka, Bangladesh',
    linkedin: 'https://linkedin.com/in/nazifa',
    portfolio: 'https://nazifa.dev',
    summary: 'Backend engineer with Node and MongoDB experience.',
    skills: ['Node.js', 'MongoDB', 'Express', 'Dart'],
    experience: ['Backend Engineer at Acme - built REST APIs'],
    education: ['BSc in Computer Science, BRAC University'],
    projects: ['Job Sensei - resume and career platform'],
    certifications: ['AWS Certified Cloud Practitioner'],
  };

  r = await call('POST', '/api/resumes', fullResume);
  check('create resume with builder fields', r.status === 201, r.data);
  const resumeId = r.data.data?.id;
  const c = r.data.data || {};
  check('contact block persisted',
    c.fullName === 'Nazifa Rahman' && c.phone === '+8801700000000'
      && c.linkedin === 'https://linkedin.com/in/nazifa', c);
  check('targetField + template persisted',
    c.targetField === 'Senior Backend Engineer' && c.template === 'Modern', c);
  check('projects + certifications persisted',
    c.projects?.length === 1 && c.certifications?.length === 1, c);

  // A partial update must not blank the fields it does not mention.
  r = await call('PATCH', `/api/resumes/${resumeId}`, { title: 'Renamed Resume' });
  check('partial update renames', r.data.data?.title === 'Renamed Resume', r.data);
  check('partial update does NOT blank builder fields',
    r.data.data?.fullName === 'Nazifa Rahman'
      && r.data.data?.targetField === 'Senior Backend Engineer'
      && r.data.data?.projects?.length === 1,
    r.data.data);

  console.log('\n===== FEATURE 2: application tracker =====\n');

  r = await call('POST', '/api/applications/tracked',
    { jobTitle: 'Platform Engineer', companyName: 'Acme', resumeId });
  check('create tracked application', r.status === 201, r.data);
  const appId = r.data.data?.id;
  check('seeded with applied + one history entry',
    r.data.data?.status === 'applied' && r.data.data?.statusHistory?.length === 1, r.data.data);
  check('resume details copied across',
    r.data.data?.resumeTitle === 'Renamed Resume'
      && r.data.data?.targetField === 'Senior Backend Engineer', r.data.data);

  // The whole point of the partial index: more than one manual application.
  r = await call('POST', '/api/applications/tracked',
    { jobTitle: 'Node Developer', companyName: 'Globex' });
  check('SECOND tracked application allowed (partial unique index works)',
    r.status === 201, r.data);
  const appId2 = r.data.data?.id;

  r = await call('POST', '/api/applications/tracked', { jobTitle: '', companyName: 'X' });
  check('empty job title rejected', r.status === 400, r.data);

  const interview = new Date(Date.now() + 3 * 86400000).toISOString();
  r = await call('PATCH', `/api/applications/${appId}/tracked-status`,
    { status: 'shortlisted' });
  check('status -> shortlisted (new enum value accepted)',
    r.status === 200 && r.data.data?.status === 'shortlisted', r.data);

  r = await call('PATCH', `/api/applications/${appId}/tracked-status`,
    { status: 'interview', interviewDate: interview });
  check('status -> interview with a date', r.status === 200
    && r.data.data?.status === 'interview'
    && Boolean(r.data.data?.interviewDate), r.data);
  check('timeline accumulated 3 entries',
    r.data.data?.statusHistory?.length === 3,
    r.data.data?.statusHistory);

  r = await call('PATCH', `/api/applications/${appId}/tracked-status`, { status: 'nonsense' });
  check('invalid status rejected', r.status === 400, r.data);

  r = await call('GET', '/api/applications');
  check('tracked applications appear in their list endpoint',
    r.data.data?.length === 2, r.data.data?.length);

  r = await call('DELETE', `/api/applications/${appId2}/tracked`);
  check('delete tracked application', r.status === 200, r.data);

  console.log('\n===== FEATURE 3: AI resume match =====\n');

  r = await call('GET', '/api/ai/resume-match/history');
  check('history starts empty', r.status === 200 && r.data.data?.length === 0, r.data);

  r = await call('POST', '/api/ai/resume-match', { resumeId, jobDescription: 'too short' });
  check('short job description rejected', r.status === 400, r.data);

  r = await call('POST', '/api/ai/resume-match',
    { resumeId: '507f1f77bcf86cd799439011', jobDescription: 'x'.repeat(60) });
  check('unknown resume -> 404', r.status === 404, r.data);

  r = await call('POST', '/api/ai/resume-match', {
    resumeId,
    jobDescription:
      'We are hiring a Senior Backend Engineer with strong Node.js, Express and '
      + 'MongoDB experience. You will design REST APIs, own data modelling, and '
      + 'mentor juniors. Kubernetes and AWS exposure is a plus.',
  });
  const aiWorked = r.status === 201;
  check(aiWorked ? 'AI analysis created' : 'AI unreachable but handled cleanly (no crash)',
    aiWorked
      ? typeof r.data.data?.matchScore === 'number'
        && r.data.data.matchScore >= 0 && r.data.data.matchScore <= 100
      : [502, 503].includes(r.status),
    { status: r.status, error: r.data?.error?.message?.slice(0, 120) });

  if (aiWorked) {
    const a = r.data.data;
    check('analysis has the full structure',
      Array.isArray(a.strongKeywords) && Array.isArray(a.recommendedKeywords)
        && Array.isArray(a.projectHighlights) && Array.isArray(a.strengths)
        && Array.isArray(a.gaps) && typeof a.summaryImprovement === 'string',
      Object.keys(a));
    check('userId is not leaked to the client', a.userId === undefined, Object.keys(a));

    const analysisId = a.id;
    r = await call('GET', '/api/ai/resume-match/history');
    check('history now has the analysis', r.data.data?.length === 1, r.data.data?.length);

    r = await call('GET', `/api/ai/resume-match/history?resumeId=${resumeId}`);
    check('history filters by resumeId', r.data.data?.length === 1, r.data.data?.length);

    r = await call('GET', `/api/ai/resume-match/${analysisId}`);
    check('fetch one analysis', r.status === 200 && r.data.data?.id === analysisId, r.data);

    r = await call('DELETE', `/api/ai/resume-match/${analysisId}`);
    check('delete analysis', r.status === 200, r.data);
  }

  console.log('\n===== ISOLATION: another user cannot reach any of it =====\n');

  const ownerToken = token;
  r = await call('POST', '/api/auth/register',
    { name: 'Other User', email: `other_${Date.now()}@example.com`, password: 'secret12345', role: 'seeker' }, false);
  token = r.data.data?.token;

  r = await call('GET', '/api/resumes');
  check('other user sees no resumes', r.data.data?.length === 0, r.data.data?.length);

  r = await call('POST', '/api/ai/resume-match',
    { resumeId, jobDescription: 'x'.repeat(60) });
  check('other user cannot analyse a resume they do not own', r.status === 404, r.data);

  r = await call('PATCH', `/api/applications/${appId}/tracked-status`, { status: 'offer' });
  check('other user cannot move someone else\'s application', r.status === 403, r.data);

  r = await call('DELETE', `/api/applications/${appId}/tracked`);
  check('other user cannot delete someone else\'s application', r.status === 403, r.data);

  token = ownerToken;
  r = await call('GET', `/api/resumes/${plainId}`);
  check('owner data intact afterwards', r.status === 200, r.data);

  console.log(`\n==== ${pass} passed, ${fail} failed ====\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('SMOKE TEST CRASHED:', error);
  process.exit(1);
});
