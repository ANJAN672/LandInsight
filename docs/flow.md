# User and Data Flow 🌊

Here is how information moves through LandInsight:

1. **Drawing on Map**: You draw a shape on the map. The app immediately calculates the square meters and hectares.
2. **State Detection**: As you draw, the app looks at your GPS points and automatically identifies which state you are in (like Karnataka or Tamil Nadu).
3. **Saving to Vault**: When you click "Save", the coordinates and land data are sent to our database.
4. **AI Analysis**:
   - The app sends your land shape + your goal (e.g., "Build a House") to the Gemini AI.
   - The AI looks at the specific GPS location to find real-world landmarks nearby.
5. **Chatting**: In the AI Chat, you can refer to your saved parcels (P1, P2, etc.), and the AI will remember the exact location and size of those parcels.
