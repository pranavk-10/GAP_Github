"""
database.py – MongoDB connection using Motor (async).
Two collections: users and sessions.
"""

import os
import motor.motor_asyncio
from fastapi import HTTPException

DB_NAME = "cssdb"

_client = None


def get_db():
    global _client
    if _client is None:
        uri = os.getenv("MONGO_CONNECTION_URI", "").strip()
        if not uri:
            raise HTTPException(
                status_code=503,
                detail="MONGO_CONNECTION_URI is not set. Add it to backend/.env and restart.",
            )
        try:
            _client = motor.motor_asyncio.AsyncIOMotorClient(
                uri,
                serverSelectionTimeoutMS=5000,   # fail fast instead of hanging
            )
        except Exception as exc:
            raise HTTPException(status_code=503, detail=f"MongoDB connection failed: {exc}") from exc
    return _client[DB_NAME]


def get_users_col():
    return get_db()["users"]


def get_sessions_col():
    return get_db()["sessions"]
