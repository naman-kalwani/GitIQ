import os
import logging
from fastapi import FastAPI, HTTPException, Query
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
import httpx
from dotenv import load_dotenv
from collections import Counter
from typing import Any

from datetime import datetime, timezone

from models.responseModels import AnalyzeResponse, HomeResponse, TopRepo, PinnedRepo, CommitEntry
from models.requestModels import LLMInsightRequest, GithubLoginRequest
from insights import generate_insights, InsightResponse
from db import supabase

load_dotenv()

app = FastAPI()
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
logger = logging.getLogger("gitiq")
origins = [
    "http://127.0.0.1:5173",
    # Add more origins here
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GRAPHQL_QUERY = """
query($username: String!, $reposCursor: String) {
  user(login: $username) {

    pinnedItems(first: 6, types: REPOSITORY) {
      nodes {
        ... on Repository {
          name
          description
          stargazerCount
          primaryLanguage {
            name
          }
          repositoryTopics(first: 10) {
            nodes {
              topic {
                name
              }
            }
          }
          languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
            nodes {
              name
            }
          }
          defaultBranchRef {
            target {
              ... on Commit {
                history(first: 10) {
                  totalCount
                  nodes {
                    oid
                    message
                    committedDate
                    author {
                      name
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    repositories(first: 100, after: $reposCursor, orderBy: {field: UPDATED_AT, direction: DESC}) {
      nodes {
        name
        isFork
        stargazerCount

        primaryLanguage {
          name
        }

        languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
          nodes {
            name
          }
        }

        repositoryTopics(first: 10) {
          nodes {
            topic {
              name
            }
          }
        }
      }

      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
}
"""


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

@app.get("/", response_model=HomeResponse)
def home() -> HomeResponse:
    return HomeResponse(message="GitIQ Backend Running 🚀")


@app.post("/auth/github-login")
async def save_github_login(payload: GithubLoginRequest):
    try:
        user_id, github_username = sync_user_profile(payload)
        return {"ok": True, "user_id": user_id, "github_username": github_username}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/repo-analyses/{username}")
async def get_repo_analyses(
    username: str,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=5, ge=1, le=25),
    exclude_names: str | None = Query(default=None),
):
    user_id = get_user_id_by_username(username)
    if not user_id:
        raise HTTPException(status_code=404, detail="User not found in Supabase users table.")

    analysis_id = get_latest_analysis_id_for_user(user_id)
    if not analysis_id:
        return {"items": [], "total": 0, "next_offset": None}

    try:
        result = (
            supabase.table("repo_analyses")
            .select("repo_name, readme_grade, commit_pattern, is_tutorial, llm_insights_json, raw_data_json, created_at")
            .eq("analysis_id", analysis_id)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

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


@app.get("/info/{username}")
async def get_user_info(username: str):
    try:
        headers = {
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github+json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.github.com/users/{username}",
                headers=headers
            )
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail=response.json())

        return response.json()
    except HTTPException:
        raise
    except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


async def fetch_user_events(
    client: httpx.AsyncClient,
    username: str,
    headers: dict[str, str]
) -> list[dict]:
    response = await client.get(
        f"https://api.github.com/users/{username}/events",
        headers=headers,
        params={"per_page": 100}
    )

    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=response.json())

    events_data = response.json()
    if not isinstance(events_data, list):
        raise HTTPException(
            status_code=500,
            detail="Unexpected GitHub events response format."
        )

    return events_data

