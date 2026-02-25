import json
import os
import re
from contextlib import asynccontextmanager
from typing import Literal, Optional

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langdetect import LangDetectException, detect
from pydantic import BaseModel, Field

load_dotenv()

app_state: dict[str, object] = {"gemini_model": None}

MAX_QUESTIONS = 5


# ─── Pydantic models ────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class QueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessage] = Field(default_factory=list)
    question_count: int = Field(default=0, ge=0, le=10)


class QuestioningResponse(BaseModel):
    stage: Literal["questioning"]
    question: str
    question_number: int


class FinalResponse(BaseModel):
    stage: Literal["final"]
    assessment: str
    advice: list[str]
    red_flags: list[str]
    disclaimer: str


# ─── Helpers ────────────────────────────────────────────────────────────────

def detect_language(text: str) -> str:
    try:
        lang = detect(text)
        return "hi" if lang == "hi" else "en"
    except LangDetectException:
        return "en"


def format_history(history: list[ChatMessage]) -> str:
    if not history:
        return "No previous conversation."
    lines: list[str] = []
    for message in history[-12:]:
        role = "Patient" if message.role == "user" else "Doctor"
        lines.append(f"{role}: {message.content.strip()}")
    return "\n".join(lines)


def extract_json(text: str) -> dict:
    """Try to extract JSON from Gemini's response even if wrapped in markdown."""
    # Remove markdown code fences
    cleaned = re.sub(r"```(?:json)?", "", text).replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to find JSON object in the text
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if match:
            return json.loads(match.group())
        raise


# ─── Prompt builders ────────────────────────────────────────────────────────

def build_questioning_prompt(query: str, history_text: str, language_code: str, question_number: int) -> str:
    lang = "Hindi" if language_code == "hi" else "English"
    return f"""You are a calm, empathetic medical assistant conducting a structured patient interview.

RULES:
- Respond ONLY in {lang}.
- Ask exactly ONE short, clear follow-up question based on the patient's previous answers.
- This is question number {question_number} of {MAX_QUESTIONS}.
- The question must be specific and clinically relevant (e.g. duration, severity, location, associated symptoms, past medical history, medications taken).
- Do NOT repeat questions already asked in the conversation history.
- Do NOT provide any advice, diagnosis, or assessment yet.
- Do NOT ask multiple questions at once.
- Keep the question concise (1–2 sentences).
- Return ONLY valid JSON in exactly this format (no markdown, no extra text):

{{
  "stage": "questioning",
  "question": "<your single question here>",
  "question_number": {question_number}
}}

Conversation so far:
{history_text}

Patient's initial complaint / latest message:
{query}
""".strip()


def build_final_prompt(query: str, history_text: str, language_code: str) -> str:
    lang = "Hindi" if language_code == "hi" else "English"
    return f"""You are a calm, empathetic medical assistant who has now gathered enough information about the patient.

RULES:
- Respond ONLY in {lang}.
- Based on all conversation history, provide a complete educational assessment.
- Do NOT provide an official diagnosis — provide educational guidance and next steps.
- Be practical, compassionate, and clear.
- Return ONLY valid JSON in exactly this format (no markdown, no extra text):

{{
  "stage": "final",
  "assessment": "<2-4 sentence summary of what the patient likely has or what is going on, based on their symptoms>",
  "advice": [
    "<actionable advice step 1>",
    "<actionable advice step 2>",
    "<actionable advice step 3>",
    "<actionable advice step 4>"
  ],
  "red_flags": [
    "<warning sign that requires immediate medical attention 1>",
    "<warning sign 2>",
    "<warning sign 3>"
  ],
  "disclaimer": "<1 sentence educational disclaimer>"
}}

Conversation so far:
{history_text}

Patient's latest message:
{query}
""".strip()


# ─── Fallback responses ─────────────────────────────────────────────────────

