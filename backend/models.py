"""
models.py – All Pydantic request/response models for the ASHA API.
"""

from typing import Literal, Optional
from pydantic import BaseModel, Field


# ─── Chat models ─────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=4000)


class QueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    history: list[ChatMessage] = Field(default_factory=list)
    question_count: int = Field(default=0, ge=0, le=10)
    force_final: bool = False           # User clicked "Skip to Results"
    follow_up_mode: bool = False        # Post-diagnosis follow-up chat
    diagnosis_context: Optional[str] = None  # Assessment summary for follow-up context


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


class FollowUpResponse(BaseModel):
    stage: Literal["follow_up"]
    answer: str


# ─── Auth models ─────────────────────────────────────────────────────────────

class AuthRequest(BaseModel):
    email: str = Field(min_length=3, max_length=200)
    password: str = Field(min_length=6, max_length=200)


# ─── Session models ───────────────────────────────────────────────────────────

class SessionPayload(BaseModel):
    session_id: str
    title: str = "New consultation"
    stage: str = "idle"
    symptom: str = ""
    question_count: int = 0
    current_question_number: int = 0
    answered_qa: list = []
    diagnosis: Optional[dict] = None
    follow_up_messages: list = []
    created_at: int = 0
