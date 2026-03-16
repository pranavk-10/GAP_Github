# 🧠⚕️ BEAST — Multilingual AI Medical Symptom Assistant

> An AI-powered doctor-style consultation assistant that asks questions one by one, understands Hindi/Hinglish/English, and helps you find nearby hospitals after diagnosis.

---

## 🚀 Overview

**BEAST (Bilingual Engine for AI Symptom Triage)** is a full-stack medical query assistant with:

- 🩺 **Doctor-style Q&A wizard** — asks 4–5 focused follow-up questions before giving a final assessment
- 🌍 **Trilingual** — English, Hindi, and Hinglish input/output (auto-detected)
- 🗺️ **Hospital Map** — finds nearby hospitals, clinics, and GPs on a live Leaflet map after diagnosis
- 🔐 **User Auth** — JWT-based login/signup to save and revisit consultation history
- 📱 **Modern React UI** — dark mode, session sidebar, responsive design

---

## 🏗️ Architecture

```
User enters symptom
        ↓
Language Detection (langdetect)
        ↓
Gemini AI — asks 4–5 focused questions one by one
        ↓
After answers → structured Final Assessment
  • Assessment summary
  • What to do now (advice list)
  • Red flags (seek urgent care if…)
  • Disclaimer
        ↓
"Find Nearby Hospitals" button
        ↓
Browser Geolocation → Overpass API (OpenStreetMap)
        ↓
Leaflet map with colour-coded pins
  🟠 Specialist match  🔴 Hospital  🟣 Clinic  🟢 GP/Centre
        ↓
Click pin → Get Directions (Google Maps)
```

---

## ✨ Features

| Feature | Details |
|---|---|
| 🩺 Step-by-step consultation | AI asks questions one at a time, like a doctor |
| 🌍 Trilingual | Auto-detects English / Hindi / Hinglish — replies in same language |
| 🗺️ Hospital Map | Full-screen Leaflet map with nearby hospitals, clinics & GPs |
| 🎯 Specialty detection | Map prioritises relevant specialists (Neurology for headache, Psychiatry for anxiety, etc.) |
| 🔐 Auth (optional) | JWT login/signup — history saved to MongoDB |
| 📂 Session Sidebar | Browse past consultations (logged-in users) |
| 🌙 Dark mode | Full dark/light theme toggle |
| 🚫 No empty responses | Universal fallback for rare/unknown conditions |

---

## ⚙️ Tech Stack

### Backend
- **Python / FastAPI** — REST API
- **Google Gemini AI** (`google-genai`) — symptom reasoning + multilingual Q&A
- **LangDetect** — auto language detection
- **Motor** — async MongoDB driver
- **python-jose** — JWT tokens
- **bcrypt** — password hashing
- **MongoDB Atlas** (`cssdb`) — user data + session history

### Frontend
- **React + Vite** — SPA
- **TailwindCSS** — styling
- **Leaflet.js** — interactive hospital map
- **Overpass API** (OpenStreetMap) — free hospital/clinic data, no API key needed
- **React Router** — page routing
- **Axios** — API calls

---

## 🗂️ Project Structure

```
GAP_Github/
├── backend/
│   ├── main.py          # FastAPI app + AI endpoints + auth endpoints
│   ├── auth.py          # JWT + bcrypt helpers
│   ├── database.py      # MongoDB connection (Motor)
│   ├── requirements.txt
│   └── .env             # GEMINI_API_KEY, MONGO_CONNECTION_URI, JWT_SECRET
└── frontend/
    └── src/
        ├── pages/
        │   ├── Chat.jsx      # Main consultation page
        │   └── MapPage.jsx   # Full-screen hospital map
        ├── components/
        │   ├── chat/
        │   │   ├── DiagnosisCard.jsx   # Final result + hospital button
        │   │   └── QuestionCard.jsx    # Individual question UI
        │   ├── layout/
        │   │   ├── Header.jsx          # Login/logout
        │   │   └── Sidebar.jsx         # Session history
        │   └── AuthModal.jsx           # Login / Sign up modal
        ├── hooks/
        │   ├── useAuth.js      # JWT state management
        │   └── useSessions.js  # Session list state
        └── services/
            └── chatServics.js  # API calls incl. session save/load
```

---

## 🛠️ Setup

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
```

Create `.env`:
```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.0-flash
MONGO_CONNECTION_URI=your_mongo_uri_here
JWT_SECRET=your_secret_here
```

```bash
uvicorn main:app --reload
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 🔑 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat` | Send symptom / answer, get next question or final result |
| POST | `/auth/register` | Register new user, returns JWT |
| POST | `/auth/login` | Login, returns JWT |
| GET | `/sessions` | Get saved sessions (requires JWT) |
| POST | `/sessions` | Save/update a session (requires JWT) |

---

## 🗺️ Hospital Map

After a consultation, click **"🏥 Find Nearby Hospitals"** to open the full-screen map:

- Allows browser location access
- Queries **Overpass API** (free, no key needed) for hospitals, clinics, GPs within 7 km
- Detects relevant specialty from your assessment text and prioritises those facilities
- Colour-coded pins: 🟠 Specialist · 🔴 Hospital · 🟣 Clinic · 🟢 GP
- Click any pin → popup with name, phone, **"Get Directions"** (Google Maps)

---

## 🔐 Authentication

- **Anonymous use** fully supported — no login required to consult the bot
- **Login / Sign up** → sessions saved to MongoDB and accessible from the sidebar
- Passwords hashed with **bcrypt**, tokens signed with **JWT** (30-day expiry)
- Stored in `localStorage` on the frontend

---

## 🩺 Safety

BEAST does **not provide medical diagnosis**.
It offers educational guidance and strongly encourages professional medical consultation.

---

## 📈 Applications

- Symptom triage assistants
- Telehealth pre-screening
- Healthcare chatbots
- Multilingual health access (rural / regional)

---

## 👥 Team

**ML Team** — Pranav Kamble · Aryaman Rane  
**Development** — Gaurav Sharma

---

**BEAST: Because every health question deserves an answer.**
