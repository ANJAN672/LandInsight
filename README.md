<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# LandInsight 🏡🚀

**Advanced Spatial Intelligence for Indian Real Estate.**

LandInsight helps you turn raw land shapes into actionable wealth reports. Draw your boundary, get AI insights on your purpose, and chat with a spatial intelligence agent to uncover the full potential of your property.

---

## ✅ Repo Structure

```
LandInsight/
├─ frontend/   # Next.js UI
├─ backend/    # Express REST API + Prisma
```

---

## 🚀 Local Setup (pgAdmin / PostgreSQL)

### 1. Configure `.env` in backend/

```
DATABASE_URL=postgresql://<user>:<password>@localhost:5432/landinsight
GEMINI_API_KEY=your_gemini_key
JWT_SECRET=your_secret
FRONTEND_ORIGIN=http://localhost:3000
```

### 2. Backend

```
cd backend
npm install
npx prisma generate
npx prisma db push
npm run dev
```

### 3. Frontend

```
cd frontend
npm install
npm run dev
```

### Optional: Set API base URL

Frontend uses `NEXT_PUBLIC_API_BASE_URL` to reach Express:

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

---

## 📚 Project Documentation

- 🏗 [Architecture Overview](./docs/architecture.md)
- 🛠 [Tech Stack Details](./docs/tech_stack.md)
- 🌊 [User & Data Flow](./docs/flow.md)
- 🛠 [Errors & Fixes Log](./docs/errors_fixes.md)
- 💡 [Simple Explanation](./docs/explanation.md)

---

*“Turning raw coordinates into actionable real estate wealth.”*
