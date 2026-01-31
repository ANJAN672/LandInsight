# Land Insight - Interview Prep Document

---

## 1. Product Understanding

### What problem does Land Insight solve?
- Users don't know if land is good for their purpose (house, farm, warehouse).
- Government land records are scattered and hard to read.
- Getting land valuation costs ₹5000-10000 and takes weeks.
- **Land Insight gives instant AI insights by just drawing on a map.**

### Why is this important in India?
- 70% of court cases in India are land disputes.
- Land records are still paper-based in many states.
- Farmers and first-time buyers get cheated due to lack of information.
- Real estate is a ₹12 lakh crore market.

### How is it different from Google Maps?
| Google Maps | Land Insight |
|-------------|--------------|
| Shows location | Analyzes land suitability |
| No AI insights | AI-powered recommendations |
| No area calculation | Calculates area in local units |
| No zoning info | Checks zoning & legal constraints |

---

## 2. System Architecture

### Frontend
- React + TypeScript
- Leaflet.js for maps
- TailwindCSS for styling
- Vite for fast builds

### Backend
- FastAPI (Python)
- PostgreSQL database
- PostGIS for spatial queries

### AI Layer
- Google Gemini API
- Prompt Adapter for structured queries
- Optional RAG for legal documents

### Data Flow
```
User draws polygon → Frontend calculates area → 
Sends coordinates to /analyze-land → 
Backend calls Gemini API → 
Returns structured insights → 
Frontend displays report
```

---

## 3. Tech Stack Justification

### Why React?
- Component-based, easy to maintain.
- Large ecosystem (Leaflet, Zustand, etc.).
- Team familiarity.

### Why Leaflet over Google Maps?
- Free and open-source.
- No API key billing surprises.
- Works offline.
- Custom overlays are easier.

### Why FastAPI over Flask?
- Async by default (handles more users).
- Auto-generates API docs (Swagger).
- Type hints = fewer bugs.
- 3x faster than Flask.

### Database Choice
| Use Case | Database |
|----------|----------|
| Structured land data | PostgreSQL + PostGIS |
| Fast caching | Redis |
| Document storage (PDFs) | MongoDB (optional) |

---

## 4. Backend Deep Dive

### How /analyze-land works
1. Receives: `{ polygon: [[lat, lng], ...], goal: "residential" }`
2. Validates polygon (min 3 points).
3. Calculates area using Shoelace formula.
4. Builds prompt with coordinates + user context.
5. Calls Gemini API.
6. Parses response into structured JSON.
7. Returns insights to frontend.

### Area Calculation
```python
def calculate_area(coords):
    # Shoelace formula for polygon area
    n = len(coords)
    area = 0
    for i in range(n):
        j = (i + 1) % n
        area += coords[i][0] * coords[j][1]
        area -= coords[j][0] * coords[i][1]
    return abs(area) / 2
```

### Data Storage
- User sessions: localStorage (frontend)
- Analysis history: PostgreSQL
- Polygon geometry: PostGIS GEOMETRY type

---

## 5. AI / LLM Layer

### What is Prompt Adapter?
- Converts user input into structured prompts.
- Example:
```
User: "I want to build a house"
Prompt: "Analyze this land for residential construction.
         Location: [12.97, 77.59]
         Area: 2400 sqft
         Check: zoning, soil, water table, road access"
```

### How RAG is used
- Retrieves relevant government rules from vector DB.
- Injects into prompt as context.
- Reduces hallucination.

### Why Gemini?
- Free tier available (300 RPM).
- Grounding with Google Search.
- Good for structured outputs.
- Cheaper than GPT-4.

### Avoiding Hallucination
- Always include coordinates in prompt.
- Use grounding (search) for real data.
- Validate AI output against known rules.
- Show "sources" to the user.

---

## 6. Business & Startup Questions

### Monetization
1. **Freemium**: 3 free analyses/month.
2. **Pro**: ₹499/month for unlimited.
3. **Enterprise**: Custom pricing for builders.
4. **API**: Charge per call to other apps.

### Target Users
- Individual land buyers.
- Real estate agents.
- Agricultural consultants.
- Construction companies.

### Market Opportunity
- 50 lakh+ land transactions per year in India.
- Even 1% = 50,000 potential users.
- Avg ticket: ₹500 = ₹2.5 crore revenue.

### How it Scales
- AI handles load (no manual analysis).
- Add more regions by training prompts.
- Partner with banks for home loan pre-checks.

### Why it Survives
- Low cost to run (API-based).
- No inventory or logistics.
- Sticky users (save reports).
- First-mover in India prop-tech AI.

---

## 7. Security & Best Practices

### Auth System
- JWT tokens (stateless).
- Refresh tokens for long sessions.
- OAuth integration planned.

### Role-Based Access
| Role | Access |
|------|--------|
| User | Own analyses |
| Admin | All users + analytics |

### Data Privacy
- No land data stored permanently (user choice).
- HTTPS everywhere.
- Coordinates anonymized in logs.

### API Security
- Rate limiting (100 req/min).
- API key validation.
- Input sanitization (SQL injection safe).

---

## 8. Future Scope

### Next Features
- Mobile app (React Native).
- Satellite image analysis.
- Legal document upload + parsing.
- Land price prediction ML model.

### ML Training
- Collect user feedback on insights.
- Train model on verified transactions.
- Use satellite imagery for crop/soil detection.

### Government Integration
- Connect to Bhoomi/Dharani APIs.
- Auto-fetch ownership records.
- e-Stamp integration.

### Enterprise Version
- White-label for banks.
- Bulk analysis for builders.
- Custom reports with branding.

---

## Quick Interview Answers

**Q: What is Land Insight in one line?**  
A: It's like Google Maps + ChatGPT for land analysis.

**Q: What's the hardest part you built?**  
A: The Prompt Adapter that converts messy user input into structured AI queries.

**Q: What would you improve?**  
A: Add satellite image analysis and real-time government data integration.

**Q: Why should we hire you?**  
A: I built a full-stack AI product from scratch, handled real prop-tech problems, and can ship fast.

---

*Generated for interview prep. Simplify further as needed.*
