function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizePair(entry) {
  if (!Array.isArray(entry)) {
    return { label: "Unknown", value: 0 };
  }

  const [label, value] = entry;
  return { label: String(label ?? "Unknown"), value: toNumber(value) };
}

function buildActivityScore(details) {
  const repoScore = toNumber(details.total_repos) * 4;
  const starScore = toNumber(details.total_stars) * 2;
  const eventScore = toNumber(details.total_events) * 1.8;
  const repoTouchScore = toNumber(details.active_event_repos) * 3;

  const activityBonus =
    {
      low: 8,
      medium: 18,
      high: 28,
      very_high: 34,
      extreme: 38,
    }[String(details.activity_level || "").toLowerCase()] || 0;

  const orgBonus = details.has_org_experience ? 10 : 0;

  return clamp(
    Math.round(
      repoScore +
        starScore +
        eventScore +
        repoTouchScore +
        activityBonus +
        orgBonus,
    ),
    12,
    100,
  );
}

function InsightCharts({ details }) {
  const activityScore = buildActivityScore(details);
  const languageEntries = (details.top_languages || [])
    .map(normalizePair)
    .filter((entry) => entry.label);
  const eventEntries = (details.top_events || [])
    .map(normalizePair)
    .filter((entry) => entry.label);
  const languageTotal =
    languageEntries.reduce((sum, entry) => sum + entry.value, 0) || 1;
  const eventTotal =
    eventEntries.reduce((sum, entry) => sum + entry.value, 0) || 1;
  const topRepoStars = toNumber(details.top_repo?.stars);
  const commitCount = toNumber(details.top_repo?.total_commits);

  return (
    <section className="signal-strip">
      <article className="signal-card ring-card">
        <div className="card-head">
          <p className="section-kicker">Signal</p>
          <h3>Activity score</h3>
        </div>
        <div className="ring-wrap">
          <div
            className="chart-ring"
            style={{ "--value": activityScore, "--accent": "#58a6ff" }}
            aria-label={`Activity score ${activityScore} out of 100`}
          >
            <div className="chart-ring-inner">
              <strong>{activityScore}</strong>
              <span>score</span>
            </div>
          </div>
          <div className="ring-copy">
            <p>
              Public repos, stars, and recent events combined into a single
              profile pulse.
            </p>
            <div className="mini-stats">
              <span>{details.total_repos ?? 0} repos</span>
              <span>{details.total_stars ?? 0} stars</span>
              <span>{details.total_events ?? 0} events</span>
            </div>
          </div>
        </div>
      </article>

      <article className="signal-card bar-card">
        <div className="card-head">
          <p className="section-kicker">Mix</p>
          <h3>Language distribution</h3>
        </div>
        <div className="bar-chart">
          {languageEntries.length ? (
            languageEntries.slice(0, 6).map((entry) => {
              const width = Math.max(8, (entry.value / languageTotal) * 100);

              return (
                <div className="bar-row" key={entry.label}>
                  <div className="bar-labels">
                    <span>{entry.label}</span>
                    <strong>{entry.value}</strong>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill language-fill"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-chart">No language data available yet.</div>
          )}
        </div>
      </article>

      <article className="signal-card bar-card">
        <div className="card-head">
          <p className="section-kicker">Rhythm</p>
          <h3>Event activity</h3>
        </div>
        <div className="bar-chart compact">
          {eventEntries.length ? (
            eventEntries.slice(0, 5).map((entry, index) => {
              const width = Math.max(10, (entry.value / eventTotal) * 100);
              const palette = [
                "#7ee787",
                "#58a6ff",
                "#a371f7",
                "#ffb86b",
                "#f78166",
              ];

              return (
                <div className="bar-row compact-row" key={entry.label}>
                  <div className="bar-labels">
                    <span>{entry.label}</span>
                    <strong>{entry.value}</strong>
                  </div>
                  <div className="bar-track">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${width}%`,
                        background: palette[index % palette.length],
                      }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-chart">No event data available yet.</div>
          )}
        </div>
      </article>

      <article className="signal-card repo-card">
        <div className="card-head">
          <p className="section-kicker">Focus</p>
          <h3>Top repository</h3>
        </div>
        <div className="repo-pulse">
          <div className="repo-pulse-top">
            <strong>{details.top_repo?.name || "No top repo"}</strong>
            <span>{topRepoStars} stars</span>
          </div>
          <div className="repo-pulse-bars">
            <div className="repo-pulse-bar">
              <span>Commits</span>
              <div className="bar-track slim">
                <div
                  className="bar-fill repo-fill"
                  style={{ width: `${clamp(commitCount * 8, 14, 100)}%` }}
                />
              </div>
            </div>
            <div className="repo-pulse-bar">
              <span>Star signal</span>
              <div className="bar-track slim">
                <div
                  className="bar-fill repo-fill alt"
                  style={{ width: `${clamp(topRepoStars * 6, 12, 100)}%` }}
                />
              </div>
            </div>
          </div>
          <div className="mini-stats repo-stats">
            <span>{details.fork_signal || "Fork signal n/a"}</span>
            <span>
              {details.has_org_experience
                ? "Org experience"
                : "No org experience"}
            </span>
          </div>
        </div>
      </article>
    </section>
  );
}

export default InsightCharts;
