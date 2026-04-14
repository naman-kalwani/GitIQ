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
            <section className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-sm">
              <div className="grid gap-1 sm:grid-cols-2">
                <div>
                  <span className="text-slate-500">Row ID</span>
                  <p className="text-slate-200">{toDisplayValue(item.id)}</p>
                </div>
                <div>
                  <span className="text-slate-500">Analysis ID</span>
                  <p className="text-slate-200">
                    {toDisplayValue(item.analysis_id)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Repo name</span>
                  <p className="text-slate-200">
                    {toDisplayValue(item.repo_name)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Created at</span>
                  <p className="text-slate-200">
                    {formatDate(item.created_at)}
                  </p>
                </div>
              </div>
            </section>

            <section className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <h4 className="text-sm font-semibold text-white">
                raw_data_json
              </h4>
              <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
                {toDisplayValue(rawData)}
              </pre>
            </section>

            <section className="grid gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <h4 className="text-sm font-semibold text-white">
                llm_insights_json
              </h4>
              {hasLlMData ? (
                <pre className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
                  {toDisplayValue(llmData)}
                </pre>
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
