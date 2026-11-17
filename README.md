# CIVILSY — Your Community. Your Voice.

[![React](https://img.shields.io/badge/React-18-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC.svg)](https://tailwindcss.com/)
[![Firebase Firestore](https://img.shields.io/badge/Firebase-Firestore-FFCA28.svg)](https://firebase.google.com/)
[![Gemini API](https://img.shields.io/badge/Gemini-AI-4285F4.svg)](https://ai.google.dev/)

**CIVILSY** is a modern, production-grade civic engagement PWA built specifically for **Ashtabula County, Ohio** (covering all 38 cities, villages, and townships). It bridges residents and local government with verified official source grounding, 311 neighborhood issue tracking, multimodal photo moderation, before-the-vote public input windows, property tax scorecards, open board/volunteer matching, and 1-tap calendar exports.

---

## Key Features

1. **Countywide Coverage (38 Jurisdictions)**:
   - Covers Ashtabula City, Conneaut, Geneva, Geneva-on-the-Lake, Jefferson, and all 27 townships and villages with exact meeting schedules, hall addresses, and official portal links.
   - Smart IP & manual location detection with instant defaulting to Ashtabula City.

2. **311 Neighborhood Issue Tracker with Multimodal AI Moderation**:
   - Report any local issue (potholes, streetlights, drainage, parks, trash, traffic signs, or custom concerns) with click-to-place map pins.
   - **Automated & Human Image Moderation**: Server-side file signature (magic bytes) validation and Gemini Vision multimodal safety screening before disk write. Unsafe photos are blocked; borderline/unclear/face-containing photos are held as `pending_review` in a moderator queue.
   - Community photo-flagging UI and role-gated moderator approval/removal queue.

3. **Before-the-Vote Resident Pulse & Meeting Recaps**:
   - 1-tap temperature checks (Support, Concerned, Question) ahead of Council and Board votes with aggregate sentiment bars.
   - Post-meeting vote scorecards showing how individual elected officials voted on key ordinances.

4. **Personalized Levies, Property Tax Reappraisal & Benchmarks**:
   - County tax reappraisal guide and local property tax calculator explaining effective millage, HB 920, and Board of Revision reviews.
   - County benchmark comparisons across all 38 jurisdictions.

5. **Open Boards, Volunteer Finder & 1-Tap .ics Calendar Export**:
   - Discover open seats on municipal planning commissions, township zoning boards, park advisory committees, and community cleanups.
   - 1-tap `.ics` calendar export and email generator to contact responsible officials.

6. **AI Civic Guide & Official Source Grounding**:
   - Grounded Google Search integration querying official municipal, county auditor, and school district portals with robust offline fallbacks.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, PWA Service Worker.
- **Backend**: Node.js, Express (`server.ts`) with Gemini SDK (`@google/genai`) proxy routes (`/api/*`).
- **Database & Auth**: Firebase Firestore & Google Authentication.

---

## Getting Started & Beta Launch Setup

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/civilsy.git
   cd civilsy
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run Development Server**:
   ```bash
   npm run dev
   ```

5. **Build for Production**:
   ```bash
   npm run build
   ```