def fallback_questioning(question_number: int, language_code: str) -> dict:
    questions_en = [
        "How long have you been experiencing these symptoms?",
        "On a scale of 1–10, how severe is your discomfort right now?",
        "Are you experiencing any other symptoms alongside this?",
        "Do you have any relevant medical history or ongoing conditions?",
        "Have you taken any medications or tried any remedies? If so, did they help?",
    ]
    questions_hi = [
        "आपको यह लक्षण कब से हैं?",
        "1 से 10 के पैमाने पर, अभी आपकी तकलीफ़ कितनी तेज है?",
        "क्या इसके साथ कोई और लक्षण भी हैं?",
        "क्या आपका कोई पुराना रोग या चिकित्सा इतिहास है?",
        "क्या आपने कोई दवा ली है? यदि हाँ, तो क्या उससे आराम मिला?",
    ]
    idx = min(question_number - 1, 4)
    questions = questions_hi if language_code == "hi" else questions_en
    return {
        "stage": "questioning",
        "question": questions[idx],
        "question_number": question_number,
    }


def fallback_final(language_code: str) -> dict:
    if language_code == "hi":
        return {
            "stage": "final",
            "assessment": "आपके द्वारा बताए गए लक्षणों के आधार पर, यह सामान्य स्वास्थ्य समस्या हो सकती है। कृपया किसी चिकित्सक से परामर्श लें।",
            "advice": [
                "पर्याप्त आराम करें।",
                "अच्छे से हाइड्रेट रहें — पानी और इलेक्ट्रोलाइट्स लें।",
                "यदि लक्षण बने रहें तो नजदीकी डॉक्टर से मिलें।",
                "किसी भी नई दवा से पहले डॉक्टर की सलाह लें।",
            ],
            "red_flags": [
                "अचानक तेज दर्द या सांस लेने में तकलीफ",
                "बेहोशी या भ्रम की स्थिति",
                "लक्षणों का तेजी से बिगड़ना",
            ],
            "disclaimer": "यह शैक्षिक मार्गदर्शन है, कोई चिकित्सीय निदान नहीं। निदान के लिए डॉक्टर से मिलें।",
        }
    return {
        "stage": "final",
        "assessment": "Based on the symptoms you've described, this may be a common health concern. However, a proper evaluation by a qualified doctor is needed to confirm anything.",
        "advice": [
            "Get adequate rest and avoid strenuous activity.",
            "Stay well hydrated — drink water and consider electrolytes.",
            "If symptoms persist or worsen, visit a doctor soon.",
            "Do not self-medicate with prescription drugs without a doctor's advice.",
        ],
        "red_flags": [
            "Sudden severe pain or difficulty breathing",
            "Loss of consciousness or confusion",
            "Rapid worsening of symptoms",
        ],
        "disclaimer": "This is educational guidance only and does not constitute a medical diagnosis. Please consult a qualified clinician.",
    }


# ─── App setup ──────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(_: FastAPI):
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

    if api_key:
        genai.configure(api_key=api_key)
        app_state["gemini_model"] = genai.GenerativeModel(model_name)
        print(f"Gemini model initialized: {model_name}")
    else:
        app_state["gemini_model"] = None
        print("GEMINI_API_KEY not set. Gemini responses are unavailable.")

    yield
    app_state.clear()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Endpoint ────────────────────────────────────────────────────────────────

@app.post("/api/chat")
async def chat_endpoint(request: QueryRequest):
    query = request.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    gemini_model = app_state.get("gemini_model")
    if gemini_model is None:
        raise HTTPException(
            status_code=503,
            detail="Gemini is not configured. Add GEMINI_API_KEY in backend environment.",
        )

    language_code = detect_language(query)
    history_text = format_history(request.history)
    question_number = request.question_count + 1
    is_final = request.question_count >= MAX_QUESTIONS

    # Choose prompt based on stage
    if is_final:
        prompt = build_final_prompt(query, history_text, language_code)
    else:
        prompt = build_questioning_prompt(query, history_text, language_code, question_number)

    try:
        result = gemini_model.generate_content(prompt)
        response_text = (getattr(result, "text", None) or "").strip()
        data = extract_json(response_text)
    except json.JSONDecodeError:
        # JSON parsing failed — use fallback
        data = fallback_final(language_code) if is_final else fallback_questioning(question_number, language_code)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini request failed: {exc}") from exc

    # Normalise stage field in case Gemini misses it
    if "stage" not in data:
        data["stage"] = "final" if is_final else "questioning"

    return data
