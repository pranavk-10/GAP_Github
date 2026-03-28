# 🧠⚕️ A.S.H.A. — AI Symptom & Healthcare Advisor

> An AI-powered doctor-style consultation assistant that asks questions one by one, understands Hindi and English, grounds its advice in real doctor consultations using RAG, and helps you find nearby hospitals after diagnosis.

---

## 🚀 Overview

**A.S.H.A. (AI Symptom & Healthcare Advisor)** is a full-stack medical query assistant with:

- 🩺 **Doctor-style Q&A wizard** — asks 4–5 focused follow-up questions before providing a final assessment.
- 📚 **Retrieval-Augmented Generation (RAG)** — final assessments are grounded in real, verified patient-doctor consultations (ChatDoctor-iCliniq dataset) to ensure clinical accuracy.
- 🌍 **Bilingual** — English & Hindi input/output (auto-detected).
- 🗺️ **Hospital Map** — finds nearby hospitals, clinics, and GPs on a live Leaflet map after diagnosis.
- 🔐 **User Auth** — JWT-based login/signup to save and revisit consultation history.
- 📱 **Modern React UI** — dark mode, session sidebar, responsive design, and text-to-speech functionality.

---

## 🏗️ Architecture

```text
User enters symptom
        ↓
Language Detection (langdetect)
        ↓
【 Loop for Q1 to Q5 】
Gemini AI — asks focused follow-up question
        ↓
User answers
        ↓
【 Final Assessment Phase 】
Extract patient symptom summary
        ↓
RAG Pipeline (ChromaDB)
  • Embed Query (all-MiniLM-L6-v2)
  • Retrieve Top valid Doctor Answers
        ↓
Gemini AI + RAG Context → structured Final Assessment
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
        ↓
Click pin → Get Directions (Google Maps)
```

---

## ✨ Features

| Feature | Details |
|---|---|
| 🩺 **Step-by-step consultation** | AI asks questions one at a time, mimicking a real doctor's triage process. |
| 📚 **RAG-Grounded Advice** | Uses a local ChromaDB vector store of ~7,000 real doctor consultations to ground AI responses, reducing hallucinations. |
| 🌍 **Bilingual Support** | Auto-detects English / Hindi — replies in the same language. |
| 🗺️ **Hospital Map** | Full-screen Leaflet map with nearby hospitals, clinics, and GPs within a 5km radius. |
| 🎯 **Specialty Detection** | Map prioritizes relevant specialists (e.g., Neurology for a headache, Psychiatry for anxiety) by scanning the assessment text. |
| 🔐 **Auth (optional)** | JWT login/signup — consultation history saved securely to MongoDB. |
| 🔊 **Text-to-Speech** | Integrated Web Speech API to read assessments and advice aloud. |
| 🌙 **Dark Mode** | Full dark/light theme toggle. |

---

## ⚙️ Tech Stack

### Backend
- **Python / FastAPI** — High-performance REST API.
- **Google Gemini AI** (`google-genai`) — Symptom reasoning + bilingual Q&A.
- **ChromaDB + SentenceTransformers** — Local vector database and `all-MiniLM-L6-v2` embeddings for Retrieval-Augmented Generation.
- **LangDetect** — Automatic language detection.
- **Motor** — Async MongoDB driver.
- **python-jose & bcrypt** — JWT tokens and password hashing.
- **MongoDB Atlas** — User data + session history storage.

### Frontend
- **React + Vite** — Lightning-fast SPA environment.
- **TailwindCSS** — Responsive, modern styling.
- **Leaflet.js** — Interactive hospital mapping.
- **Overpass API** (OpenStreetMap) — Free hospital/clinic data mapped dynamically.
- **React Router** — Smooth page transitions.

---

## 🗂️ Project Structure

```
GAP_Github/
├── backend/
│   ├── main.py          # FastAPI app + AI endpoints + auth endpoints
│   ├── rag/             # RAG Pipeline
│   │   ├── ingest.py    # Downloads ChatDoctor-iCliniq & builds ChromaDB
│   │   └── rag_service.py # Singleton retriever for AI endpoints
│   ├── routers/         # Modular FastAPI routers
│   ├── auth.py          # JWT + bcrypt helpers
│   ├── database.py      # MongoDB connection (Motor)
│   └── .env             # Environment variables
└── frontend/
    └── src/
        ├── pages/
        │   ├── Chat.jsx      # Main consultation page
        │   └── MapPage.jsx   # Full-screen hospital map
        ├── components/
        │   ├── chat/         # DiagnosisCard, QuestionCard, HospitalMap
        │   └── layout/       # Header, Sidebar, AuthModal
        └── hooks/            # Custom React hooks (useAuth, useTheme, etc.)
```

---

## 🛠️ Setup

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
```

**Run RAG Ingestion (One-time setup):**
```bash
python -m rag.ingest
```

**Create `.env` file:**
```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini_model_name
MONGO_CONNECTION_URI=your_mongo_url
JWT_SECRET=your_secret_here
```

**Start the Server:**
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
| POST | `/api/chat` | Send symptom / answer, get next question or final RAG-enhanced result. |
| POST | `/auth/register` | Register new user, returns JWT. |
| POST | `/auth/login` | Login, returns JWT. |
| GET | `/sessions` | Get saved sessions (requires JWT). |
| POST | `/sessions` | Save/update a session (requires JWT). |

---

## 🩺 Safety & Disclaimer

A.S.H.A. does **not provide medical diagnosis**.
It offers educational guidance, symptom triage, and strongly encourages professional medical consultation. Never disregard professional medical advice or delay seeking it because of something you read generated by this application.

---

## 👥 Team

**ML Team** — Pranav Kamble · Aryaman Rane  
**Development** — Gaurav Sharma

---

**A.S.H.A.: Because every health question deserves an answer.**
