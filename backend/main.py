"""
main.py – FastAPI application entry point for ASHA.

Structure:
  main.py          ← you are here (app setup, lifespan, CORS)
  models.py        ← Pydantic request/response models
  ai_service.py    ← Gemini init, prompts, language detection, fallbacks
  auth.py          ← JWT + bcrypt helpers
  database.py      ← MongoDB async connection
  routers/
    chat.py        ← POST /api/chat
    auth.py        ← POST /auth/register, POST /auth/login
    sessions.py    ← GET/POST /sessions
"""

import os
from contextlib import asynccontextmanager

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ai_service import app_state
from routers import chat as chat_router
from routers import auth as auth_router
from routers import sessions as sessions_router

load_dotenv()


@asynccontextmanager
async def lifespan(_: FastAPI):
    # ── Gemini ─────────────────────────────────────────────────────────────────
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    if api_key:
        genai.configure(api_key=api_key)
        app_state["gemini_model"] = genai.GenerativeModel(model_name)
        print(f"✅ Gemini model initialised: {model_name}")
    else:
        app_state["gemini_model"] = None
        print("⚠️  GEMINI_API_KEY not set — AI responses unavailable.")

    # ── RAG service ────────────────────────────────────────────────────────────
    try:
        from rag.rag_service import rag_service
        rag_service.initialise()
        if rag_service.is_ready:
            print("✅ RAG service initialised — vector store loaded")
        else:
            print("⚠️  RAG service not ready — run `python -m rag.ingest` to build the vector store")
    except Exception as exc:
        print(f"⚠️  RAG service failed to load ({exc}) — continuing without RAG")

    yield
    app_state.clear()


app = FastAPI(
    title="ASHA API",
    description="Bilingual Engine for AI Symptom Triage",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router.router)
app.include_router(auth_router.router)
app.include_router(sessions_router.router)
