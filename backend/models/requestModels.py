from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class StrictBaseModel(BaseModel):
	model_config = ConfigDict(extra="forbid")


class LLMMetricCount(StrictBaseModel):
	name: str = Field(min_length=1)
	count: int = Field(ge=0)


class LLMCommitEntry(StrictBaseModel):
	message: str = Field(min_length=1)
	date: str | None = None
	author: str = Field(min_length=1)


class LLMPinnedRepoHighlight(StrictBaseModel):
	description: str | None = None
	topics: list[str] = Field(default_factory=list)
	languages: list[str] = Field(default_factory=list)
	total_commits: int = Field(ge=0)
	recent_commits: list[LLMCommitEntry] = Field(default_factory=list)


class LLMExperience(StrictBaseModel):
	total_repos: int = Field(ge=0)
	active_repos: int = Field(ge=0)
	stars: int = Field(ge=0)


class LLMSkills(StrictBaseModel):
	languages: list[LLMMetricCount] = Field(default_factory=list)
	topics: list[LLMMetricCount] = Field(default_factory=list)


class LLMActivity(StrictBaseModel):
	level: Literal["low", "medium", "high"]
	recent_days: Literal["very recent", "recent", "old", "unknown"]
	events_per_week: Literal["low", "medium", "high"]


class LLMWorkStyle(StrictBaseModel):
	repo_focus: Literal["highly focused", "focused", "diverse"]


class LLMCollaboration(StrictBaseModel):
	org_experience: bool
	event_types: list[LLMMetricCount] = Field(default_factory=list)


class LLMOpenSource(StrictBaseModel):
	fork_signal: Literal[
		"unknown",
		"explores open-source projects",
		"actively contributes to existing projects",
		"limited open-source interaction",
	]


class LLMHighlights(StrictBaseModel):
	pinned_repos: dict[str, LLMPinnedRepoHighlight] = Field(default_factory=dict)


class LLMInsightRequest(StrictBaseModel):
	username: str = Field(min_length=1)
	experience: LLMExperience
	skills: LLMSkills
	activity: LLMActivity
	work_style: LLMWorkStyle
	collaboration: LLMCollaboration
	open_source: LLMOpenSource
	highlights: LLMHighlights
	overall_pinned_commits: int = Field(ge=0)
	pinned_repos_commit_history: dict[str, LLMPinnedRepoHighlight] = Field(default_factory=dict)
