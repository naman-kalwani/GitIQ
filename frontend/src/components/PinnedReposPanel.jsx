function PinnedReposPanel({ repos }) {
  if (!repos || repos.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="grid gap-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
          Portfolio
        </p>
        <h3 className="text-2xl font-semibold text-white">
          Pinned repositories
        </h3>
        <p className="text-sm text-slate-400">
          Projects with the strongest visibility and current focus signals.
        </p>
      </div>

      <ul className="grid gap-3 md:grid-cols-2">
        {repos.map((repo, index) => (
          <li
            key={index}
            className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <strong className="text-white">{repo.name}</strong>
              <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300">
                {repo.total_commits ?? 0} commits
              </span>
            </div>
            <p className="text-sm text-slate-400">
              {repo.description || "No description"}
            </p>
            <div className="grid gap-1 text-xs text-slate-400">
              <span>Topics: {repo.topics.join(", ") || "None"}</span>
              <span>Languages: {repo.languages.join(", ") || "None"}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default PinnedReposPanel;
