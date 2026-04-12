from fastapi import APIRouter, HTTPException, Query
from httpx import HTTPStatusError

from app.services.supabase_service import (
    get_repo_analyses_page,
    get_user_id_by_username,
    persist_analysis_record,
)
from app.services.analysis_service import build_analysis
from app.services.github_service import fetch_public_user_info
from models.responseModels import AnalyzeResponse


router = APIRouter(tags=["analysis"])


@router.get("/info/{username}")
async def get_user_info(username: str):
    try:
        return await fetch_public_user_info(username)
    except HTTPStatusError as exc:
        detail = None
        try:
            detail = exc.response.json()
        except Exception:
            detail = exc.response.text
        raise HTTPException(status_code=exc.response.status_code, detail=detail)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/repo-analyses/{username}")
async def get_repo_analyses(
    username: str,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=5, ge=1, le=25),
    exclude_names: str | None = Query(default=None),
):
    try:
        payload = get_repo_analyses_page(
            username=username,
            offset=offset,
            limit=limit,
            exclude_names=exclude_names,
        )
        if payload.get("error") == "USER_NOT_FOUND":
            raise HTTPException(status_code=404, detail="User not found in Supabase users table.")
        return payload
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/analyze/{username}", response_model=AnalyzeResponse)
async def analyze_user(username: str) -> AnalyzeResponse:
    try:
        response_payload, all_repos, pinned_repos_dict = await build_analysis(username)

        owner_user_id = get_user_id_by_username(username)
        if owner_user_id:
            persist_analysis_record(
                response_payload=response_payload,
                user_id=owner_user_id,
                all_repos=all_repos,
                pinned_repo_details=pinned_repos_dict,
            )

        return response_payload
    except HTTPException:
        raise
    except HTTPStatusError as exc:
        detail = None
        try:
            detail = exc.response.json()
        except Exception:
            detail = exc.response.text
        raise HTTPException(status_code=exc.response.status_code, detail=detail)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
