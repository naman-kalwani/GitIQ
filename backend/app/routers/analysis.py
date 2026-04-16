from fastapi import APIRouter, HTTPException, Query
from httpx import HTTPStatusError, TimeoutException

from app.services.supabase_service import (
    get_latest_analysis_payload_by_username,
    get_repo_analysis_item,
    get_repo_analyses_page,
    get_user_id_by_username,
    persist_analysis_record,
    update_repo_analysis_insights,
)
from app.services.analysis_service import build_analysis
from app.services.github_service import fetch_public_user_info
from app.services.repo_insights_service import (
    extract_readme_summary,
    fetch_readme_text,
    generate_repo_insights,
)
from models.responseModels import AnalyzeResponse


router = APIRouter(tags=["analysis"])


@router.get("/analyze/{username}/cached", response_model=AnalyzeResponse)
async def get_cached_analysis(username: str) -> AnalyzeResponse:
    try:
        payload = get_latest_analysis_payload_by_username(username)
        if not payload:
            raise HTTPException(status_code=404, detail="No cached analysis found for this user.")

        return AnalyzeResponse.model_validate(payload)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


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
    except TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="GitHub request timed out while analyzing this profile. Please try again.",
        )
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
        return payload
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/repo-analyses/{username}/item")
async def get_repo_analysis(
    username: str,
    repo_name: str | None = Query(default=None),
    repo_id: str | None = Query(default=None),
):
    if not repo_name and not repo_id:
        raise HTTPException(status_code=400, detail="Either repo_name or repo_id is required.")

    try:
        payload = get_repo_analysis_item(
            username=username,
            repo_name=repo_name,
            repo_id=repo_id,
        )

        if payload.get("error") == "USER_NOT_FOUND":
            raise HTTPException(status_code=404, detail="User not found in Supabase users table.")
        if payload.get("error") == "ANALYSIS_NOT_FOUND":
            raise HTTPException(status_code=404, detail="No analysis found for this user.")
        if payload.get("error") == "REPO_ANALYSIS_NOT_FOUND":
            raise HTTPException(status_code=404, detail="No repo analysis row found for the selected repository.")

        return payload
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/repo-analyses/{username}/insights")
async def generate_repo_analysis_insights(
    username: str,
    repo_name: str | None = Query(default=None),
    repo_id: str | None = Query(default=None),
    force: bool = Query(default=False),
):
    if not repo_name and not repo_id:
        raise HTTPException(status_code=400, detail="Either repo_name or repo_id is required.")

    try:
        payload = get_repo_analysis_item(
            username=username,
            repo_name=repo_name,
            repo_id=repo_id,
        )

        if payload.get("error") == "USER_NOT_FOUND":
            raise HTTPException(status_code=404, detail="User not found in Supabase users table.")
        if payload.get("error") == "ANALYSIS_NOT_FOUND":
            raise HTTPException(status_code=404, detail="No analysis found for this user.")
        if payload.get("error") == "REPO_ANALYSIS_NOT_FOUND":
            raise HTTPException(status_code=404, detail="No repo analysis row found for the selected repository.")

        item = payload.get("item") or {}
        existing_llm = item.get("llm_insights_json") or {}
        if existing_llm and not force:
            return {"item": item, "generated": False}

        selected_repo_name = item.get("repo_name") or repo_name
        raw_data = item.get("raw_data_json") or {}

        readme_text = await fetch_readme_text(username, selected_repo_name)
        readme_summary = extract_readme_summary(readme_text)
        raw_data["readme_summary"] = readme_summary

        llm_result = await generate_repo_insights(
            username=username,
            repo_name=selected_repo_name,
            raw_data_json=raw_data,
            readme_summary=readme_summary,
        )

        updated = update_repo_analysis_insights(
            row_id=str(item.get("id") or ""),
            llm_insights_json=llm_result,
            raw_data_json=raw_data,
        )

        if not updated:
            raise HTTPException(status_code=500, detail="Failed to persist repo insights.")

        return {"item": updated, "generated": True}
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
