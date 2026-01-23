
# Land Insight PRD

## 1. Product Concept
Land Insight is a spatial intelligence tool for land owners. It allows users to define property boundaries on a map and receive professional-grade land analysis via AI.

## 2. Target Audience
- **Land Owners:** Individuals looking to understand development potential.
- **Real Estate Agents:** Professionals needing quick "ballpark" risk assessments.
- **Investors:** Developers vetting rural or undeveloped land parcels.

## 3. Key Features
- **Polygon Map Tool:** Draw custom boundaries on high-res maps.
- **Automated Calculations:** Instant calculation of square meters and hectares.
- **AI Report Engine:** Integration with Gemini for Risk, Opportunity, and Zoning analysis.
- **Portfolio Dashboard:** Save and compare multiple land parcels.
- **Admin Management:** Oversight of generated reports and system activity.

## 4. User Flow
1. **Land:** User lands on the homepage, learns about the value prop.
2. **Analysis:** User draws boundaries on an interactive map.
3. **Trigger:** User clicks "Generate Insight".
4. **Insight:** Gemini processes spatial data (area, dummy metadata) and returns structured analysis.
5. **Retention:** Analysis is saved to the dashboard for future reference.

## 5. Technical Requirements
- **Frontend:** React with Tailwind CSS for high-quality, minimal UI.
- **Maps:** Leaflet/OpenStreetMap for free-tier interactive drawing.
- **Intelligence:** Google Gemini API for natural language reports based on spatial inputs.
- **Persistence:** LocalStorage for MVP persistence.

## 6. Future Roadmap
- **Real Legal Data:** Integrate with official government GIS/Zoning APIs.
- **Satellite Analysis:** Use Vision models to detect foliage, buildings, or water bodies.
- **Exporting:** PDF report generation.
- **Collaborative Maps:** Multi-user shared projects.
