from fastapi import APIRouter, HTTPException

from app.services.supabase_service import sync_user_profile
from models.requestModels import GithubLoginRequest


router = APIRouter(tags=["auth"])


@router.post("/auth/github-login")
async def save_github_login(payload: GithubLoginRequest):
    try:
        user_id, github_username = sync_user_profile(payload)
        return {"ok": True, "user_id": user_id, "github_username": github_username}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
