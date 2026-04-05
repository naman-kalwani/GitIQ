import os
from fastapi import FastAPI, HTTPException
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
import httpx
from dotenv import load_dotenv
from pydantic import BaseModel
from collections import Counter

from datetime import datetime

load_dotenv()

app = FastAPI()
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
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

class TopRepo(BaseModel):
    name: str
    stars: int


class AnalyzeResponse(BaseModel):
    username: str
    total_repos: int
    total_stars: int
    top_languages: list[tuple[str, int]]
    top_repo: TopRepo
    top_topics: list[tuple[str, int]]
    top_events: list[tuple[str, int]]
    total_events: int
    activity_level: str
    active_event_repos: int
    has_org_experience: bool
    latest_event_at: str | None
    avg_event_gap_seconds: float | None
    fork_signal: str

class HomeResponse(BaseModel):
    message: str


@app.get("/", response_model=HomeResponse)
def home() -> HomeResponse:
    return HomeResponse(message="GitIQ Backend Running 🚀")


@app.get("/info/{username}")
async def get_user_info(username: str):
    try:
        headers = {
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github+json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.github.com/users/{username}/events",
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

        data: list[dict] = []
        page = 1

        async with httpx.AsyncClient() as client:
            events_data = await fetch_user_events(client, username, headers)

            while True:
                response = await client.get(
                    f"https://api.github.com/users/{username}/repos",
                    headers=headers,
                    params={"per_page": 100, "page": page, "sort": "updated"}
                )

                if response.status_code != 200:
                    raise HTTPException(
                        status_code=response.status_code,
                        detail=response.json()
                    )

                page_data = response.json()
                if not isinstance(page_data, list):
                    raise HTTPException(
                        status_code=500,
                        detail="Unexpected GitHub response format."
                    )

                data.extend(page_data)

                if len(page_data) < 100:
                    break

                page += 1

        total_repos = len(data)
        language_counter = Counter()
        total_stars = 0
        topic_counter = Counter()
        forked_repos = 0
        for repo in data:
            total_stars += repo.get("stargazers_count", 0)
            if repo.get("fork"):
                forked_repos += 1
                continue
            language = repo.get("language")
            if not language:
                continue
            stars = repo.get("stargazers_count", 0)
            weight = stars + 1
            language_counter[language] += weight
            topics = repo.get("topics", [])
            topic_counter.update(topics)

        top_languages = language_counter.most_common(5)
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
            max(data, key=lambda x: x.get("stargazers_count", 0))
            if data
            else {"name": "None", "stargazers_count": 0}
        )
        
        fork_signal = "unknown"
        if forked_repos > 5:
            fork_signal = "explores open-source projects"
        elif forked_repos > 3:
            fork_signal = "actively contributes to existing projects"
        else:
            fork_signal = "limited open-source interaction"
        
        # Return the analysis results
        return AnalyzeResponse(
            username=username,
            total_repos=total_repos,
            total_stars=total_stars,
            top_languages=top_languages,
            top_repo=TopRepo(
                name=top_repo.get("name", "None"),
                stars=top_repo.get("stargazers_count", 0)
            ),
            top_topics=top_topics,
            top_events=top_events,
            total_events=total_events,
            activity_level=activity_level,
            active_event_repos=active_event_repos,
            has_org_experience=has_org_experience,
            latest_event_at=latest_event_at,
            avg_event_gap_seconds=avg_event_gap_seconds,
            fork_signal=fork_signal
        )

    except HTTPException:
        raise 
    except Exception as e:
        raise  HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)



# {
#   "developer_type": "AI/Backend Enthusiast",
#   "experience_level": "Beginner to Intermediate",
#   "strengths": [
#     "Strong interest in LLM and AI systems",
#     "Working with FastAPI and backend frameworks",
#     "Exploring RAG and vector databases"
#   ],
#   "weaknesses": [
#     "No community validation (0 stars)",
#     "Limited project scale",
#     "Low repository count"
#   ],
#   "recommendation": "Good learning-stage candidate, needs more production-level projects",
#   "confidence": "medium"
# }
