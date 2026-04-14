import { useMemo, useState } from "react";
import api from "../api";
import DetailAnalysis from "./DetailAnalysis.jsx";
import InsightsPanel from "./InsightsPanel.jsx";
import RepoAnalysisDetail from "./RepoAnalysisDetail.jsx";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatGap(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "No cadence data";
  }

  if (seconds < 60) {
    return `${Math.round(seconds)} sec`;
  }

  if (seconds < 3600) {
    return `${Math.round(seconds / 60)} min`;
  }

  if (seconds < 86400) {
    return `${(seconds / 3600).toFixed(1)} hrs`;
  }

  return `${(seconds / 86400).toFixed(1)} days`;
}

function formatLatestActivity(value) {
  if (!value) {
    return "Not available";
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return String(value);
  }

  return timestamp.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function OverviewView({ details }) {
  const languageEntries = details.top_languages || [];
  const topTopics = details.top_topics || [];
  const languageTotal =
    languageEntries.reduce((sum, [, value]) => sum + toNumber(value), 0) || 1;

  return (
    <section className="grid gap-4 lg:grid-cols-[1.65fr_1fr]">
      <div className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:col-span-2">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              Signal
            </p>
            <h3 className="text-lg font-semibold text-white">
              Activity snapshot
            </h3>
          </div>
          <div className="grid gap-3">
            <p className="text-sm text-slate-400">
              Core profile telemetry from repositories, stars, events, and
              contribution footprint.
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                <span className="text-xs uppercase tracking-wider text-slate-500">
                  Repos
                </span>
                <strong className="mt-1 block text-lg text-white">
                  {details.total_repos ?? 0}
                </strong>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                <span className="text-xs uppercase tracking-wider text-slate-500">
                  Stars
                </span>
                <strong className="mt-1 block text-lg text-white">
                  {details.total_stars ?? 0}
                </strong>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                <span className="text-xs uppercase tracking-wider text-slate-500">
                  Events
                </span>
                <strong className="mt-1 block text-lg text-white">
                  {details.total_events ?? 0}
                </strong>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                <span className="text-xs uppercase tracking-wider text-slate-500">
                  Active Repos
                </span>
                <strong className="mt-1 block text-lg text-white">
                  {details.active_event_repos ?? 0}
                </strong>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              Mix
            </p>
            <h3 className="text-lg font-semibold text-white">Top languages</h3>
          </div>
          <div className="grid gap-3">
            {languageEntries.length ? (
              languageEntries.slice(0, 5).map(([language, value], index) => {
                const width = Math.max(
                  12,
                  (toNumber(value) / languageTotal) * 100,
                );

                return (
                  <div key={`${language}-${index}`} className="grid gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">{language}</span>
                      <strong className="text-white">
                        {Math.round(width)}%
                      </strong>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-cyan-400"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">
                No language data available.
              </p>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              Signals
            </p>
            <h3 className="text-lg font-semibold text-white">Top topics</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {topTopics.length ? (
              topTopics.map(([topic]) => (
                <span
                  key={topic}
                  className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-md text-slate-300"
                >
                  {topic}
                </span>
              ))
            ) : (
              <p className="text-sm text-slate-500">No topic data available.</p>
            )}
          </div>
        </article>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 sm:col-span-2">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              Advanced analytics
            </p>
            <h3 className="text-lg font-semibold text-white">
              Detailed signals
            </h3>
          </div>

          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <span className="text-xs uppercase tracking-wider text-slate-500">
                Total events
              </span>
              <strong className="mt-1 block text-lg text-white">
                {details.total_events ?? 0}
              </strong>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <span className="text-xs uppercase tracking-wider text-slate-500">
                Last active
              </span>
              <strong className="mt-1 block text-lg text-white">
                {formatLatestActivity(details.latest_event_at)}
              </strong>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <span className="text-xs uppercase tracking-wider text-slate-500">
                Avg gap
              </span>
              <strong className="mt-1 block text-lg text-white">
                {formatGap(details.avg_event_gap_seconds)}
              </strong>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <span className="text-xs uppercase tracking-wider text-slate-500">
                Fork ratio
              </span>
              <strong className="mt-1 block text-lg text-white">
                {details.fork_signal || "Unknown"}
              </strong>
            </div>
          </div>

          <div className="grid gap-2">
            {(details.top_events || []).map(([eventName, count]) => (
              <div
                key={eventName}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm"
              >
                <span className="text-slate-300">{eventName}</span>
                <strong className="text-white">{count}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="grid gap-4">
        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              Activity
            </p>
            <h3 className="text-lg font-semibold text-white">Summary</h3>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm">
              <span className="text-slate-400">Active repos</span>
              <strong className="text-white">
                {details.active_event_repos ?? 0}
              </strong>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm">
              <span className="text-slate-400">Activity level</span>
              <strong className="text-white">
                {details.activity_level || "Unknown"}
              </strong>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm">
              <span className="text-slate-400">Fork signal</span>
              <strong className="text-white">
                {details.fork_signal || "Unknown"}
              </strong>
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              Focus
            </p>
            <h3 className="text-lg font-semibold text-white">Top repository</h3>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between  text-lg">
              <strong className="text-white">
                {details.top_repo?.name || "No top repo"}
              </strong>
              <div className="w-fit rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs text-amber-200">
                ⭐ {details.top_repo?.stars ?? 0}
              </div>
            </div>
            <p className="text-sm text-slate-400">
              {details.top_repo?.description || "No description available."}
            </p>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              Repositories
            </p>
            <h3 className="text-lg font-semibold text-white">
              Pinned Repositories
            </h3>
          </div>
          <div className="grid gap-2">
            {(details.pinned_repos || []).map((repo) => (
              <div
                key={repo.repo_name}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm"
              >
                <strong className="text-slate-300"> {repo.name}</strong>
                <span className="text-white">{repo.stars ?? 0} ⭐</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center justify-between">
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                Collaboration
              </p>
              <h3 className="text-lg font-semibold text-white">
                Org experience
              </h3>
            </div>
            <div className="grid gap-2">
              <span
                className={`w-fit rounded-md px-3 py-1 text-lg font-medium ${
                  details.has_org_experience
                    ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border border-amber-400/40 bg-amber-400/10 text-amber-300"
                }`}
              >
                {details.has_org_experience ? "Yes" : "No"}
              </span>
            </div>
          </div>
          <p className="text-sm text-slate-400">
            {details.has_org_experience
              ? "Evidence of organizational work and team-oriented activity."
              : "No clear org signals detected in the available profile data."}
          </p>
        </article>
      </aside>
    </section>
  );
}

function InsightsView({ details }) {
  return (
    <section>
      <InsightsPanel insights={details.insights} />
    </section>
  );
}

function ExtraRepoCards({ repos, onAnalyzeRepo }) {
  if (!repos.length) {
    return null;
  }

  return (
    <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="grid gap-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
          Repo cards
        </p>
        <h3 className="text-2xl font-semibold text-white">More repositories</h3>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        {repos.map((repo) => {
          const raw = repo.raw_data_json || {};
          const llm = repo.llm_insights_json || {};
          const languages = raw.languages || [];
          const topics = raw.topics || [];

          return (
            <article
              key={`${repo.repo_name}-${repo.created_at}`}
              className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-4"
            >
              <strong className="text-white">{repo.repo_name}</strong>
              <p className="text-xs text-slate-400">
                {raw.description || "No description available."}
              </p>
              <div className="text-xs text-slate-400">
                <div>⭐ {raw.stars ?? 0}</div>
                <div>Primary: {raw.primary_language || "Unknown"}</div>
                <div>Languages: {languages.join(", ") || "None"}</div>
                <div>Topics: {topics.join(", ") || "None"}</div>
              </div>
              <div className="text-xs text-cyan-200">
                {llm.pinned_summary?.summary || "Insight pending"}
              </div>
              <div>
                <button
                  type="button"
                  onClick={() =>
                    onAnalyzeRepo({
                      repoName: repo.repo_name,
                      repoId:
                        raw.github_repo_id || raw.repo_id || raw.id || repo.id,
                    })
                  }
                  className="inline-flex items-center rounded-lg border border-cyan-400/50 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-500/20"
                >
                  Analyze
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ProjectsView({ details }) {
  const [extraRepos, setExtraRepos] = useState([]);
  const [nextOffset, setNextOffset] = useState(0);
  const [totalRepos, setTotalRepos] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [repoModalOpen, setRepoModalOpen] = useState(false);
  const [repoModalLoading, setRepoModalLoading] = useState(false);
  const [repoModalError, setRepoModalError] = useState("");
  const [selectedRepoRow, setSelectedRepoRow] = useState(null);
  const [selectedRepoLabel, setSelectedRepoLabel] = useState("");

  const pinnedNamesCsv = useMemo(
    () => (details.pinned_repos || []).map((repo) => repo.name).join(","),
    [details.pinned_repos],
  );

  const loadMoreRepos = async () => {
    if (loadingMore) {
      return;
    }

    setLoadingMore(true);
    setLoadError("");

    try {
      const response = await api.get(`/repo-analyses/${details.username}`, {
        params: {
          offset: nextOffset,
          limit: 5,
          exclude_names: pinnedNamesCsv,
        },
      });

      const items = response.data?.items || [];
      setExtraRepos((prev) => [...prev, ...items]);
      setTotalRepos(response.data?.total || 0);

      if (
        response.data?.next_offset === null ||
        response.data?.next_offset === undefined
      ) {
        setNextOffset(-1);
      } else {
        setNextOffset(response.data.next_offset);
      }
    } catch (err) {
      setLoadError(
        err?.response?.data?.detail || "Failed to fetch more repositories.",
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const handleAnalyzeRepo = async ({ repoName, repoId }) => {
    setRepoModalOpen(true);
    setRepoModalLoading(true);
    setRepoModalError("");
    setSelectedRepoRow(null);
    setSelectedRepoLabel(repoName || "Repository");

    try {
      const response = await api.get(`/repo-analysis/${details.username}`, {
        params: {
          repo_name: repoName || undefined,
          repo_id: repoId || undefined,
        },
      });

      setSelectedRepoRow(response.data?.item || null);
    } catch (err) {
      setRepoModalError(
        err?.response?.data?.detail ||
          "Failed to fetch repository analysis row.",
      );
    } finally {
      setRepoModalLoading(false);
    }
  };

  const hasMore = nextOffset !== -1;

  return (
    <section className="grid gap-4">
      <DetailAnalysis
        repos={details.pinned_repos}
        onAnalyzeRepo={({ repoName }) => handleAnalyzeRepo({ repoName })}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={loadMoreRepos}
          disabled={loadingMore || !hasMore}
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/60 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loadingMore
            ? "Loading..."
            : hasMore
              ? "Fetch next 5 repos"
              : "All repos loaded"}
        </button>
        <span className="text-xs text-slate-400">
          Loaded {extraRepos.length} of {totalRepos || 0}
        </span>
      </div>

      {loadError ? (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {loadError}
        </div>
      ) : null}

      <ExtraRepoCards repos={extraRepos} onAnalyzeRepo={handleAnalyzeRepo} />

      <RepoAnalysisDetail
        open={repoModalOpen}
        onClose={() => setRepoModalOpen(false)}
        loading={repoModalLoading}
        error={repoModalError}
        item={selectedRepoRow}
        repoLabel={selectedRepoLabel}
      />
    </section>
  );
}

function Analyze({ details, activeView = "overview" }) {
  if (activeView === "insights") {
    return <InsightsView details={details} />;
  }

  if (activeView === "projects") {
    return <ProjectsView details={details} />;
  }

  return <OverviewView details={details} />;
}

export default Analyze;
