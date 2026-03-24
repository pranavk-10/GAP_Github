"""
routers/sessions.py – /sessions GET and POST endpoints.
"""

from typing import Optional

from fastapi import APIRouter, HTTPException, Request

from auth import decode_token
from database import get_sessions_col
from models import SessionPayload

router = APIRouter()


def _get_user_id(request: Request) -> Optional[str]:
    """Read JWT from Authorization header. Returns None if missing/invalid."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    return decode_token(auth[7:])


@router.get("/sessions")
async def get_sessions(request: Request):
    user_id = _get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    sessions = get_sessions_col()
    cursor = sessions.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).limit(50)
    docs = await cursor.to_list(length=50)
    return {"sessions": docs}


@router.post("/sessions")
async def save_session(request: Request, body: SessionPayload):
    user_id = _get_user_id(request)
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")

    sessions = get_sessions_col()
    doc = body.model_dump()
    doc["user_id"] = user_id

    await sessions.update_one(
        {"session_id": body.session_id, "user_id": user_id},
        {"$set": doc},
        upsert=True,
    )
    return {"ok": True}
