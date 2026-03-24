"""
routers/chat.py – /api/chat endpoint.
"""

import json

from fastapi import APIRouter, HTTPException

from ai_service import (
    app_state, MAX_QUESTIONS,
    detect_language, format_history, extract_json,
    build_questioning_prompt, build_final_prompt, build_followup_prompt,
    fallback_questioning, fallback_final, fallback_followup,
)
from models import QueryRequest

router = APIRouter()


@router.post("/api/chat")
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

    # ── Follow-up chat mode (post-diagnosis) ──────────────────────────────────
    if request.follow_up_mode:
        diagnosis_context = request.diagnosis_context or "No assessment context provided."
        prompt = build_followup_prompt(query, history_text, diagnosis_context, language_code)
        try:
            result = gemini_model.generate_content(prompt)
            response_text = (getattr(result, "text", None) or "").strip()
            data = extract_json(response_text)
            if "stage" not in data:
                data["stage"] = "follow_up"
            return data
        except json.JSONDecodeError:
            return fallback_followup(language_code)
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"Gemini request failed: {exc}") from exc

    # ── Normal consultation flow ───────────────────────────────────────────────
    question_number = request.question_count + 1
    is_final = request.force_final or request.question_count >= MAX_QUESTIONS

    prompt = build_final_prompt(query, history_text, language_code) if is_final \
        else build_questioning_prompt(query, history_text, language_code, question_number)

    try:
        result = gemini_model.generate_content(prompt)
        response_text = (getattr(result, "text", None) or "").strip()
        data = extract_json(response_text)
    except json.JSONDecodeError:
        data = fallback_final(language_code) if is_final else fallback_questioning(question_number, language_code)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Gemini request failed: {exc}") from exc

    if "stage" not in data:
        data["stage"] = "final" if is_final else "questioning"

    return data
