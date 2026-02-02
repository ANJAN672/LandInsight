# System Architecture 🏗

LandInsight is built with a "Full-Stack" approach. This means everything is kept together in one solid structure:

1. **Frontend (User Interface)**:
   - Built with **React**.
   - Handles the maps, the drawing tools, and the chat bubbles.
   - Designed to be very fast and responsive.

2. **Backend (Server Operations)**:
   - Uses **Node.js** via Next.js Server Actions.
   - This part of the app is "invisible" to you but handles the hard work like calculating land size and sending data to the AI.

3. **Database Layer**:
   - Stores your login info, your saved land (Land Vault), and your chat history.
   - Connected via **Prisma ORM** for safety and reliability.

4. **AI Integration**:
   - The app connects to **Google Gemini** servers to process complex real estate questions.
