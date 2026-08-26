/** Built-in role catalogs used when Mongo is empty or missing a role. */
export const fallbackSkillCatalogs = [
  {
    role: 'Senior Frontend Engineer',
    skills: [
      {
        name: 'TypeScript',
        category: 'Technical skill',
        requiredLevel: 90,
        priority: 'high',
        impact: 'Strong TypeScript is expected for safe, scalable frontend architecture.',
      },
      {
        name: 'GraphQL',
        category: 'Technical skill',
        requiredLevel: 70,
        priority: 'high',
        impact: 'GraphQL experience unlocks roles working on data-heavy products.',
      },
      {
        name: 'Docker',
        category: 'Software tools',
        requiredLevel: 65,
        priority: 'medium',
        impact: 'Docker lets you reproduce production environments with backend teams.',
      },
      {
        name: 'System Design',
        category: 'Technical skill',
        requiredLevel: 82,
        priority: 'high',
        impact: 'Senior interviews test tradeoffs, scalability, and architecture decisions.',
      },
      {
        name: 'Technical Leadership',
        category: 'Soft skill',
        requiredLevel: 85,
        priority: 'medium',
        impact: 'Mentoring and cross-team communication separate senior contributors.',
      },
      {
        name: 'React',
        category: 'Technical skill',
        requiredLevel: 88,
        priority: 'high',
        impact: 'Required in most senior frontend roles and design-system work.',
      },
      {
        name: 'Node.js',
        category: 'Technical skill',
        requiredLevel: 60,
        priority: 'medium',
        impact: 'Helps frontend engineers work across the API boundary with backend teams.',
      },
      {
        name: 'Figma',
        category: 'Software tools',
        requiredLevel: 55,
        priority: 'medium',
        impact: 'Design-system collaboration is faster when you can read and comment in Figma.',
      },
    ],
  },
  {
    role: 'Full Stack Developer',
    skills: [
      {
        name: 'TypeScript',
        category: 'Technical skill',
        requiredLevel: 80,
        priority: 'high',
        impact: 'Typed JavaScript is expected across modern full-stack codebases.',
      },
      {
        name: 'Node.js',
        category: 'Technical skill',
        requiredLevel: 78,
        priority: 'high',
        impact: 'Most full-stack roles need a server runtime you can ship APIs on.',
      },
      {
        name: 'GraphQL',
        category: 'Technical skill',
        requiredLevel: 65,
        priority: 'medium',
        impact: 'GraphQL is common in product APIs that serve multiple clients.',
      },
      {
        name: 'Docker',
        category: 'Software tools',
        requiredLevel: 70,
        priority: 'high',
        impact: 'Containers are how full-stack services are built and deployed.',
      },
      {
        name: 'SQL',
        category: 'Software tools',
        requiredLevel: 72,
        priority: 'medium',
        impact: 'You will query and model relational data without a specialist.',
      },
    ],
  },
  {
    role: 'Tech Lead',
    skills: [
      {
        name: 'System Design',
        category: 'Technical skill',
        requiredLevel: 88,
        priority: 'high',
        impact: 'Leads own architecture tradeoffs for reliability and scale.',
      },
      {
        name: 'Technical Leadership',
        category: 'Soft skill',
        requiredLevel: 90,
        priority: 'high',
        impact: 'Mentoring and decision-making define the lead role.',
      },
      {
        name: 'TypeScript',
        category: 'Technical skill',
        requiredLevel: 75,
        priority: 'medium',
        impact: 'Leads still review production frontend and node services.',
      },
      {
        name: 'Docker',
        category: 'Software tools',
        requiredLevel: 70,
        priority: 'medium',
        impact: 'Delivery ownership includes local environments and deploy pipelines.',
      },
    ],
  },
  {
    role: 'Solutions Architect',
    skills: [
      {
        name: 'System Design',
        category: 'Technical skill',
        requiredLevel: 92,
        priority: 'high',
        impact: 'Architecture interviews and client proposals both test system design.',
      },
      {
        name: 'Cloud Certification',
        category: 'Certifications',
        requiredLevel: 70,
        priority: 'high',
        impact: 'A cloud credential signals you can map workloads onto a provider.',
      },
      {
        name: 'Docker',
        category: 'Software tools',
        requiredLevel: 75,
        priority: 'medium',
        impact: 'Container boundaries are part of most reference architectures.',
      },
      {
        name: 'Technical Leadership',
        category: 'Soft skill',
        requiredLevel: 80,
        priority: 'medium',
        impact: 'Architects align engineering, product, and stakeholders.',
      },
    ],
  },
  {
    role: 'Data Scientist',
    skills: [
      {
        name: 'Python',
        category: 'Technical skill',
        requiredLevel: 88,
        priority: 'medium',
        impact: 'Production Python supports reproducible analysis and reliable ML pipelines.',
      },
      {
        name: 'Machine Learning',
        category: 'Technical skill',
        requiredLevel: 85,
        priority: 'high',
        impact: 'Model selection, evaluation, and feature engineering are central hiring signals.',
      },
      {
        name: 'SQL',
        category: 'Software tools',
        requiredLevel: 86,
        priority: 'high',
        impact: 'Most data roles require independent exploration of large relational datasets.',
      },
      {
        name: 'Cloud Certification',
        category: 'Certifications',
        requiredLevel: 55,
        priority: 'low',
        impact: 'A cloud credential validates familiarity with deployed data workloads.',
      },
    ],
  },
  {
    role: 'Product Manager',
    skills: [
      {
        name: 'Product Analytics',
        category: 'Software tools',
        requiredLevel: 85,
        priority: 'high',
        impact: 'Analytics turns product choices into measurable hypotheses and outcomes.',
      },
      {
        name: 'Roadmapping',
        category: 'Product Strategy',
        requiredLevel: 80,
        priority: 'medium',
        impact: 'A clear roadmap communicates tradeoffs and keeps teams aligned.',
      },
      {
        name: 'Stakeholder Management',
        category: 'Soft skill',
        requiredLevel: 85,
        priority: 'high',
        impact: 'Product managers align customers, business leaders, and engineers.',
      },
      {
        name: 'User Research',
        category: 'Product Discovery',
        requiredLevel: 70,
        priority: 'medium',
        impact: 'User research reveals the real problems a product should solve.',
      },
    ],
  },
];

export function sameRole(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

export function mergeSkillCatalogs(mongoCatalogs = []) {
  const byRole = new Map();
  for (const item of fallbackSkillCatalogs) {
    byRole.set(item.role.toLowerCase(), {
      role: item.role,
      skills: item.skills.map((skill) => ({ ...skill })),
    });
  }
  for (const item of mongoCatalogs) {
    const key = String(item.role || '').trim().toLowerCase();
    if (!key) continue;
    const skills = Array.isArray(item.skills) ? item.skills : [];
    const existing = byRole.get(key);
    if (!existing) {
      byRole.set(key, { role: item.role, skills: [...skills] });
      continue;
    }
    const seen = new Set(existing.skills.map((skill) => skill.name.trim().toLowerCase()));
    for (const skill of skills) {
      const name = String(skill.name || '').trim().toLowerCase();
      if (!name || seen.has(name)) continue;
      existing.skills.push(skill);
      seen.add(name);
    }
  }
  return [...byRole.values()];
}

export function findCatalog(catalogs, role) {
  const requested = String(role || '').trim();
  if (!requested) return null;
  return catalogs.find((item) => sameRole(item.role, requested)) || null;
}
