/**
 * Profile completeness, weighted by how much each section improves job
 * matching. Skills and preferences are what the matcher reads directly, so they
 * carry the most; portfolio links are nice to have.
 *
 * These weights are identical to the Flutter implementation in
 * lib/shared/models/career_profile_models.dart. Change one, change both, or the
 * app and the API will disagree about the same profile.
 */
export const COMPLETENESS_WEIGHTS = {
  'Basic details': 15,
  Skills: 20,
  'Job preferences': 20,
  'Work experience': 15,
  Education: 15,
  'Career goals': 5,
  Certifications: 5,
  'Portfolio links': 5,
};

export function computeCompleteness(profile) {
  const prefs = profile.preferences || {};

  const filled = {
    'Basic details': Boolean(profile.fullName && profile.headline),
    Skills: (profile.skills || []).length > 0,
    'Job preferences':
      (prefs.preferredRoles || []).length > 0 && Boolean(prefs.salary),
    'Work experience': (profile.experience || []).length > 0,
    Education: (profile.education || []).length > 0,
    'Career goals': Boolean((profile.careerGoals || '').trim()),
    Certifications: (profile.certifications || []).length > 0,
    'Portfolio links': (profile.portfolioLinks || []).length > 0,
  };

  let percent = 0;
  const missing = [];

  for (const [section, weight] of Object.entries(COMPLETENESS_WEIGHTS)) {
    if (filled[section]) {
      percent += weight;
    } else {
      missing.push(section);
    }
  }

  // Highest-weight gaps first, so the client prompts for what matters most.
  missing.sort((a, b) => COMPLETENESS_WEIGHTS[b] - COMPLETENESS_WEIGHTS[a]);

  return { percent, missing, isComplete: missing.length === 0 };
}
