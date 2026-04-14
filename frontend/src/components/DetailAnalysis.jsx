function DetailAnalysis({
  repos,
  onAnalyzeRepo,
  repoAnalysesByName = {},
  repoAnalysesLoading = false,
}) {
  if (!repos || repos.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="grid gap-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
          Detail analysis
        </p>
        <h3 className="text-2xl font-semibold text-white">
          Pinned repo insights
        </h3>
        <p className="text-sm text-slate-400">
          Deep profile highlights from pinned repositories first.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {repos.map((repo) =>
          (() => {
            const repoAnalysis = repoAnalysesByName[repo.name] || null;
            const llm = repoAnalysis?.llm_insights_json || {};
            const hasLlMData =
              llm && typeof llm === "object" && Object.keys(llm).length > 0;

            return (
              <article
                key={repo.name}
                className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-white">{repo.name}</strong>
                  <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                    {repo.total_commits ?? 0} commits
                  </span>
                </div>

                <p className="text-sm text-slate-400">
                  {repo.description || "No description available."}
                </p>

                <div className="grid gap-1 text-xs text-slate-400">
                  <span>Topics: {repo.topics?.join(", ") || "None"}</span>
                  <span>Languages: {repo.languages?.join(", ") || "None"}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {!hasLlMData ? (
                    <button
                      type="button"
                      onClick={() =>
                        onAnalyzeRepo({
                          repoName: repo.name,
                          action: "analyze",
                        })
                      }
                      disabled={repoAnalysesLoading}
                      className="inline-flex items-center rounded-lg border border-cyan-400/50 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Analyze
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          onAnalyzeRepo({ repoName: repo.name, action: "view" })
                        }
                        className="inline-flex items-center rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:border-emerald-300 hover:bg-emerald-500/20"
                      >
                        Get insights
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onAnalyzeRepo({
                            repoName: repo.name,
                            action: "reanalyze",
                          })
                        }
                        className="inline-flex items-center rounded-lg border border-cyan-400/50 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:border-cyan-300 hover:bg-cyan-500/20"
                      >
                        Re-Analyze
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })(),
        )}
      </div>
    </section>
  );
}

export default DetailAnalysis;
