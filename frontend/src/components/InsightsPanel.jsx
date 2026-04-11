function InsightsPanel({ insights }) {
  const confidenceLevel = String(insights.confidence || "").toLowerCase();
  const confidenceWidth =
    confidenceLevel === "high"
      ? "86%"
      : confidenceLevel === "medium"
        ? "60%"
        : "38%";

  return (
    <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
            AI review
          </p>
          <h3 className="text-2xl font-semibold text-white">
            Developer insights
          </h3>
        </div>
        <span className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-200">
          Confidence: {insights.confidence}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <span className="text-xs uppercase tracking-wider text-slate-500">
            Type
          </span>
          <strong className="mt-1 block text-white">
            {insights.developer_type}
          </strong>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <span className="text-xs uppercase tracking-wider text-slate-500">
            Experience
          </span>
          <strong className="mt-1 block text-white">
            {insights.experience_signal}
          </strong>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-3">
          <span className="text-xs uppercase tracking-wider text-slate-500">
            Confidence
          </span>
          <strong className="mt-1 block text-white">
            {insights.confidence}
          </strong>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-cyan-400"
              style={{ width: confidenceWidth }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 md:col-span-2">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Summary
          </h4>
          <p className="mt-2 text-sm text-slate-400">{insights.summary}</p>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Strengths
          </h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {insights.strengths.map((item, index) => (
              <span
                key={index}
                className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200"
              >
                {item}
              </span>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Weak spots
          </h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {insights.weaknesses.map((item, index) => (
              <span
                key={index}
                className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-200"
              >
                {item}
              </span>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 md:col-span-2">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Highlights
          </h4>
          <p className="mt-2 text-sm text-slate-400">
            {insights.highlights_of_profile}
          </p>
        </article>

        <article className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4 md:col-span-2">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-cyan-200">
            Recommendation
          </h4>
          <p className="mt-2 text-sm text-slate-300">
            {insights.recommendation}
          </p>
        </article>
      </div>
    </section>
  );
}

export default InsightsPanel;
