import { useEffect } from "react";

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleString();
}

function toDisplayValue(value) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function formatCommitDate(value) {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return String(value);
  }

  return parsed.toLocaleString();
}

function formatList(values) {
  if (!Array.isArray(values) || !values.length) {
    return "-";
  }

  return values.join(", ");
}

function getInsightValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "object") {
    return value;
  }

  return String(value);
}

function RepoAnalysisDetail({
  open,
  onClose,
  loading,
  error,
  item,
  repoLabel,
}) {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onEsc = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const rawData = item?.raw_data_json || null;
  const llmData = item?.llm_insights_json || null;
  const hasLlMData =
    llmData && typeof llmData === "object" && Object.keys(llmData).length > 0;
  const recentCommits = Array.isArray(rawData?.recent_commits)
    ? rawData.recent_commits
    : [];
  const rawSummary = rawData
    ? {
        name: rawData.name,
        description: rawData.description,
        is_pinned: rawData.is_pinned,
        is_fork: rawData.is_fork,
        stars: rawData.stars,
        primary_language: rawData.primary_language,
        languages: rawData.languages,
        topics: rawData.topics,
        github_repo_id: rawData.github_repo_id,
        repo_id: rawData.repo_id,
        total_commits: rawData.total_commits,
        readme_summary: rawData.readme_summary,
      }
    : null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Repository analysis details"
      onClick={onClose}
    >
      <div
        className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
              Repo analysis row
            </p>
            <h3 className="text-xl font-semibold text-white">
              {repoLabel || "Repository"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-400"
          >
            Close
          </button>
        </div>

        {loading ? (
          <div className="rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-5 text-sm text-slate-300">
            Loading repository analysis...
          </div>
        ) : null}

        {!loading && error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        {!loading && !error && item ? (
          <div className="grid gap-4">
            <section className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                    Repository
                  </p>
                  <h4 className="text-lg font-semibold text-white">
                    {toDisplayValue(item.repo_name)}
                  </h4>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <div>Analyzed at</div>
                  <div className="text-slate-200">
                    {formatDate(item.created_at)}
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h4 className="text-sm font-semibold text-white">
                Raw repository data
              </h4>
              {rawSummary ? (
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <span className="text-xs uppercase tracking-wider text-slate-500">
                      Description
                    </span>
                    <p className="mt-1 text-slate-200">
                      {rawSummary.description || "No description available."}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <span className="text-xs uppercase tracking-wider text-slate-500">
                      Primary language
                    </span>
                    <p className="mt-1 text-slate-200">
                      {rawSummary.primary_language || "Unknown"}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <span className="text-xs uppercase tracking-wider text-slate-500">
                      Stars
                    </span>
                    <p className="mt-1 text-slate-200">
                      {toDisplayValue(rawSummary.stars)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <span className="text-xs uppercase tracking-wider text-slate-500">
                      Commits
                    </span>
                    <p className="mt-1 text-slate-200">
                      {toDisplayValue(rawSummary.total_commits)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 sm:col-span-2">
                    <span className="text-xs uppercase tracking-wider text-slate-500">
                      Languages
                    </span>
                    <p className="mt-1 text-slate-200">
                      {formatList(rawSummary.languages)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 sm:col-span-2">
                    <span className="text-xs uppercase tracking-wider text-slate-500">
                      Topics
                    </span>
                    <p className="mt-1 text-slate-200">
                      {formatList(rawSummary.topics)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <span className="text-xs uppercase tracking-wider text-slate-500">
                      Pinned
                    </span>
                    <p className="mt-1 text-slate-200">
                      {toDisplayValue(rawSummary.is_pinned)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                    <span className="text-xs uppercase tracking-wider text-slate-500">
                      Fork
                    </span>
                    <p className="mt-1 text-slate-200">
                      {toDisplayValue(rawSummary.is_fork)}
                    </p>
                  </div>
                </div>
              ) : null}
            </section>

            <section className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <h4 className="text-sm font-semibold text-white">LLM insights</h4>
              {hasLlMData ? (
                <div className="grid gap-3 text-sm sm:grid-cols-2">
                  {[
                    ["Readme grade", getInsightValue(llmData.readme_grade)],
                    [
                      "Readme feedback",
                      getInsightValue(llmData.readme_feedback),
                    ],
                    ["Commit pattern", getInsightValue(llmData.commit_pattern)],
                    [
                      "Commit feedback",
                      getInsightValue(llmData.commit_feedback),
                    ],
                    ["Tutorial project", getInsightValue(llmData.is_tutorial)],
                    [
                      "Project reasoning",
                      getInsightValue(llmData.project_type_reasoning),
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-lg border border-slate-800 bg-slate-950 p-3"
                    >
                      <span className="text-xs uppercase tracking-wider text-slate-500">
                        {label}
                      </span>
                      <p className="mt-1 text-slate-200">
                        {Array.isArray(value)
                          ? formatList(value)
                          : value || "-"}
                      </p>
                    </div>
                  ))}

                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 sm:col-span-2">
                    <span className="text-xs uppercase tracking-wider text-slate-500">
                      Strengths
                    </span>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-200">
                      {(llmData.strengths || []).length ? (
                        llmData.strengths.map((item, index) => (
                          <li key={`${item}-${index}`}>{item}</li>
                        ))
                      ) : (
                        <li>No strengths available.</li>
                      )}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 sm:col-span-2">
                    <span className="text-xs uppercase tracking-wider text-slate-500">
                      Weaknesses
                    </span>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-200">
                      {(llmData.weaknesses || []).length ? (
                        llmData.weaknesses.map((item, index) => (
                          <li key={`${item}-${index}`}>{item}</li>
                        ))
                      ) : (
                        <li>No weaknesses available.</li>
                      )}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 sm:col-span-2">
                    <span className="text-xs uppercase tracking-wider text-slate-500">
                      Recommendations
                    </span>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-200">
                      {(llmData.recommendations || []).length ? (
                        llmData.recommendations.map((item, index) => (
                          <li key={`${item}-${index}`}>{item}</li>
                        ))
                      ) : (
                        <li>No recommendations available.</li>
                      )}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400">
                  LLM insights are pending and will appear after analysis is
                  generated.
                </div>
              )}
            </section>

            {recentCommits.length ? (
              <section className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <h4 className="text-sm font-semibold text-white">
                  Recent commits
                </h4>
                <div className="grid gap-2">
                  {recentCommits.map((commit, index) => (
                    <div
                      key={commit.oid || `${commit.message}-${index}`}
                      className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300"
                    >
                      <div className="font-medium text-slate-100">
                        {commit.message || "No commit message"}
                      </div>
                      <div className="mt-1 grid gap-1 text-slate-400 sm:grid-cols-2">
                        <span>Author: {commit.author || "Unknown"}</span>
                        <span>Date: {formatCommitDate(commit.date)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default RepoAnalysisDetail;
