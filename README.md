# LandInsight 🏡🚀

**Advanced Spatial Intelligence for Indian Real Estate.**

LandInsight helps you turn raw land shapes into actionable wealth reports. Draw your boundary, get AI insights on your purpose, and chat with a spatial intelligence agent to uncover the full potential of your property.

---

## 🎨 Frontend Overview

The LandInsight Frontend is a high-performance spatial interface built with **Next.js 15+** and **Leaflet.js**. It provides a seamless experience for real estate developers, investors, and homeowners to visualize and manage their land assets.

### 🛠 Tech Stack
- **Framework**: Next.js 15+ (App Router)
- **Styling**: Vanilla CSS + Tailwind
- **Maps**: Leaflet.js with Geoman for spatial drawing
- **State**: React Server Components & Hooks
- **Icons**: Lucide React

---

## 🚀 Local Setup

### 1. Prerequisites
- **Node.js**: v18 or higher.
- **Backend API**: Ensure the [LandInsight Backend](https://github.com/ANJAN672/LandInsight-Backend) is running.

### 2. Installation
Navigate to the `frontend/` directory and install dependencies:
```bash
cd frontend
npm install
```

### 3. Environment Config
Create a `.env` file in the `frontend/` folder:
```bash
cp .env.example .env
```
Ensure it points to your running backend:
```env
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000"
```

### 4. Development mode
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to see the app.

---

## 📍 Key Features

- **Interactive Spatial Canvas**: Advanced drawing tools to map any land parcel in India with GPS precision.
- **AI Land Analysis**: Integration with Google Gemini for deep property evaluation, zoning estimates, and ROI predictions.
- **Spatial Vault**: Save and organize your land parcels into a private collection.
- **Real-time API Sync**: Continuous synchronization with the Node.js backend for data persistency.
- **GeoJSON Continuity**: native support for exporting and importing industry-standard spatial data.

---


---

*"Visualizing the future of Indian Real Estate."*
