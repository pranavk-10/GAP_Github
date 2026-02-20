import os
from contextlib import asynccontextmanager
from typing import Literal

import google.generativeai as genai
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langdetect import LangDetectException, detect
from pydantic import BaseModel, Field

load_dotenv()

app_state: dict[str, object] = {"gemini_model": None}


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class QueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessage] = Field(default_factory=list)


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
        role = "Patient" if message.role == "user" else "Doctor Assistant"
        lines.append(f"{role}: {message.content.strip()}")

    return "\n".join(lines)


def build_triage_prompt(query: str, history_text: str, language_code: str) -> str:
    response_language = "Hindi" if language_code == "hi" else "English"
    heading_1 = "1. प्रारंभिक समझ" if language_code == "hi" else "1. Initial understanding"
    heading_2 = "2. आगे के प्रश्न" if language_code == "hi" else "2. Follow-up questions"
    heading_3 = "3. अभी क्या करें" if language_code == "hi" else "3. What to do now"
    heading_4 = (
        "4. चेतावनी संकेत / कब तुरंत डॉक्टर को दिखाएं"
        if language_code == "hi"
        else "4. Red flags / when to seek urgent care"
    )
    heading_5 = (
        "5. महत्वपूर्ण सूचना (यह निदान नहीं है)"
        if language_code == "hi"
        else "5. Important note (educational guidance, not a diagnosis)"
    )

    return f"""
You are a calm, careful, doctor-like medical assistant for educational guidance.

Strict rules:
- Respond only in {response_language}.
- Keep a compassionate and professional tone.
- Be descriptive and practical for every query.
- Do not provide a final diagnosis; provide guidance and next steps.
- If details are missing, ask 3 to 6 focused follow-up questions first.
- For headache-like complaints, include onset, progression, pain severity,
  associated symptoms, patient history, and medicines already taken.
- Include red-flag emergency signs when relevant.
- Use conversation history and do not repeat questions already answered.
- Keep semantic quality consistent across languages. A Hindi query should get the same level
  of detail as an English query for similar medical context.
- Use markdown with clean spacing.
- Put a blank line between every section and between list items/paragraph blocks.

Required markdown output template:
### {heading_1}
<paragraph>

### {heading_2}
1. <question>
2. <question>
3. <question>

### {heading_3}
- <action>
- <action>

### {heading_4}
- <red flag>
- <red flag>

### {heading_5}
<paragraph>

Conversation so far:
{history_text}

Latest patient message:
{query}
""".strip()


@asynccontextmanager
async def lifespan(_: FastAPI):
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

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
    prompt = build_triage_prompt(query, history_text, language_code)

    try:
        result = gemini_model.generate_content(prompt)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini request failed: {exc}") from exc

    response_text = (getattr(result, "text", None) or "").strip()

    if not response_text:
        if language_code == "hi":
            response_text = (
                "### 1. प्रारंभिक समझ\n"
                "सुरक्षित मार्गदर्शन देने के लिए मुझे थोड़ी और जानकारी चाहिए।\n\n"
                "### 2. आगे के प्रश्न\n"
                "1. यह कब शुरू हुआ?\n"
                "2. दर्द कितना तेज है?\n"
                "3. आपने कौन-सी दवा ली है?\n\n"
                "### 3. अभी क्या करें\n"
                "- आराम करें।\n"
                "- पानी पिएं और ट्रिगर से बचें।\n\n"
                "### 4. चेतावनी संकेत / कब तुरंत डॉक्टर को दिखाएं\n"
                "- अचानक बहुत तेज दर्द, बुखार, भ्रम, कमजोरी, या उल्टी।\n\n"
                "### 5. महत्वपूर्ण सूचना (यह निदान नहीं है)\n"
                "यह सामान्य शैक्षिक मार्गदर्शन है। अंतिम निदान के लिए डॉक्टर से सलाह लें।"
            )
        else:
            response_text = (
                "### 1. Initial understanding\n"
                "I need a bit more detail to guide you safely.\n\n"
                "### 2. Follow-up questions\n"
                "1. When did it start?\n"
                "2. How severe is it right now?\n"
                "3. What medicines have you taken?\n\n"
                "### 3. What to do now\n"
                "- Rest in a quiet place.\n"
                "- Hydrate and avoid triggers.\n\n"
                "### 4. Red flags / when to seek urgent care\n"
                "- Sudden severe pain, fever, confusion, weakness, or persistent vomiting.\n\n"
                "### 5. Important note (educational guidance, not a diagnosis)\n"
                "This is educational guidance only. Please consult a clinician for diagnosis."
            )

    return {"response": response_text}
