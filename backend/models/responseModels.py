from pydantic import BaseModel, Field
from typing import List

class TopRepo(BaseModel):
  name: str
  stars: int

class CommitEntry(BaseModel):
  message: str
  date: str | None
  author: str

class PinnedRepo(BaseModel):
  name: str
  description: str | None
  topics: List[str]
  languages: List[str]
  total_commits: int = 0
  recent_commits: List[CommitEntry] = Field(default_factory=list)

class HomeResponse(BaseModel):
  message: str

class InsightResponse(BaseModel):
  developer_type: str
  experience_signal: str
  summary: str
  strengths: List[str]
  weaknesses: List[str]
  highlights_of_profile: str
  recommendation: str
  confidence: str

class AnalyzeResponse(BaseModel):
  username: str
  total_repos: int
  total_stars: int
  total_pinned_commits: int
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
  insights: InsightResponse
  pinned_repos: List[PinnedRepo]