@app.get("/analyze/{username}", response_model=AnalyzeResponse)
async def analyze_user(username: str) -> AnalyzeResponse:
    try:
        headers = {
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github+json"
        }

        all_repos: list[dict] = []
        cursor = None

        async with httpx.AsyncClient() as client:
            events_data = await fetch_user_events(client, username, headers)

            while True:
                variables = {"username": username, "reposCursor": cursor}
                response = await client.post(
                    "https://api.github.com/graphql",
                    headers={**headers, "Content-Type": "application/json"},
                    json={"query": GRAPHQL_QUERY, "variables": variables}
                )

                if response.status_code != 200:
                    raise HTTPException(status_code=response.status_code, detail=response.json())

                gql_data = response.json()
                if 'errors' in gql_data:
                    raise HTTPException(status_code=400, detail=gql_data['errors'])

                user_data = gql_data['data']['user']
                all_repos.extend(user_data['repositories']['nodes'])

                page_info = user_data['repositories']['pageInfo']
                if not page_info['hasNextPage']:
                    break
                cursor = page_info['endCursor']

        pinned_items = user_data['pinnedItems']['nodes']

        total_repos = len(all_repos)
        language_counter = Counter()
        total_stars = 0
        topic_counter = Counter()
        forked_repos = 0
        for repo in all_repos:
            total_stars += repo.get('stargazerCount', 0)
            if repo['isFork']:
                forked_repos += 1
                continue
            languages = [l['name'] for l in repo.get('languages', {}).get('nodes', [])]
            stars = repo.get('stargazerCount', 0)
            weight = stars + 1
            for lang in languages:
                language_counter[lang] += weight
            topics = [t['topic']['name'] for t in repo.get('repositoryTopics', {}).get('nodes', [])]
            topic_counter.update(topics)

        top_languages = language_counter.most_common(10)
        top_topics = topic_counter.most_common(10)
        
        total_events = len(events_data)
        if total_events >= 25:
            activity_level = "high"
        elif total_events >= 10:
            activity_level = "medium"
        else:
            activity_level = "low"
        
        event_counter = Counter(
            event.get("type") for event in events_data if event.get("type")
        )
        top_events = event_counter.most_common(5)

        unique_repos = {
            event.get("repo", {}).get("name")
            for event in events_data
            if isinstance(event.get("repo"), dict) and event.get("repo", {}).get("name")
        }
        active_event_repos = len(unique_repos)

        org_events = sum(1 for e in events_data if "org" in e)
        has_org_experience = org_events > 0

        latest_event_at = max(
            (event.get("created_at") for event in events_data if event.get("created_at")),
            default=None
        )

        times = sorted([
            datetime.fromisoformat(e["created_at"].replace("Z", ""))
            for e in events_data
            if e.get("created_at")
        ])

        time_diffs = [
            (times[i] - times[i-1]).total_seconds()
            for i in range(1, len(times))
        ]

        avg_event_gap_seconds = (
            sum(time_diffs) / len(time_diffs)
            if time_diffs
            else None
        )

        top_repo = (
            max(all_repos, key=lambda x: x.get('stargazerCount', 0))
            if all_repos
            else {"name": "None", "stargazerCount": 0}
        )
        
        fork_signal = "unknown"
        if forked_repos > 5:
            fork_signal = "explores open-source projects"
        elif forked_repos > 3:
            fork_signal = "actively contributes to existing projects"
        else:
            fork_signal = "limited open-source interaction"
            
        # Compute recency
        now = datetime.now(timezone.utc)
        if latest_event_at:
            latest_dt = datetime.fromisoformat(latest_event_at.replace("Z", "+00:00"))
            days_since = (now - latest_dt).days
            if days_since <= 7:
                recency = "very recent"
            elif days_since <= 30:
                recency = "recent"
            else:
                recency = "old"
        else:
            recency = "unknown"
        
        # Compute intensity
        if avg_event_gap_seconds and avg_event_gap_seconds < 86400:
            intensity = "high"
        elif avg_event_gap_seconds and avg_event_gap_seconds < 604800:
            intensity = "medium"
        else:
            intensity = "low"
            
        repo_focus = (
            "highly focused" if active_event_repos <= 3
            else "focused" if active_event_repos <= 7
            else "diverse"
        )    
        
        pinned_repos: list[PinnedRepo] = []
        pinned_repos_dict: dict[str, dict] = {}
        for repo in pinned_items:
            history = (
                repo.get('defaultBranchRef', {})
                .get('target', {})
                .get('history', {})
            )
            total_commits = history.get('totalCount', 0)
            recent_commits = [
                CommitEntry(
                    message=commit.get('message', 'N/A').split('\n')[0],
                    date=commit.get('committedDate'),
                    author=commit.get('author', {}).get('name', 'Unknown')
                )
                for commit in history.get('nodes', [])
            ]

            pinned_repo = PinnedRepo(
                name=repo['name'],
                description=repo['description'],
                topics=[t['topic']['name'] for t in repo.get('repositoryTopics', {}).get('nodes', [])],
                languages=[l['name'] for l in repo.get('languages', {}).get('nodes', [])],
                total_commits=total_commits,
                recent_commits=recent_commits
            )
            pinned_repos.append(pinned_repo)
            pinned_repos_dict[pinned_repo.name] = {
                "description": pinned_repo.description,
                "topics": pinned_repo.topics,
                "languages": pinned_repo.languages,
                "total_commits": pinned_repo.total_commits,
                "recent_commits": [c.model_dump() for c in pinned_repo.recent_commits]
            }

        total_pinned_commits = sum(repo.total_commits for repo in pinned_repos)
        
        llm_input = LLMInsightRequest(
            username=username,
            experience={
                "total_repos": total_repos,
                "active_repos": active_event_repos,
                "stars": total_stars
            },
            skills={
                "languages": [
                    {"name": lang, "count": count}
                    for lang, count in top_languages
                ],
                "topics": [
                    {"name": topic, "count": count}
                    for topic, count in top_topics
                ]
            },
            activity={
                "level": activity_level,
                "recent_days": recency,
                "events_per_week": intensity
            },
            work_style={
                "repo_focus": repo_focus,
            },
            collaboration={
                "org_experience": has_org_experience,
                "event_types": [
                    {"name": event, "count": count}
                    for event, count in top_events
                ]
            },
            open_source={
                "fork_signal": fork_signal
            },
            highlights={
                "pinned_repos": pinned_repos_dict
            },
            overall_pinned_commits=total_pinned_commits,
            pinned_repos_commit_history=pinned_repos_dict
        )

        insights = await generate_insights(llm_input)
        
        response_payload = AnalyzeResponse(
            username=username,
            total_repos=total_repos,
            total_stars=total_stars,
            total_pinned_commits=total_pinned_commits,
            top_languages=top_languages,
            top_repo=TopRepo(
                name=top_repo["name"],
                stars=top_repo.get('stargazerCount', 0)
            ),
            top_topics=top_topics,
            top_events=top_events,
            total_events=total_events,
            activity_level=activity_level,
            active_event_repos=active_event_repos,
            has_org_experience=has_org_experience,
            latest_event_at=latest_event_at,
            avg_event_gap_seconds=avg_event_gap_seconds,
            fork_signal=fork_signal,
            insights=insights,
            pinned_repos=pinned_repos
        )

        owner_user_id = get_user_id_by_username(username)
        if owner_user_id:
            persist_analysis_record(
                response_payload=response_payload,
                user_id=owner_user_id,
                all_repos=all_repos,
                pinned_repo_details=pinned_repos_dict,
            )
        else:
            logger.info(
                "Skipping persistence for username '%s' because no matching users.id was found.",
                username,
            )
        return response_payload

    except HTTPException:
        raise 
    except Exception as e:
        raise  HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
