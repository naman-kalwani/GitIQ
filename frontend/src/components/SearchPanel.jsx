import UsernameForm from "./UsernameForm.jsx";

function SearchPanel({ onAnalyze, submitLabel = "Analyze" }) {
  return (
    <section className="search-surface">
      <div className="section-head">
        <p className="section-kicker">Scan</p>
        <h2>Profile scanner console</h2>
      </div>
      <p className="section-copy">
        Enter a GitHub username to execute a retro telemetry pass with activity
        traces, language frequencies, and an AI command brief.
      </p>
      <UsernameForm getUser={onAnalyze} submitLabel={submitLabel} />
    </section>
  );
}

export default SearchPanel;
