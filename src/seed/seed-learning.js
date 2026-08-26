import { connectDb } from '../config/db.js';
import { LearningPath } from '../models/LearningPath.js';
import { LearningResource } from '../models/LearningResource.js';
import { Lesson } from '../models/Lesson.js';
import { Skill } from '../models/Skill.js';

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

async function seedLearning() {
  await connectDb();
  for (const curriculum of curricula) {
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
