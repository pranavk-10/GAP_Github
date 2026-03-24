"""
routers/auth.py – /auth/register and /auth/login endpoints.
"""

from fastapi import APIRouter, HTTPException

from auth import create_token, hash_password, verify_password
from database import get_users_col
from models import AuthRequest

router = APIRouter(prefix="/auth")


@router.post("/register")
async def register(body: AuthRequest):
    users = get_users_col()
    existing = await users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = {
        "email": body.email.lower(),
        "password": hash_password(body.password),
    }
    result = await users.insert_one(new_user)
    user_id = str(result.inserted_id)
    token = create_token(user_id)
    return {"token": token, "user": {"id": user_id, "email": body.email.lower()}}


@router.post("/login")
async def login(body: AuthRequest):
    users = get_users_col()
    user = await users.find_one({"email": body.email.lower()})
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = str(user["_id"])
    token = create_token(user_id)
    return {"token": token, "user": {"id": user_id, "email": user["email"]}}
