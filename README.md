# Job Sensei Backend

Express + MongoDB Atlas API. This service is independent of the Flutter app and is meant to be hosted on **Vercel** from its own repository if you want.

Chat is **not** hosted here. The Flutter app calls Gemini directly and stores history in SQLite on the device.

## Deploy on Vercel

1. Create a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster. Allow access from anywhere (`0.0.0.0/0`) and copy the `mongodb+srv://...` connection string.
2. In Vercel: **Add New Project** → import this repo → set **Root Directory** to `backend`.
3. Add environment variables:

| Name | Value |
|---|---|
| `MONGODB_URI` | Atlas connection string |
| `JWT_SECRET` | long random string |
| `JWT_EXPIRES_IN` | `7d` |
| `CLIENT_ORIGIN` | `*` (or your Flutter web origin) |
| `NODE_ENV` | `production` |

4. Deploy. Health check: `https://YOUR-PROJECT.vercel.app/api/health`
5. Seed demo users once from your machine:

```bash
cd backend
copy .env.example .env
# put the same Atlas URI + JWT_SECRET in .env
npm install
npm run seed
```

Point the Flutter app at Vercel:

```bash
flutter run --dart-define=API_BASE_URL=https://YOUR-PROJECT.vercel.app/api
```

## Local development

Uses the same Atlas database (no Docker, no local Mongo required).

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

API: `http://localhost:5000/api/health`

## Demo accounts (after seed)

| Role | Email | Password |
|---|---|---|
| Seeker | `demo@jobsensei.app` | `Demo123!` |
| Recruiter | `recruiter@jobsensei.app` | `Recruiter123!` |
| Admin | `admin@jobsensei.app` | `Admin123!` |

See [PLAN.md](./PLAN.md) for the full endpoint list.
