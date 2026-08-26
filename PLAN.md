# Job Sensei Backend Plan

Chat is **not** a backend service. The Flutter app talks to Gemini directly and stores conversations in **SQLite on device**. Everything else below is served by Node.js + MongoDB Atlas on **Vercel**.

## Architecture

```text
Flutter app
├── AI Sensei  → Gemini API (direct) + SQLite (local history)
└── REST calls → Vercel (Express) → MongoDB Atlas
                    ├── JWT auth
                    └── uploads stored in Atlas (GET /api/files/:id)
```

## Hosting

- **Vercel**: `src/app.js` exports the Express app. Set Root Directory to `backend`.
- **MongoDB Atlas**: required. Vercel has no persistent disk and no Docker.
- Uploads are saved in the `fileassets` collection. `express.static` does not work on Vercel.

Roles: `seeker` (default), `recruiter`, `admin`.

## Services

| Service | Responsibility |
|---|---|
| Auth | Register, login, JWT, OTP password reset |
| Users / Profile | Career profile, skills, saved jobs |
| Jobs | Search, details, recommendations, recruiter CRUD, save/unsave |
| Applications | Apply, track, recruiter status updates |
| Resumes | CRUD, default resume, optional file upload |
| Community | Groups, membership, posts, likes, follows, comments, attachments |
| Learning | Role skill-gap catalog, user levels, curated resources, bookmarks |
| Notifications | In-app events (comments, likes, application status) |
| Rewards | XP and badges for applying, posting, joining, learning |
| Admin | Users, moderation, stats |
| Chat | **Client only** — Gemini + SQLite |

## API map

Base URL: `/api`

### Health
- `GET /health`
- `GET /files/:id` binary upload from Atlas

### Auth
- `POST /auth/register` `{ name, email, password, role? }`
- `POST /auth/login` `{ email, password }`
- `POST /auth/forgot-password` `{ email }`
- `POST /auth/verify-otp` `{ email, otp }`
- `POST /auth/reset-password` `{ email, otp, password }`
- `GET /auth/me` (Bearer)
- `PATCH /auth/password` (Bearer) `{ currentPassword, newPassword }`

### Users
- `GET /users/me`
- `PATCH /users/me` profile + target role + skill levels
- `GET /users/:id` public profile

### Jobs
- `GET /jobs` query: `q, location, type, workMode, skill, page, limit`
- `GET /jobs/recommended`
- `GET /jobs/saved`
- `GET /jobs/:id`
- `POST /jobs/:id/save`
- `DELETE /jobs/:id/save`
- `POST /jobs` recruiter/admin
- `PATCH /jobs/:id` owner recruiter/admin
- `DELETE /jobs/:id` owner recruiter/admin

### Applications
- `GET /applications` seeker: mine; recruiter: for their jobs
- `POST /applications` `{ jobId, resumeId?, coverLetter? }`
- `GET /applications/:id`
- `PATCH /applications/:id` `{ status }` recruiter/admin or `withdrawn` by seeker

### Resumes
- `GET /resumes`
- `POST /resumes` JSON or multipart
- `GET /resumes/:id`
- `PATCH /resumes/:id`
- `DELETE /resumes/:id`
- `POST /resumes/:id/default`

### Community
- `GET /communities`
- `POST /communities`
- `GET /communities/:id`
- `POST /communities/:id/join`
- `DELETE /communities/:id/leave`

### Posts
- `GET /posts` query: `communityId, tag, page, limit`
- `POST /posts` multipart: `body, type, communityId, files[]`
- `GET /posts/:id`
- `POST /posts/:id/like`
- `POST /posts/:id/follow`
- `POST /posts/:id/comments` `{ body }`
- `DELETE /posts/:id` author or admin

### Learning
- `GET /learning/skill-gaps?role=`
- `PUT /learning/skills` `{ skills: [{ name, currentLevel }] }`
- `GET /learning/resources?skill=`
- `GET /learning/bookmarks`
- `POST /learning/bookmarks` `{ title, url, skill }`
- `DELETE /learning/bookmarks/:id`

### Notifications
- `GET /notifications`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`

### Rewards
- `GET /rewards/me`

### Admin
- `GET /admin/stats`
- `GET /admin/users`
- `PATCH /admin/users/:id` `{ role?, isBanned? }`
- `DELETE /admin/posts/:id`

## MongoDB collections

`users`, `jobs`, `applications`, `resumes`, `communities`, `posts`, `notifications`, `skillcatalogs`, `learningresources`, `learningbookmarks`, `fileassets`

## Out of scope (by design)

- Chat messages, conversation history, Gemini keys — stay on the device
- Email provider — OTP is stored and returned in development responses
