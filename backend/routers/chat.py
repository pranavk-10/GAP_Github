"""
routers/chat.py – /api/chat endpoint.
"""

import json
import logging

from fastapi import APIRouter, HTTPException

from ai_service import (
    app_state, MAX_QUESTIONS,
    detect_language, format_history, extract_json,
    build_questioning_prompt, build_final_prompt, build_followup_prompt,
    fallback_questioning, fallback_final, fallback_followup,
)
from models import QueryRequest

logger = logging.getLogger(__name__)
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
    # RAG intentionally NOT used here — follow-up is conversational, not retrieval-heavy
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

    if is_final:
        # ── RAG: English-only, final assessment only ───────────────────────────
        rag_context = ""
        if language_code == "en":
            try:
                from rag.rag_service import rag_service  # lazy import — safe if not ingested yet

                # ── Build RAG query from patient messages only ─────────────────
                # WHY: ChromaDB was indexed on short patient symptom descriptions (~200 chars).
                # Sending the full doctor+patient conversation drifts the query vector away
                # from the index space → valid matches exceed the threshold & get filtered.
                #
                # Fix: extract ONLY the patient's answers across all 5 questions and join
                # them as a clean symptom narrative. This closely matches what the dataset's
                # "input" column looks like, maximising cosine similarity accuracy.
                patient_msgs = [
                    msg.content.strip()
                    for msg in request.history
                    if msg.role == "user" and msg.content.strip()
                ]
                patient_msgs.append(query)  # include the final trigger message

                # Deduplicate while preserving order (initial complaint stays first)
                seen_set: set[str] = set()
                unique_msgs: list[str] = []
                for m in patient_msgs:
                    if m not in seen_set:
                        seen_set.add(m)
                        unique_msgs.append(m)

                # Join into one coherent symptom narrative (~200–500 chars)
                symptom_summary = ". ".join(unique_msgs)
                logger.info("RAG query (patient-only summary): %.120s…", symptom_summary)

                retrieved_docs = rag_service.retrieve(symptom_summary)

                if retrieved_docs:
                    # Format as numbered references — Gemini treats them as grounding context only
                    rag_context = "\n\n".join(
                        f"[Reference {i + 1}]:\n{doc.strip()}"
                        for i, doc in enumerate(retrieved_docs)
                    )
                    logger.info(
                        "RAG: injecting %d reference(s) into final prompt",
                        len(retrieved_docs),
                    )
                else:
                    # No good match above threshold — plain Gemini handles it
                    logger.info("RAG: no context above threshold — using plain Gemini")

            except Exception as exc:
                # RAG errors must NEVER break the consultation
                logger.error("RAG retrieval failed silently: %s", exc)
                rag_context = ""

        prompt = build_final_prompt(query, history_text, language_code, rag_context)

    else:
        # Questioning stage (Q1–Q5) — no RAG, plain Gemini
        prompt = build_questioning_prompt(query, history_text, language_code, question_number)

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
