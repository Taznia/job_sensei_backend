import { connectDb } from '../config/db.js';
import { LearningPath } from '../models/LearningPath.js';
import { LearningResource } from '../models/LearningResource.js';
import { Lesson } from '../models/Lesson.js';
import { Skill } from '../models/Skill.js';
import { SkillCatalog } from '../models/SkillCatalog.js';
import { User } from '../models/User.js';

/**
 * Additive learning content for Taznia's Skill Gap + Learning Resources modules.
 * Existing Mongo documents are never deleted. Existing field values are left
 * untouched; this script only inserts missing catalogs, paths, lessons, and
 * YouTube resources.
 */

const extraCatalogs = [
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
        impact: 'Mentoring and decision-making define the lead role more than raw coding speed.',
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
        impact: 'Architects align engineering, product, and stakeholders around a design.',
      },
    ],
  },
];

const extraFrontendSkills = [
  {
    name: 'React',
    category: 'Technical skill',
    requiredLevel: 88,
    priority: 'high',
    impact: 'Required in most senior frontend roles. Blocks you from top-tier React positions.',
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
];

const courses = [
  {
    skill: {
      name: 'TypeScript',
      category: 'Technical skill',
      description: 'Typed JavaScript for safer React and Node applications.',
    },
    path: {
      title: 'TypeScript for React Developers',
      description:
        'Master TypeScript with React: types, generics, and production patterns used in senior frontend roles.',
      difficulty: 'intermediate',
      estimatedDuration: '4 hours',
    },
    lessons: [
      {
        title: 'TS Basics & Types',
        description: 'Primitives, unions, inference, and why TypeScript catches bugs early.',
        duration: '55 min',
        video: {
          title: 'TypeScript Crash Course',
          creator: 'Traversy Media',
          url: 'https://www.youtube.com/watch?v=30LWjhZzg50',
          duration: '1h 14m',
        },
      },
      {
        title: 'React + TS Patterns',
        description: 'Component props, hooks, and event types in real React apps.',
        duration: '70 min',
        video: {
          title: 'React TypeScript Tutorial',
          creator: 'freeCodeCamp.org',
          url: 'https://www.youtube.com/watch?v=FJDVKeh7RJI',
          duration: '1h 27m',
        },
      },
      {
        title: 'Advanced Generics',
        description: 'Reusable typed utilities that show up in senior code reviews.',
        duration: '45 min',
        video: {
          title: 'TypeScript Generics Tutorial',
          creator: 'Web Dev Simplified',
          url: 'https://www.youtube.com/watch?v=nViEqpgwxHE',
          duration: '12 min',
        },
      },
    ],
  },
  {
    skill: {
      name: 'GraphQL',
      category: 'Technical skill',
      description: 'Query language for APIs used in data-heavy frontend products.',
    },
    path: {
      title: 'GraphQL: From Zero to Production',
      description: 'Queries, mutations, schemas, and how GraphQL fits a React client.',
      difficulty: 'beginner',
      estimatedDuration: '5 hours',
    },
    lessons: [
      {
        title: 'GraphQL Mental Model',
        description: 'What GraphQL solves compared with REST, and how a schema works.',
        duration: '50 min',
        video: {
          title: 'GraphQL Full Course',
          creator: 'freeCodeCamp.org',
          url: 'https://www.youtube.com/watch?v=ed8SzALpx1w',
          duration: '3h 18m',
        },
      },
      {
        title: 'Queries and Mutations',
        description: 'Write client operations and handle loading and error states.',
        duration: '40 min',
        video: {
          title: 'GraphQL Crash Course',
          creator: 'Traversy Media',
          url: 'https://www.youtube.com/watch?v=Y0lDGjdMz1c',
          duration: '34 min',
        },
      },
      {
        title: 'Apollo with React',
        description: 'Connect a React UI to a GraphQL API with Apollo Client.',
        duration: '45 min',
        video: {
          title: 'Apollo Client in React',
          creator: 'Apollo GraphQL',
          url: 'https://www.youtube.com/watch?v=YyUWW04HwKY',
          duration: '18 min',
        },
      },
    ],
  },
  {
    skill: {
      name: 'Docker',
      category: 'Software tools',
      description: 'Containers for local environments and deployment.',
    },
    path: {
      title: 'Docker Fundamentals in Practice',
      description: 'Images, containers, Dockerfiles, and Compose for everyday engineering work.',
      difficulty: 'beginner',
      estimatedDuration: '3 hours',
    },
    lessons: [
      {
        title: 'Containers and Images',
        description: 'Understand the Docker workflow from image to running container.',
        duration: '45 min',
        video: {
          title: 'Docker Tutorial for Beginners',
          creator: 'TechWorld with Nana',
          url: 'https://www.youtube.com/watch?v=3c-iBn73dDE',
          duration: '2h 10m',
        },
      },
      {
        title: 'Writing Dockerfiles',
        description: 'Build repeatable application images with a clear Dockerfile.',
        duration: '35 min',
        video: {
          title: 'Docker Compose in 12 Minutes',
          creator: 'Traversy Media',
          url: 'https://www.youtube.com/watch?v=DM6Z0GxIvR0',
          duration: '12 min',
        },
      },
      {
        title: 'Compose and Networking',
        description: 'Run connected application services locally.',
        duration: '30 min',
        video: {
          title: 'Docker Compose Crash Course',
          creator: 'NetworkChuck',
          url: 'https://www.youtube.com/watch?v=SXwC9fSwct8',
          duration: '33 min',
        },
      },
    ],
  },
  {
    skill: {
      name: 'System Design',
      category: 'Technical skill',
      description: 'Architecture tradeoffs for senior and lead interviews.',
    },
    path: {
      title: 'Frontend System Design Interviews',
      description: 'Practice scalable frontend architecture and interview-ready explanations.',
      difficulty: 'advanced',
      estimatedDuration: '3 hours',
    },
    lessons: [
      {
        title: 'System Design Basics',
        description: 'Requirements, bottlenecks, and how to structure an answer.',
        duration: '40 min',
        video: {
          title: 'System Design Interview Primer',
          creator: 'Fireship',
          url: 'https://www.youtube.com/watch?v=SqcXvc3ZmRU',
          duration: '10 min',
        },
      },
      {
        title: 'Frontend at Scale',
        description: 'Rendering, state, and performance decisions in large UIs.',
        duration: '50 min',
        video: {
          title: 'Frontend System Design',
          creator: 'GreatFrontEnd',
          url: 'https://www.youtube.com/watch?v=Z-0g_aJLLvY',
          duration: '16 min',
        },
      },
      {
        title: 'APIs and Tradeoffs',
        description: 'Caching, pagination, and contract design between client and server.',
        duration: '40 min',
        video: {
          title: 'REST vs GraphQL vs gRPC',
          creator: 'Fireship',
          url: 'https://www.youtube.com/watch?v=-mN3VyJuCjM',
          duration: '8 min',
        },
      },
    ],
  },
  {
    skill: {
      name: 'React',
      category: 'Technical skill',
      description: 'Component-driven UI for senior frontend work.',
    },
    path: {
      title: 'React for Production UIs',
      description: 'Hooks, data fetching, and patterns used in senior React codebases.',
      difficulty: 'intermediate',
      estimatedDuration: '6 hours',
    },
    lessons: [
      {
        title: 'React Fundamentals',
        description: 'Components, props, state, and the render cycle.',
        duration: '80 min',
        video: {
          title: 'React Course for Beginners',
          creator: 'freeCodeCamp.org',
          url: 'https://www.youtube.com/watch?v=bMknfKXIFA8',
          duration: '11h 55m',
        },
      },
      {
        title: 'Hooks in Depth',
        description: 'useEffect, custom hooks, and avoiding stale state.',
        duration: '40 min',
        video: {
          title: 'React Hooks Course',
          creator: 'Codevolution',
          url: 'https://www.youtube.com/watch?v=0ZJgIjIuY7U',
          duration: '3h 30m',
        },
      },
      {
        title: 'Data Fetching Patterns',
        description: 'Loading, error, and cache strategies for product UIs.',
        duration: '30 min',
        video: {
          title: 'React Query Tutorial',
          creator: 'Web Dev Simplified',
          url: 'https://www.youtube.com/watch?v=r8Dg0KVnfMA',
          duration: '27 min',
        },
      },
    ],
  },
  {
    skill: {
      name: 'Node.js',
      category: 'Technical skill',
      description: 'JavaScript on the server for APIs and tooling.',
    },
    path: {
      title: 'Node.js API Essentials',
      description: 'Build and structure a Node API that frontend engineers can consume.',
      difficulty: 'beginner',
      estimatedDuration: '5 hours',
    },
    lessons: [
      {
        title: 'Node and Express Basics',
        description: 'Runtime, modules, and a first HTTP server.',
        duration: '70 min',
        video: {
          title: 'Node.js and Express Full Course',
          creator: 'freeCodeCamp.org',
          url: 'https://www.youtube.com/watch?v=Oe421EPjeBE',
          duration: '8h 16m',
        },
      },
      {
        title: 'REST APIs',
        description: 'Routes, validation, and status codes.',
        duration: '40 min',
        video: {
          title: 'Build a REST API with Node',
          creator: 'Traversy Media',
          url: 'https://www.youtube.com/watch?v=l8WPWK9mS5M',
          duration: '1h 10m',
        },
      },
      {
        title: 'Auth and Middleware',
        description: 'Protect routes and keep request handling tidy.',
        duration: '35 min',
        video: {
          title: 'JWT Authentication in Node',
          creator: 'Web Dev Simplified',
          url: 'https://www.youtube.com/watch?v=mbsmsi7l3r4',
          duration: '21 min',
        },
      },
    ],
  },
  {
    skill: {
      name: 'Figma',
      category: 'Software tools',
      description: 'Interface design collaboration for product engineers.',
    },
    path: {
      title: 'Figma for Engineers',
      description: 'Read, inspect, and comment on product designs without blocking designers.',
      difficulty: 'beginner',
      estimatedDuration: '2 hours',
    },
    lessons: [
      {
        title: 'Figma Crash Course',
        description: 'Frames, auto layout, and inspecting a file.',
        duration: '50 min',
        video: {
          title: 'Figma Tutorial for Beginners',
          creator: 'AJ&Smart',
          url: 'https://www.youtube.com/watch?v=FTFaQWZBqQ8',
          duration: '32 min',
        },
      },
      {
        title: 'Components and Variants',
        description: 'How design systems are structured in Figma.',
        duration: '25 min',
        video: {
          title: 'Figma Components and Variants',
          creator: 'Figma',
          url: 'https://www.youtube.com/watch?v=k74IrUNaJVk',
          duration: '8 min',
        },
      },
      {
        title: 'Handoff to Code',
        description: 'Inspect spacing, color, and export without guesswork.',
        duration: '20 min',
        video: {
          title: 'Dev Mode in Figma',
          creator: 'Figma',
          url: 'https://www.youtube.com/watch?v=ZKxw7T47_Y8',
          duration: '6 min',
        },
      },
    ],
  },
  {
    skill: {
      name: 'Technical Leadership',
      category: 'Soft skill',
      description: 'Mentoring, decisions, and communication for senior engineers.',
    },
    path: {
      title: 'Technical Leadership Basics',
      description: 'Lead through reviews, decisions, and clear written communication.',
      difficulty: 'intermediate',
      estimatedDuration: '2 hours',
    },
    lessons: [
      {
        title: 'Staff Engineer Path',
        description: 'What technical leadership looks like without people-management.',
        duration: '30 min',
        video: {
          title: 'What is a Staff Engineer?',
          creator: 'The Pragmatic Engineer',
          url: 'https://www.youtube.com/watch?v=sS8K2bPZ3n8',
          duration: '14 min',
        },
      },
      {
        title: 'Giving Feedback',
        description: 'Code review and mentoring habits that raise the team.',
        duration: '25 min',
        video: {
          title: 'How to Do Code Reviews',
          creator: 'Google for Developers',
          url: 'https://www.youtube.com/watch?v=PJjmw9TFZts',
          duration: '8 min',
        },
      },
      {
        title: 'Communicating Tradeoffs',
        description: 'Explain technical choices to product and other engineers.',
        duration: '20 min',
        video: {
          title: 'How to Communicate as an Engineer',
          creator: 'The Pragmatic Engineer',
          url: 'https://www.youtube.com/watch?v=qWWc-9yba5Q',
          duration: '12 min',
        },
      },
    ],
  },
];

function youtubeId(url) {
  try {
    return new URL(url).searchParams.get('v');
  } catch {
    return null;
  }
}

function thumbnailFor(url) {
  const id = youtubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : undefined;
}

async function addCatalogRole(spec) {
  const existing = await SkillCatalog.findOne({ role: spec.role });
  if (existing) {
    let added = 0;
    for (const skill of spec.skills) {
      const has = existing.skills.some(
        (item) => item.name.trim().toLowerCase() === skill.name.trim().toLowerCase(),
      );
      if (!has) {
        existing.skills.push(skill);
        added += 1;
      }
    }
    if (added) await existing.save();
    return;
  }
  await SkillCatalog.create(spec);
}

async function addSkillsToRole(role, skills) {
  const catalog = await SkillCatalog.findOne({ role });
  if (!catalog) return;
  let added = 0;
  for (const skill of skills) {
    const has = catalog.skills.some(
      (item) => item.name.trim().toLowerCase() === skill.name.trim().toLowerCase(),
    );
    if (!has) {
      catalog.skills.push(skill);
      added += 1;
    }
  }
  if (added) await catalog.save();
}

async function addCourse(course) {
  const normalizedName = course.skill.name.trim().toLowerCase();
  let skill = await Skill.findOne({ normalizedName });
  if (!skill) {
    skill = await Skill.create({
      ...course.skill,
      normalizedName,
      status: 'active',
    });
  }

  let path = await LearningPath.findOne({
    skillId: skill.id,
    title: course.path.title,
  });
  if (!path) {
    path = await LearningPath.create({
      ...course.path,
      skillId: skill.id,
      status: 'published',
    });
  } else if (path.status !== 'published') {
    path.status = 'published';
    await path.save();
  }

  for (const [index, lessonSpec] of course.lessons.entries()) {
    let lesson = await Lesson.findOne({
      learningPathId: path.id,
      orderIndex: index + 1,
    });
    if (!lesson) {
      lesson = await Lesson.create({
        learningPathId: path.id,
        title: lessonSpec.title,
        description: lessonSpec.description,
        orderIndex: index + 1,
        estimatedDuration: lessonSpec.duration,
      });
    }

    const video = lessonSpec.video;
    const existingResource = await LearningResource.findOne({
      lessonId: lesson.id,
      url: video.url,
    });
    if (!existingResource) {
      await LearningResource.create({
        lessonId: lesson.id,
        title: video.title,
        creator: video.creator,
        skill: skill.name,
        platform: 'youtube',
        resourceType: 'video',
        duration: video.duration,
        difficulty: course.path.difficulty,
        url: video.url,
        thumbnailUrl: thumbnailFor(video.url),
      });
    }

    const standalone = await LearningResource.findOne({ url: video.url });
    if (!standalone) {
      await LearningResource.create({
        title: video.title,
        creator: video.creator,
        skill: skill.name,
        platform: 'youtube',
        resourceType: 'video',
        duration: video.duration,
        difficulty: course.path.difficulty,
        url: video.url,
        thumbnailUrl: thumbnailFor(video.url),
      });
    }
  }
}

async function enrichDemoSeeker() {
  const demo = await User.findOne({ email: 'demo@jobsensei.app' });
  if (!demo) return;
  const extraSkills = [
    { name: 'Technical Leadership', currentLevel: 68, category: 'Soft skill' },
    { name: 'React', currentLevel: 80, category: 'Technical skill' },
    { name: 'Node.js', currentLevel: 42, category: 'Technical skill' },
    { name: 'Figma', currentLevel: 50, category: 'Software tools' },
    { name: 'SQL', currentLevel: 63, category: 'Software tools' },
    { name: 'Python', currentLevel: 55, category: 'Technical skill' },
    { name: 'Machine Learning', currentLevel: 28, category: 'Technical skill' },
    { name: 'Cloud Certification', currentLevel: 20, category: 'Certifications' },
    { name: 'Product Analytics', currentLevel: 40, category: 'Software tools' },
    { name: 'Roadmapping', currentLevel: 48, category: 'Product Strategy' },
    { name: 'Stakeholder Management', currentLevel: 62, category: 'Soft skill' },
    { name: 'User Research', currentLevel: 35, category: 'Product Discovery' },
  ];
  const existing = new Set(
    (demo.skills || []).map((item) => String(item.name || '').trim().toLowerCase()),
  );
  let added = 0;
  for (const skill of extraSkills) {
    if (existing.has(skill.name.toLowerCase())) continue;
    demo.skills.push(skill);
    existing.add(skill.name.toLowerCase());
    added += 1;
  }
  if (!demo.targetRole) demo.targetRole = 'Senior Frontend Engineer';
  if (added) await demo.save();
}

async function seed() {
  await connectDb();
  await addSkillsToRole('Senior Frontend Engineer', extraFrontendSkills);
  for (const catalog of extraCatalogs) {
    await addCatalogRole(catalog);
  }
  for (const course of courses) {
    await addCourse(course);
  }
  await enrichDemoSeeker();
  console.log('Additive learning seed complete. Existing documents were left in place.');
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
