import os
from fastapi import FastAPI, HTTPException
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
import httpx
from dotenv import load_dotenv
from pydantic import BaseModel
from collections import Counter

from datetime import datetime, timezone
from typing import List
import json

from models.responseModels import AnalyzeResponse, HomeResponse, TopRepo, PinnedRepo
from insights import generate_insights, InsightResponse

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
            total_stars += repo.get('stargazers', {}).get('totalCount', 0)
            if repo['isFork']:
                forked_repos += 1
                continue
            languages = [l['name'] for l in repo.get('languages', {}).get('nodes', [])]
            stars = repo.get('stargazers', {}).get('totalCount', 0)
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
            max(all_repos, key=lambda x: x.get('stargazers', {}).get('totalCount', 0))
            if all_repos
            else {"name": "None", "stargazers": {"totalCount": 0}}
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
        
        pinned_repos = [
            PinnedRepo(
                name=repo['name'],
                description=repo['description'],
                topics=[t['topic']['name'] for t in repo.get('repositoryTopics', {}).get('nodes', [])],
                languages=[l['name'] for l in repo.get('languages', {}).get('nodes', [])],
                total_commits=(
                    repo.get('defaultBranchRef', {})
                    .get('target', {})
                    .get('history', {})
                    .get('totalCount', 0)
                )
            ) for repo in pinned_items
        ]
        total_pinned_commits = sum(repo.total_commits for repo in pinned_repos)
        
        # Extract commit history for pinned repos
        pinned_repos_with_commits = []
        for repo in pinned_items:
            commit_data = {
                "name": repo['name'],
                "total_commits": 0,
                "recent_commits": []
            }
            
            # Extract commit history from defaultBranchRef
            if repo.get('defaultBranchRef') and repo['defaultBranchRef'].get('target'):
                history = repo['defaultBranchRef']['target'].get('history', {})
                commit_data['total_commits'] = history.get('totalCount', 0)
                
                # Extract top 10 commits
                commits = history.get('nodes', [])
                for commit in commits:
                    commit_data['recent_commits'].append({
                        "message": commit.get('message', 'N/A').split('\n')[0],  # First line of commit message
                        "date": commit.get('committedDate'),
                        "author": commit.get('author', {}).get('name', 'Unknown')
                    })
            
            pinned_repos_with_commits.append(commit_data)
        
        data = {
            "username": username,
             "experience": {
                "total_repos": total_repos,
                "active_repos": active_event_repos,
                "stars": total_stars
            },
            "skills": {
                "languages": [
                {"name": lang, "count": count}
                for lang, count in top_languages
                ],
                "topics": [
                    {"name": topic, "count": count}
                    for topic, count in top_topics
                ]
            },
            "activity": {
                "level": activity_level,
                "recent_days": recency,
                "events_per_week": intensity
            },
            "work_style": {
                "repo_focus": repo_focus,
            },
            "collaboration": {
                "org_experience": has_org_experience,
                "event_types": [
                    {"name": event, "count": count}
                    for event, count in top_events
                ]
            },
            "open_source": {
                "fork_signal": fork_signal
            },
            "highlights": {
                "pinned_repos": [
                    {
                        "name": repo.name,
                        "description": repo.description,
                        "topics": repo.topics,  
                        "languages": repo.languages
                    }
                    for repo in pinned_repos
                ]
            },
            "overall_pinned_commits": total_pinned_commits,
            "pinned_repos_commit_history": pinned_repos_with_commits
        }
        
        insights = await generate_insights(username, data)
        
        # Return the analysis results
        return AnalyzeResponse(
            username=username,
            total_repos=total_repos,
            total_stars=total_stars,
            total_pinned_commits=total_pinned_commits,
            top_languages=top_languages,
            top_repo=TopRepo(
                name=top_repo["name"],
                stars=top_repo.get('stargazers', {}).get('totalCount', 0)
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

    except HTTPException:
        raise 
    except Exception as e:
        raise  HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
