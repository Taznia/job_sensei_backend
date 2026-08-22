import { connectDb } from '../config/db.js';
import { Application } from '../models/Application.js';
import { Community } from '../models/Community.js';
import { Job } from '../models/Job.js';
import { LearningResource } from '../models/LearningResource.js';
import { Notification } from '../models/Notification.js';
import { Post } from '../models/Post.js';
import { Resume } from '../models/Resume.js';
import { SkillCatalog } from '../models/SkillCatalog.js';
import { User } from '../models/User.js';
import { FileAsset } from '../models/FileAsset.js';
import { LearningBookmark } from '../models/LearningBookmark.js';

async function reset() {
  await Promise.all([
    User.deleteMany({}),
    Job.deleteMany({}),
    Application.deleteMany({}),
    Resume.deleteMany({}),
    Community.deleteMany({}),
    Post.deleteMany({}),
    Notification.deleteMany({}),
    SkillCatalog.deleteMany({}),
    LearningResource.deleteMany({}),
    LearningBookmark.deleteMany({}),
    FileAsset.deleteMany({}),
  ]);
}

async function seed() {
  await connectDb();
  await reset();

  const passwordHash = await User.hashPassword('Demo123!');
  const recruiterHash = await User.hashPassword('Recruiter123!');
  const adminHash = await User.hashPassword('Admin123!');

  const [demo, recruiter, admin, wali, alex] = await User.create([
    {
      name: 'Taznia',
      email: 'demo@jobsensei.app',
      passwordHash,
      role: 'seeker',
      headline: 'Job Sensei member',
      targetRole: 'Senior Frontend Engineer',
      location: 'Dhaka',
      skills: [
        { name: 'TypeScript', currentLevel: 58, category: 'Technical skill' },
        { name: 'GraphQL', currentLevel: 15, category: 'Technical skill' },
        { name: 'Docker', currentLevel: 35, category: 'Tool' },
        { name: 'System Design', currentLevel: 45, category: 'Technical skill' },
      ],
      xp: 25,
      badges: ['First steps'],
    },
    {
      name: 'Nadia Rahman',
      email: 'recruiter@jobsensei.app',
      passwordHash: recruiterHash,
      role: 'recruiter',
      headline: 'Technical Recruiter',
      company: 'Northwind Labs',
    },
    {
      name: 'Admin',
      email: 'admin@jobsensei.app',
      passwordHash: adminHash,
      role: 'admin',
      headline: 'Job Sensei Admin',
    },
    {
      name: 'Wali Khan',
      email: 'wali@jobsensei.app',
      passwordHash,
      role: 'seeker',
      headline: 'Frontend Developer',
    },
    {
      name: 'Alex Kim',
      email: 'alex@jobsensei.app',
      passwordHash,
      role: 'seeker',
      headline: 'React Developer',
    },
  ]);

  const resume = await Resume.create({
    userId: demo.id,
    title: 'Frontend resume',
    summary: 'Frontend engineer focused on React, TypeScript, and product quality.',
    experience: ['Built career-support product features in Flutter and Node.js'],
    education: ['BSc Computer Science'],
    skills: ['React', 'TypeScript', 'Flutter'],
    isDefault: true,
  });
  demo.defaultResumeId = resume.id;
  await demo.save();

  const jobs = await Job.create([
    {
      title: 'Senior Frontend Engineer',
      company: 'Northwind Labs',
      location: 'Remote',
      type: 'full-time',
      workMode: 'remote',
      description:
        'Own complex React surfaces, design system work, and frontend architecture for a career product used by thousands of job seekers.',
      requirements: ['5+ years frontend', 'TypeScript', 'System design interviews'],
      skills: ['TypeScript', 'React', 'System Design'],
      salaryMin: 90000,
      salaryMax: 140000,
      recruiterId: recruiter.id,
    },
    {
      title: 'Product Manager',
      company: 'Harbor Talent',
      location: 'Singapore',
      type: 'full-time',
      workMode: 'hybrid',
      description:
        'Drive discovery, roadmapping, and analytics for a job-matching marketplace.',
      requirements: ['Product analytics', 'Roadmapping', 'Stakeholder management'],
      skills: ['Product Analytics', 'Roadmapping'],
      salaryMin: 80000,
      salaryMax: 120000,
      recruiterId: recruiter.id,
    },
    {
      title: 'Data Scientist',
      company: 'Lumen Analytics',
      location: 'Dhaka',
      type: 'full-time',
      workMode: 'onsite',
      description:
        'Build ranking and recommendation models that help candidates find better-fit roles.',
      requirements: ['Python', 'SQL', 'Machine learning'],
      skills: ['Python', 'SQL', 'Machine Learning'],
      salaryMin: 50000,
      salaryMax: 85000,
      recruiterId: recruiter.id,
    },
  ]);

  await Application.create({
    jobId: jobs[0].id,
    userId: demo.id,
    resumeId: resume.id,
    coverLetter: 'I would love to help job seekers with a polished frontend.',
    status: 'reviewing',
  });

  const groups = await Community.create([
    {
      name: 'React Developers',
      description: 'Hooks, architecture, frontend careers',
      category: 'Technology',
      visualKey: 'code',
      createdById: alex.id,
      members: [alex.id, demo.id, wali.id],
    },
    {
      name: 'Product Managers',
      description: 'Product thinking, discovery, and leadership',
      category: 'Job role',
      visualKey: 'product',
      createdById: recruiter.id,
      members: [recruiter.id],
    },
    {
      name: 'Data Scientists',
      description: 'Machine learning, analytics, and data careers',
      category: 'Technology',
      visualKey: 'data',
      createdById: admin.id,
      members: [admin.id],
    },
    {
      name: 'Flutter Developers',
      description: 'Dart, mobile UI, and clean architecture',
      category: 'Technology',
      visualKey: 'flutter',
      createdById: demo.id,
      members: [demo.id],
    },
    {
      name: 'UI Designers',
      description: 'Figma, UX research, and design systems',
      category: 'Creative',
      visualKey: 'design',
      createdById: recruiter.id,
      members: [recruiter.id],
    },
    {
      name: 'Fresh Graduates',
      description: 'First jobs, portfolios, and interviews',
      category: 'Career stage',
      visualKey: 'graduate',
      createdById: wali.id,
      members: [wali.id, demo.id],
    },
  ]);

  await Post.create([
    {
      authorId: wali.id,
      author: wali.name,
      role: wali.headline,
      body:
        'Accepted my System Design interview call! What topics should I prioritize this week beyond caching and API design?',
      tags: ['Interview', 'System Design'],
      communityId: groups[0].id,
      comments: [
        {
          authorId: recruiter.id,
          author: recruiter.name,
          body: 'Start with scalability trade-offs, database design, and API contracts.',
        },
        {
          authorId: alex.id,
          author: alex.name,
          body: 'Practice explaining one complete design clearly before adding more topics.',
        },
      ],
      likes: [demo.id, alex.id],
    },
    {
      authorId: alex.id,
      author: alex.name,
      role: alex.headline,
      body:
        'I collected the React performance resources that helped me reduce our dashboard load time. Sharing the checklist with everyone.',
      tags: ['React', 'Resources'],
      communityId: groups[0].id,
      comments: [
        {
          authorId: demo.id,
          author: demo.name,
          body: 'This checklist is very useful. Thank you for sharing it!',
        },
      ],
      likes: [demo.id, wali.id, recruiter.id],
    },
  ]);

  await SkillCatalog.create([
    {
      role: 'Senior Frontend Engineer',
      skills: [
        {
          name: 'TypeScript',
          category: 'Technical skill',
          requiredLevel: 90,
          priority: 'high',
          impact:
            'Strong TypeScript is expected for safe, scalable frontend architecture and is mentioned in most senior-role descriptions.',
        },
        {
          name: 'GraphQL',
          category: 'Technical skill',
          requiredLevel: 70,
          priority: 'high',
          impact:
            'GraphQL experience unlocks roles working on data-heavy products and helps you design efficient client-server contracts.',
        },
        {
          name: 'Docker',
          category: 'Tool',
          requiredLevel: 65,
          priority: 'medium',
          impact:
            'Docker lets you reproduce production environments and collaborate more smoothly with platform and backend teams.',
        },
        {
          name: 'System Design',
          category: 'Technical skill',
          requiredLevel: 82,
          priority: 'high',
          impact:
            'Senior interviews test tradeoffs, scalability, performance, and the ability to lead architecture decisions.',
        },
        {
          name: 'Technical Leadership',
          category: 'Soft skill',
          requiredLevel: 85,
          priority: 'medium',
          impact:
            'Mentoring, clear decisions, and cross-team communication separate senior contributors from strong mid-level engineers.',
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
          category: 'Tool',
          requiredLevel: 86,
          priority: 'high',
          impact: 'Most data roles require independent exploration of large relational datasets.',
        },
        {
          name: 'Cloud Certification',
          category: 'Certification',
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
          category: 'Tool',
          requiredLevel: 85,
          priority: 'high',
          impact: 'Analytics turns product choices into measurable hypotheses and outcomes.',
        },
        {
          name: 'Roadmapping',
          category: 'Technical skill',
          requiredLevel: 80,
          priority: 'high',
          impact: 'A clear roadmap communicates tradeoffs and keeps teams aligned.',
        },
      ],
    },
  ]);

  await LearningResource.create([
    {
      title: 'TypeScript for React Developers',
      creator: 'Code Academy',
      skill: 'TypeScript',
      duration: '2h 18m',
      difficulty: 'Intermediate',
      url: 'https://www.youtube.com/results?search_query=typescript+for+react+developers',
    },
    {
      title: 'Mastering GraphQL from Zero',
      creator: 'freeCodeCamp',
      skill: 'GraphQL',
      duration: '3h 42m',
      difficulty: 'Beginner',
      url: 'https://www.youtube.com/results?search_query=graphql+full+course',
    },
    {
      title: 'Docker Fundamentals in Practice',
      creator: 'TechWorld with Nana',
      skill: 'Docker',
      duration: '1h 46m',
      difficulty: 'Beginner',
      url: 'https://www.youtube.com/results?search_query=docker+fundamentals',
    },
    {
      title: 'Frontend System Design Interviews',
      creator: 'Engineering with Utsav',
      skill: 'System Design',
      duration: '58m',
      difficulty: 'Advanced',
      url: 'https://www.youtube.com/results?search_query=frontend+system+design',
    },
  ]);

  await Notification.create({
    userId: demo.id,
    type: 'welcome',
    title: 'Welcome to Job Sensei',
    body: 'Your career workspace is ready. Join a community or start a chat with Momo.',
  });

  console.log('Seed complete.');
  console.log('  demo@jobsensei.app / Demo123!');
  console.log('  recruiter@jobsensei.app / Recruiter123!');
  console.log('  admin@jobsensei.app / Admin123!');
  process.exit(0);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
