"""
ai_service.py – Gemini AI setup, language detection, prompt builders, and fallback responses.
"""

import json
import re

import google.generativeai as genai
from langdetect import LangDetectException, detect

from models import ChatMessage

MAX_QUESTIONS = 5

# Shared state — Gemini model is injected at app startup via lifespan
app_state: dict[str, object] = {"gemini_model": None}


# ─── Helpers ─────────────────────────────────────────────────────────────────

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
    cleaned = re.sub(r"```(?:json)?", "", text).replace("```", "").strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if match:
            return json.loads(match.group())
        raise


# ─── Prompt builders ──────────────────────────────────────────────────────────

def build_questioning_prompt(query: str, history_text: str, language_code: str, question_number: int) -> str:
    lang_hint = "Hindi" if language_code == "hi" else "English"
    return f"""You are a calm, empathetic medical assistant conducting a structured patient interview.

LANGUAGE RULES:
- The patient's detected language is {lang_hint}, but ALWAYS match the patient's ACTUAL language and style from the conversation.
- If the patient writes in pure Hindi, respond in Hindi.
- If the patient writes in pure English, respond in English.
- If the patient mixes Hindi and English (Hinglish), respond in the same mixed Hinglish style.
- Medical terms and medicine names may remain in English regardless of language.

RULES:
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


def build_final_prompt(query: str, history_text: str, language_code: str, rag_context: str = "") -> str:
    lang_hint = "Hindi" if language_code == "hi" else "English"

    # Only inject RAG block when context was actually retrieved
    rag_block = ""
    if rag_context and rag_context.strip():
        rag_block = f"""
--- Relevant Medical Reference (from verified patient-doctor records) ---
{rag_context.strip()}
--- End of Reference ---

Use the reference above to inform and ground your assessment where applicable.
""".rstrip()

    return f"""You are a calm, empathetic medical assistant who has now gathered enough information about the patient.

LANGUAGE RULES:
- The patient's detected language is {lang_hint}, but ALWAYS match the patient's ACTUAL language and style from the conversation.
- If the patient writes in pure Hindi, respond in Hindi.
- If the patient writes in pure English, respond in English.
- If the patient mixes Hindi and English (Hinglish), respond in the same mixed Hinglish style.
- Medicine names, dosages, and medical terminology (e.g. "Paracetamol 500mg", "ibuprofen", "ORS") MUST always remain in English regardless of the output language.

RULES:
- Based on all conversation history, provide a complete educational assessment.
- Do NOT provide an official diagnosis — provide educational guidance and next steps.
- Be practical, compassionate, and clear.
- Provide a severity label: "mild" if likely manageable at home, "moderate" if a doctor visit is recommended, or "severe" if urgent medical attention is needed.
- Provide 3–5 specific, safe home remedies or self-care steps the patient can try immediately at home.
  These should be practical (e.g. specific OTC medications with dosage, compresses, dietary changes, rest positions, exercises).
  NEVER recommend prescription medications. Include relevant do's and don'ts.
- Return ONLY valid JSON in exactly this format (no markdown, no extra text):

{{
  "stage": "final",
  "severity": "<mild | moderate | severe>",
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
  "home_remedies": [
    "<specific self-care step 1 with details, e.g. dosage, duration, method>",
    "<specific self-care step 2>",
    "<specific self-care step 3>",
    "<specific self-care step 4>"
  ],
  "disclaimer": "<1 sentence educational disclaimer>"
}}{rag_block}

Conversation so far:
{history_text}

Patient's latest message:
{query}
""".strip()


def build_followup_prompt(query: str, history_text: str, diagnosis_context: str, language_code: str) -> str:
    lang_hint = "Hindi" if language_code == "hi" else "English"
    return f"""You are a calm, empathetic medical assistant. The patient has already received their medical assessment and is now asking a follow-up question.

LANGUAGE RULES:
- The patient's detected language is {lang_hint}, but ALWAYS match the patient's ACTUAL language and style from the conversation.
- If the patient writes in pure Hindi, respond in Hindi.
- If the patient writes in pure English, respond in English.
- If the patient mixes Hindi and English (Hinglish), respond in the same mixed Hinglish style.
- Medicine names, dosages, and medical terminology MUST always remain in English regardless of the output language.

RULES:
- Answer the follow-up question concisely and helpfully based on the consultation context.
- Do NOT re-diagnose. Do NOT provide a new assessment structure.
- Be conversational and compassionate.
- Return ONLY valid JSON in exactly this format (no markdown, no extra text):

{{
  "stage": "follow_up",
  "answer": "<your direct, clear answer to the patient's question>"
}}

Original assessment summary:
{diagnosis_context}

Conversation so far:
{history_text}

Patient's follow-up question:
{query}
""".strip()


# ─── Fallback responses ───────────────────────────────────────────────────────

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
            "severity": "moderate",
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
            "home_remedies": [
                "पर्याप्त नींद लें — 7-8 घंटे।",
                "गुनगुना पानी पिएं।",
                "तनाव से बचें और गहरी सांस लें।",
            ],
            "disclaimer": "यह शैक्षिक मार्गदर्शन है, कोई चिकित्सीय निदान नहीं। निदान के लिए डॉक्टर से मिलें।",
        }
    return {
        "stage": "final",
        "severity": "moderate",
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
        "home_remedies": [
            "Get 7–8 hours of quality sleep tonight.",
            "Drink warm water or herbal tea to stay hydrated.",
            "Practice slow, deep breathing for 5 minutes to reduce stress.",
        ],
        "disclaimer": "This is educational guidance only and does not constitute a medical diagnosis. Please consult a qualified clinician.",
    }


def fallback_followup(language_code: str) -> dict:
    if language_code == "hi":
        return {
            "stage": "follow_up",
            "answer": "मुझे खेद है, मैं अभी इस प्रश्न को संसाधित नहीं कर सका। कृपया पुनः प्रयास करें।",
        }
    return {
        "stage": "follow_up",
        "answer": "I'm sorry, I couldn't process that question right now. Please try asking again.",
    }
