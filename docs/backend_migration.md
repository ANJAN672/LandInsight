# Backend Migration Guide

This repository now contains two apps:

- `frontend/` → Next.js UI (stays in this repo)
- `backend/` → Express REST API + Prisma (move to a new repo)

## ✅ What to move into the backend repo

Copy the entire `backend/` folder into a new GitHub repo. It contains:

- `src/` → Express REST API (auth, analysis, conversations)
- `prisma/` → Prisma schema
- `lib/prisma.ts` → Prisma client
- `package.json` + `tsconfig.json`

## ✅ Backend environment

Create a `.env` file inside the backend repo:

```
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/landinsight
GEMINI_API_KEY=your_gemini_key
JWT_SECRET=your_secret
FRONTEND_ORIGIN=http://localhost:3000
```

## ✅ Run backend

```
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Backend runs on `http://localhost:4000` by default.

## ✅ Frontend stays here

In the frontend repo, set:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

Frontend uses REST only (`frontend/lib/api.ts`).

---

This allows you to fully decouple the backend into a new repo while keeping the current repo as the frontend.
