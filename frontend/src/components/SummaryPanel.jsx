function SummaryPanel({ details }) {
  const languageEntries = details.top_languages || [];

  return (
    <section className="content-section summary-section">
      <div className="section-head">
        <p className="section-kicker">Overview</p>
        <h3>{details.username}</h3>
        <p>Profile analysis completed</p>
      </div>

      <div className="stats-strip">
        <article className="stat-item">
          <span>Total Repos</span>
          <strong>{details.total_repos}</strong>
        </article>
        <article className="stat-item">
          <span>Total Stars</span>
          <strong>{details.total_stars}</strong>
        </article>
        <article className="stat-item">
          <span>Activity Level</span>
          <strong>{details.activity_level || "Unknown"}</strong>
        </article>
        <article className="stat-item">
          <span>Org Experience</span>
          <strong>{details.has_org_experience ? "Yes" : "No"}</strong>
        </article>
      </div>

      <div className="meta-grid">
        <div className="meta-row meta-row-chart">
          <div className="meta-head">
            <h4>Top languages</h4>
            <span>Language share across the profile</span>
          </div>
          <div className="mini-bar-list">
            {languageEntries.length ? (
              languageEntries.slice(0, 4).map(([lang, count], index) => {
                const maxCount = Math.max(
                  ...languageEntries.map(([, value]) => Number(value) || 0),
                  1,
                );
                const width = Math.max(
                  18,
                  ((Number(count) || 0) / maxCount) * 100,
                );

                return (
                  <div className="mini-bar-row" key={`${lang}-${index}`}>
                    <div className="mini-bar-meta">
                      <span>{lang}</span>
                      <strong>{count}</strong>
                    </div>
                    <div className="bar-track slim">
                      <div
                        className="bar-fill language-fill"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-chart">No language data available.</div>
            )}
          </div>
        </div>

        <div className="meta-row meta-row-card">
          <div className="meta-head">
            <h4>Top repository</h4>
            <span>Most visible public project</span>
          </div>
          <div className="repo-pulse-mini">
            <strong>{details.top_repo?.name || "None"}</strong>
            <p>
              {details.top_repo?.description || "No description available."}
            </p>
            <div className="mini-stats inline-stats">
              <span>{details.top_repo?.stars ?? 0} stars</span>
              <span>{details.top_repo?.total_commits ?? 0} commits</span>
            </div>
          </div>
        </div>
      </div>

      <div className="facts-grid">
        <article className="fact-card">
          <span>Event types</span>
          <strong>
            {details.top_events?.map(([type]) => type).join(", ") || "None"}
          </strong>
        </article>
        <article className="fact-card">
          <span>Recent events</span>
          <strong>{details.total_events ?? 0}</strong>
        </article>
        <article className="fact-card">
          <span>Repos touched</span>
          <strong>{details.active_event_repos ?? 0}</strong>
        </article>
        <article className="fact-card">
          <span>Fork signal</span>
          <strong>{details.fork_signal || "Unknown"}</strong>
        </article>
      </div>
    </section>
  );
}

export default SummaryPanel;
