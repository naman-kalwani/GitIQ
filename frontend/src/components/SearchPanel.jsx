import UsernameForm from "./UsernameForm.jsx";

function SearchPanel({ onAnalyze, submitLabel = "Analyze" }) {
  return (
    <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="grid gap-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
          Scan
        </p>
        <h2 className="text-xl font-semibold text-white">
          Profile scanner console
        </h2>
      </div>
      <p className="text-sm text-slate-400">
        Enter a GitHub username to execute a retro telemetry pass with activity
        traces, language frequencies, and an AI command brief.
      </p>
      <UsernameForm getUser={onAnalyze} submitLabel={submitLabel} />
    </section>
  );
}

export default SearchPanel;
