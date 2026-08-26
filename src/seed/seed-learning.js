import { connectDb } from '../config/db.js';
import { Job } from '../models/Job.js';
import { LearningPath } from '../models/LearningPath.js';
import { LearningResource } from '../models/LearningResource.js';
import { Lesson } from '../models/Lesson.js';
import { Skill } from '../models/Skill.js';
import { SkillCatalog } from '../models/SkillCatalog.js';

const curricula = [
  {
    skill: {
      name: 'Docker',
      category: 'DevOps',
      description: 'Application containerization and reproducible environments.',
    },
    path: {
      title: 'Docker Fundamentals',
      description:
        'Learn images, containers, Dockerfiles, networking, and deployment workflows.',
      difficulty: 'beginner',
      estimatedDuration: '5 hours',
    },
    lessons: [
      ['Containers and Images', 'Understand images, containers, and the Docker workflow.', '45 min'],
      ['Writing Dockerfiles', 'Build repeatable application images.', '60 min'],
      ['Compose and Networking', 'Run connected application services.', '75 min'],
    ],
  },
  {
    skill: {
      name: 'State Management',
      category: 'Mobile Development',
      description: 'Predictable state and data flow in production applications.',
    },
    path: {
      title: 'Flutter State Management',
      description:
        'Build predictable Flutter features with clear state ownership and repository-driven data flows.',
      difficulty: 'intermediate',
      estimatedDuration: '6 hours',
    },
    lessons: [
      ['State Ownership', 'Decide where state should live and who observes it.', '45 min'],
      ['Controller and Repository Flow', 'Separate presentation state from data access.', '75 min'],
      ['Loading, Error, and Empty States', 'Represent asynchronous states explicitly.', '60 min'],
    ],
  },
  {
    skill: {
      name: 'Django',
      category: 'Web Development',
      description: 'Python framework for secure backend applications.',
    },
    path: {
      title: 'Django Beginner Path',
      description: 'Build a secure Django application with models and REST APIs.',
      difficulty: 'beginner',
      estimatedDuration: '8 hours',
    },
    lessons: [
      ['Project Setup', 'Understand projects, apps, settings, and URLs.', '60 min'],
      ['Models and Database', 'Define models, migrations, and relational data.', '75 min'],
      ['Building REST APIs', 'Expose validated data through REST endpoints.', '90 min'],
    ],
  },
];

function generatedCurriculum(skillName) {
  return {
    skill: {
      name: skillName,
      category: 'Career Skill',
      description: 'Practical knowledge and applied capability for ' + skillName + '.',
    },
    path: {
      title: skillName + ' Learning Path',
      description:
        'Build role-ready ' + skillName + ' knowledge through fundamentals, practice, and an applied project.',
      difficulty: 'beginner',
      estimatedDuration: '5 hours',
    },
    lessons: [
      [
        skillName + ' Fundamentals',
        'Understand the essential concepts, vocabulary, and decisions in ' + skillName + '.',
        '45 min',
      ],
      [
        skillName + ' in Practice',
        'Follow a practical workflow and apply ' + skillName + ' to realistic work.',
        '60 min',
      ],
      [
        skillName + ' Applied Project',
        'Complete a guided project that demonstrates your ' + skillName + ' capability.',
        '90 min',
      ],
    ],
  };
}

async function seedLearning() {
  await connectDb();
  const [jobSkills, catalogSkills] = await Promise.all([
    Job.distinct('skills', { status: 'open' }),
    SkillCatalog.distinct('skills.name'),
  ]);
  const authoredNames = new Set(
    curricula.map((item) => item.skill.name.trim().toLowerCase()),
  );
  const generated = [...new Set([...jobSkills, ...catalogSkills])]
    .filter((name) => name && !authoredNames.has(name.trim().toLowerCase()))
    .map((name) => generatedCurriculum(name.trim()));
  const allCurricula = [...curricula, ...generated];

  for (const curriculum of allCurricula) {
    const normalizedName = curriculum.skill.name.toLowerCase();
    const skill = await Skill.findOneAndUpdate(
      { normalizedName },
      { ...curriculum.skill, normalizedName, status: 'active' },
      { upsert: true, new: true, runValidators: true },
    );
    const path = await LearningPath.findOneAndUpdate(
      { skillId: skill.id, title: curriculum.path.title },
      { ...curriculum.path, skillId: skill.id, status: 'published' },
      { upsert: true, new: true, runValidators: true },
    );

    for (const [index, item] of curriculum.lessons.entries()) {
      const [title, description, estimatedDuration] = item;
      const lesson = await Lesson.findOneAndUpdate(
        { learningPathId: path.id, orderIndex: index + 1 },
        {
          learningPathId: path.id,
          title,
          description,
          orderIndex: index + 1,
          estimatedDuration,
        },
        { upsert: true, new: true, runValidators: true },
      );
      await LearningResource.findOneAndUpdate(
        { lessonId: lesson.id, title: `${title} tutorial` },
        {
          lessonId: lesson.id,
          title: `${title} tutorial`,
          creator: 'Job Sensei Learning',
          skill: skill.name,
          platform: 'youtube',
          resourceType: 'video',
          duration: estimatedDuration,
          difficulty: 'Recommended',
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} tutorial`)}`,
        },
        { upsert: true, new: true, runValidators: true },
      );
    }
  }
  console.log('Structured learning seed complete. Existing data was preserved.');
  process.exit(0);
}

seedLearning().catch((error) => {
  console.error(error);
  process.exit(1);
});
