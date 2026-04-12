import logging
from datetime import datetime, timezone
from typing import Any

from db import supabase
from models.requestModels import GithubLoginRequest
from models.responseModels import AnalyzeResponse


logger = logging.getLogger("gitiq")


def _safe_supabase_execute(action_name: str, operation: Any) -> None:
    try:
        operation.execute()
    except Exception as exc:
        logger.warning("Supabase %s failed: %s", action_name, exc)


def _extract_auth_user(access_token: str) -> tuple[str | None, dict[str, Any]]:
    auth_response = supabase.auth.get_user(access_token)
    auth_user = getattr(auth_response, "user", None)
    if auth_user is None and isinstance(auth_response, dict):
        auth_user = auth_response.get("user")

    if auth_user is None:
        return None, {}

    if hasattr(auth_user, "id"):
        user_id = auth_user.id
    elif isinstance(auth_user, dict):
        user_id = auth_user.get("id")
    else:
        user_id = None

    if hasattr(auth_user, "user_metadata"):
        metadata = auth_user.user_metadata or {}
    elif isinstance(auth_user, dict):
        metadata = auth_user.get("user_metadata") or {}
    else:
        metadata = {}

    return user_id, metadata


def sync_user_profile(payload: GithubLoginRequest) -> tuple[str, str | None]:
    user_id, metadata = _extract_auth_user(payload.access_token)
    if not user_id:
        raise ValueError("Could not resolve auth user from Supabase access token.")

    github_username = (
        payload.github_username
        or metadata.get("user_name")
        or metadata.get("preferred_username")
    )
    github_avatar_url = payload.github_avatar_url or metadata.get("avatar_url")

    user_row = {
        "id": user_id,
        "github_username": github_username,
        "github_avatar_url": github_avatar_url,
    }

    _safe_supabase_execute(
        "users upsert",
        supabase.table("users").upsert(user_row, on_conflict="id"),
    )

    return user_id, github_username


def get_user_id_by_username(username: str) -> str | None:
    try:
        result = (
            supabase.table("users")
            .select("id")
            .eq("github_username", username)
            .limit(1)
            .execute()
        )
        rows = getattr(result, "data", None) or []
        if rows:
            return rows[0].get("id")
    except Exception as exc:
        logger.warning("Supabase users lookup failed: %s", exc)
    return None


def _build_repo_analysis_rows(
    all_repos: list[dict],
    pinned_repo_details: dict[str, dict],
    analysis_id: str,
    now_iso: str,
) -> list[dict]:
    rows_by_name: dict[str, dict] = {}

    for repo in all_repos:
        repo_name = repo.get("name")
        if not repo_name:
            continue

        topics = [
            topic_node.get("topic", {}).get("name")
            for topic_node in repo.get("repositoryTopics", {}).get("nodes", [])
            if topic_node.get("topic", {}).get("name")
        ]
        languages = [
            lang_node.get("name")
            for lang_node in repo.get("languages", {}).get("nodes", [])
            if lang_node.get("name")
        ]
        is_pinned = repo_name in pinned_repo_details

        rows_by_name[repo_name] = {
            "analysis_id": analysis_id,
            "repo_name": repo_name,
            "readme_grade": None,
            "commit_pattern": None,
            "is_tutorial": any("tutorial" in topic.lower() for topic in topics),
            "llm_insights_json": (
                {
                    "is_pinned": True,
                    "pinned_summary": pinned_repo_details[repo_name],
                }
                if is_pinned
                else {"is_pinned": False}
            ),
            "raw_data_json": {
                "name": repo_name,
                "is_pinned": is_pinned,
                "is_fork": repo.get("isFork"),
                "stars": repo.get("stargazerCount", 0),
                "primary_language": repo.get("primaryLanguage", {}).get("name"),
                "languages": languages,
                "topics": topics,
            },
            "created_at": now_iso,
        }

    for repo_name, pinned_data in pinned_repo_details.items():
        if repo_name in rows_by_name:
            row = rows_by_name[repo_name]
            row["raw_data_json"]["description"] = pinned_data.get("description")
            row["raw_data_json"]["total_commits"] = pinned_data.get("total_commits", 0)
            row["raw_data_json"]["recent_commits"] = pinned_data.get("recent_commits", [])
            continue

        topics = pinned_data.get("topics", [])
        rows_by_name[repo_name] = {
            "analysis_id": analysis_id,
            "repo_name": repo_name,
            "readme_grade": None,
            "commit_pattern": None,
            "is_tutorial": any("tutorial" in str(topic).lower() for topic in topics),
            "llm_insights_json": {
                "is_pinned": True,
                "pinned_summary": pinned_data,
            },
            "raw_data_json": {
                "name": repo_name,
                "is_pinned": True,
                "description": pinned_data.get("description"),
                "topics": topics,
                "languages": pinned_data.get("languages", []),
                "total_commits": pinned_data.get("total_commits", 0),
                "recent_commits": pinned_data.get("recent_commits", []),
            },
            "created_at": now_iso,
        }

    return list(rows_by_name.values())


def persist_analysis_record(
    response_payload: AnalyzeResponse,
    user_id: str,
    all_repos: list[dict],
    pinned_repo_details: dict[str, dict],
) -> None:
    now_iso = datetime.now(timezone.utc).isoformat()
    payload = response_payload.model_dump()

    analysis_row = {
        "user_id": user_id,
        "insights_json": payload,
        "created_at": now_iso,
    }

    analysis_result = supabase.table("analyses").insert(analysis_row).execute()
    analysis_rows = getattr(analysis_result, "data", None) or []
    analysis_id = analysis_rows[0].get("id") if analysis_rows else None

    if not analysis_id:
        logger.warning("Supabase analyses insert returned no id; skipping repo_analyses.")
        return

    repo_rows = _build_repo_analysis_rows(
        all_repos=all_repos,
        pinned_repo_details=pinned_repo_details,
        analysis_id=analysis_id,
        now_iso=now_iso,
    )

    if repo_rows:
        _safe_supabase_execute(
            "repo_analyses insert",
            supabase.table("repo_analyses").insert(repo_rows),
        )


def get_latest_analysis_id_for_user(user_id: str) -> str | None:
    try:
        result = (
            supabase.table("analyses")
            .select("id")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        rows = getattr(result, "data", None) or []
        if rows:
            return rows[0].get("id")
    except Exception as exc:
        logger.warning("Supabase analyses lookup failed: %s", exc)
    return None


def get_repo_analyses_page(username: str, offset: int, limit: int, exclude_names: str | None) -> dict:
    user_id = get_user_id_by_username(username)
    if not user_id:
        return {"error": "USER_NOT_FOUND"}

    analysis_id = get_latest_analysis_id_for_user(user_id)
    if not analysis_id:
        return {"items": [], "total": 0, "next_offset": None}

    result = (
        supabase.table("repo_analyses")
        .select("repo_name, readme_grade, commit_pattern, is_tutorial, llm_insights_json, raw_data_json, created_at")
        .eq("analysis_id", analysis_id)
        .execute()
    )

    rows = getattr(result, "data", None) or []
    excluded = {
        item.strip()
        for item in (exclude_names or "").split(",")
        if item and item.strip()
    }

    filtered_rows = [
        row for row in rows if row.get("repo_name") and row.get("repo_name") not in excluded
    ]
    filtered_rows.sort(key=lambda row: row.get("repo_name", "").lower())

    total = len(filtered_rows)
    page_items = filtered_rows[offset : offset + limit]
    next_offset = offset + limit if offset + limit < total else None

    return {
        "items": page_items,
        "total": total,
        "next_offset": next_offset,
    }
