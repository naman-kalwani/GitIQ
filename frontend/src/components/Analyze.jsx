import PinnedReposPanel from "./PinnedReposPanel.jsx";
import InsightsPanel from "./InsightsPanel.jsx";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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
  const activityScore = buildActivityScore(details);
  const languageEntries = details.top_languages || [];
  const topTopics = details.top_topics || [];
  const languageTotal =
    languageEntries.reduce((sum, [, value]) => sum + toNumber(value), 0) || 1;

  return (
    <section className="dashboard-overview">
      <div className="dashboard-grid">
        <article className="panel panel-score">
          <div className="panel-head">
            <p className="section-kicker">Signal</p>
            <h3>Activity score</h3>
          </div>
          <div className="score-layout">
            <div
              className="score-ring"
              style={{ "--score": activityScore }}
              aria-label={`Activity score ${activityScore} out of 100`}
            >
              <div className="score-ring-inner">
                <strong>{activityScore}</strong>
                <span>score</span>
              </div>
            </div>
            <div className="score-copy">
              <p>
                A combined signal from repo count, stars, active events, and org
                exposure.
              </p>
              <div className="metric-pills">
                <span>{details.total_repos ?? 0} repos</span>
                <span>{details.total_stars ?? 0} stars</span>
                <span>{details.total_events ?? 0} events</span>
              </div>
            </div>
          </div>
        </article>

        <article className="panel panel-languages">
          <div className="panel-head">
            <p className="section-kicker">Mix</p>
            <h3>Top languages</h3>
          </div>
          <div className="bar-list compact">
            {languageEntries.length ? (
              languageEntries.slice(0, 5).map(([language, value], index) => {
                const width = Math.max(
                  12,
                  (toNumber(value) / languageTotal) * 100,
                );

                return (
                  <div className="bar-row" key={`${language}-${index}`}>
                    <div className="bar-row-meta">
                      <span>{language}</span>
                      <strong>{Math.round(width)}%</strong>
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
              <p className="empty-copy">No language data available.</p>
            )}
          </div>
        </article>

        <article className="panel panel-topics">
          <div className="panel-head">
            <p className="section-kicker">Signals</p>
            <h3>Top topics</h3>
          </div>
          <div className="tag-list dense">
            {topTopics.length ? (
              topTopics.map(([topic, count]) => (
                <span className="tag" key={topic}>
                  {topic} · {count}
                </span>
              ))
            ) : (
              <p className="empty-copy">No topic data available.</p>
            )}
          </div>
        </article>

        <section className="panel panel-accordion panel-accordion-open">
          <div className="panel-accordion-head">
            <p className="section-kicker">Advanced analytics</p>
            <h3>Detailed signals</h3>
          </div>

          <div className="analytics-grid">
            <div className="analytics-item">
              <span>Total events</span>
              <strong>{details.total_events ?? 0}</strong>
            </div>
            <div className="analytics-item">
              <span>Last active</span>
              <strong>{formatLatestActivity(details.latest_event_at)}</strong>
            </div>
            <div className="analytics-item">
              <span>Avg gap</span>
              <strong>{formatGap(details.avg_event_gap_seconds)}</strong>
            </div>
            <div className="analytics-item analytics-item-wide">
              <span>Fork ratio</span>
              <strong>{details.fork_signal || "Unknown"}</strong>
            </div>
          </div>

          <div className="analytics-event-list">
            {(details.top_events || []).map(([eventName, count]) => (
              <div className="analytics-event-row" key={eventName}>
                <span>{eventName}</span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="overview-rail">
        <article className="panel panel-repo">
          <div className="panel-head">
            <p className="section-kicker">Focus</p>
            <h3>Top repository</h3>
          </div>
          <div className="repo-feature">
            <strong>{details.top_repo?.name || "No top repo"}</strong>
            <div className="repo-badge">⭐ {details.top_repo?.stars ?? 0}</div>
            <p>
              {details.top_repo?.description || "No description available."}
            </p>
          </div>
        </article>

        <article className="panel panel-org">
          <div className="panel-head">
            <p className="section-kicker">Collaboration</p>
            <h3>Org experience</h3>
          </div>
          <div className="status-card-mini">
            <span
              className={
                details.has_org_experience
                  ? "status-mark yes"
                  : "status-mark no"
              }
            >
              {details.has_org_experience ? "Yes" : "No"}
            </span>
            <p>
              {details.has_org_experience
                ? "Evidence of organizational work and team-oriented activity."
                : "No clear org signals detected in the available profile data."}
            </p>
          </div>
        </article>

        <article className="panel panel-activity">
          <div className="panel-head">
            <p className="section-kicker">Activity</p>
            <h3>Summary</h3>
          </div>
          <div className="summary-stack">
            <div>
              <span>Active repos</span>
              <strong>{details.active_event_repos ?? 0}</strong>
            </div>
            <div>
              <span>Activity level</span>
              <strong>{details.activity_level || "Unknown"}</strong>
            </div>
            <div>
              <span>Fork signal</span>
              <strong>{details.fork_signal || "Unknown"}</strong>
            </div>
          </div>
        </article>
      </aside>
    </section>
  );
}

function InsightsView({ details }) {
  return (
    <section className="dashboard-insights-view">
      <InsightsPanel insights={details.insights} />
    </section>
  );
}

function ProjectsView({ details }) {
  return (
    <section className="dashboard-projects-view">
      <PinnedReposPanel repos={details.pinned_repos} />
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
