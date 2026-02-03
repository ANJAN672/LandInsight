# LandInsight Frontend 🎨

The user interface for LandInsight - Advanced Spatial Intelligence for Indian Real Estate.

## 🛠 Tech Stack
- **Framework**: Next.js 15+ (App Router)
- **Styling**: Tailwind CSS
- **Maps**: Leaflet.js
- **State Management**: React Hooks

## 🚀 Setup & Installation

### 1. Prerequisites
- Node.js (v18 or higher)
- Backend server running (see `LI_Backend/README.md`)

### 2. Configuration
The frontend project is located in the `frontend/` directory.
Navigate to the directory and create a `.env` file:
```bash
cd frontend
cp .env.example .env
```
Ensure it points to your backend:
```env
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000"
```

### 3. Installation & Run
```bash
npm install
npm run dev
```
The app will be available at `http://localhost:3000`.

## 📍 Features
- **Interactive Map**: Draw and analyze land parcels.
- **AI Insights**: Get land usage recommendations via Gemini.
- **Spatial Search**: Find and map real estate data in India.
- **Reporting**: Export your findings as GeoJSON.

---
*"Visualizing the future of Indian Real Estate."*
