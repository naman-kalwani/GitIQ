from collections import Counter
from datetime import datetime, timezone

import httpx

from app.services.github_service import fetch_user_events, fetch_user_repos_and_pinned
from app.services.insights_service import generate_insights
from models.requestModels import LLMInsightRequest
from models.responseModels import AnalyzeResponse, CommitEntry, PinnedRepo, TopRepo


async def build_analysis(username: str) -> tuple[AnalyzeResponse, list[dict], dict[str, dict]]:
    async with httpx.AsyncClient() as client:
        events_data = await fetch_user_events(client, username)
        all_repos, pinned_items = await fetch_user_repos_and_pinned(client, username)

    total_repos = len(all_repos)
    language_counter = Counter()
    total_stars = 0
    topic_counter = Counter()
    forked_repos = 0

    for repo in all_repos:
        total_stars += repo.get("stargazerCount", 0)
        if repo["isFork"]:
            forked_repos += 1
            continue

        languages = [l["name"] for l in repo.get("languages", {}).get("nodes", [])]
        stars = repo.get("stargazerCount", 0)
        weight = stars + 1
        for lang in languages:
            language_counter[lang] += weight

        topics = [
            topic_node["topic"]["name"]
            for topic_node in repo.get("repositoryTopics", {}).get("nodes", [])
        ]
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

    event_counter = Counter(event.get("type") for event in events_data if event.get("type"))
    top_events = event_counter.most_common(5)

    unique_repos = {
        event.get("repo", {}).get("name")
        for event in events_data
        if isinstance(event.get("repo"), dict) and event.get("repo", {}).get("name")
    }
    active_event_repos = len(unique_repos)

    has_org_experience = any("org" in event for event in events_data)

    latest_event_at = max(
        (event.get("created_at") for event in events_data if event.get("created_at")),
        default=None,
    )

    times = sorted(
        [
            datetime.fromisoformat(event["created_at"].replace("Z", ""))
            for event in events_data
            if event.get("created_at")
        ]
    )
    time_diffs = [(times[i] - times[i - 1]).total_seconds() for i in range(1, len(times))]

    avg_event_gap_seconds = sum(time_diffs) / len(time_diffs) if time_diffs else None

    top_repo = (
        max(all_repos, key=lambda repo: repo.get("stargazerCount", 0))
        if all_repos
        else {"name": "None", "stargazerCount": 0, "description": None}
    )

    if forked_repos > 5:
        fork_signal = "explores open-source projects"
    elif forked_repos > 3:
        fork_signal = "actively contributes to existing projects"
    else:
        fork_signal = "limited open-source interaction"

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

    if avg_event_gap_seconds and avg_event_gap_seconds < 86400:
        intensity = "high"
    elif avg_event_gap_seconds and avg_event_gap_seconds < 604800:
        intensity = "medium"
    else:
        intensity = "low"

    repo_focus = (
        "highly focused"
        if active_event_repos <= 3
        else "focused"
        if active_event_repos <= 7
        else "diverse"
    )

    pinned_repos: list[PinnedRepo] = []
    pinned_repos_dict: dict[str, dict] = {}

    for repo in pinned_items:
        history = (
            repo.get("defaultBranchRef", {}).get("target", {}).get("history", {})
        )
        total_commits = history.get("totalCount", 0)

        recent_commits = [
            CommitEntry(
                message=commit.get("message", "N/A").split("\n")[0],
                date=commit.get("committedDate"),
                author=commit.get("author", {}).get("name", "Unknown"),
            )
            for commit in history.get("nodes", [])
        ]

        pinned_repo = PinnedRepo(
            name=repo["name"],
            description=repo["description"],
            topics=[
                topic_node["topic"]["name"]
                for topic_node in repo.get("repositoryTopics", {}).get("nodes", [])
            ],
            languages=[
                language_node["name"]
                for language_node in repo.get("languages", {}).get("nodes", [])
            ],
            total_commits=total_commits,
            recent_commits=recent_commits,
        )
        pinned_repos.append(pinned_repo)
        pinned_repos_dict[pinned_repo.name] = {
            "description": pinned_repo.description,
            "topics": pinned_repo.topics,
            "languages": pinned_repo.languages,
            "total_commits": pinned_repo.total_commits,
            "recent_commits": [commit.model_dump() for commit in pinned_repo.recent_commits],
        }

    total_pinned_commits = sum(repo.total_commits for repo in pinned_repos)

    llm_input = LLMInsightRequest(
        username=username,
        experience={
            "total_repos": total_repos,
            "active_repos": active_event_repos,
            "stars": total_stars,
        },
        skills={
            "languages": [{"name": lang, "count": count} for lang, count in top_languages],
            "topics": [{"name": topic, "count": count} for topic, count in top_topics],
        },
        activity={
            "level": activity_level,
            "recent_days": recency,
            "events_per_week": intensity,
        },
        work_style={"repo_focus": repo_focus},
        collaboration={
            "org_experience": has_org_experience,
            "event_types": [{"name": event, "count": count} for event, count in top_events],
        },
        open_source={"fork_signal": fork_signal},
        highlights={"pinned_repos": pinned_repos_dict},
        overall_pinned_commits=total_pinned_commits,
        pinned_repos_commit_history=pinned_repos_dict,
    )

    insights = await generate_insights(llm_input)

    response_payload = AnalyzeResponse(
        username=username,
        total_repos=total_repos,
        total_stars=total_stars,
        total_pinned_commits=total_pinned_commits,
        top_languages=top_languages,
        top_repo=TopRepo(name=top_repo["name"], stars=top_repo.get("stargazerCount", 0), description=top_repo.get("description", None)),
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
        pinned_repos=pinned_repos,
    )

    return response_payload, all_repos, pinned_repos_dict
