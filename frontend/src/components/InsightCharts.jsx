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

function InsightCharts({ details }) {
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
    <section>
      <article>
        <div>
          <p>Signal</p>
          <h3>Activity snapshot</h3>
        </div>
        <div>
          <div>
            <p>
              Snapshot of repos, stars, events, and active repository coverage.
            </p>
            <div>
              <span>{details.total_repos ?? 0} repos</span>
              <span>{details.total_stars ?? 0} stars</span>
              <span>{details.total_events ?? 0} events</span>
              <span>{details.active_event_repos ?? 0} active repos</span>
            </div>
          </div>
        </div>
      </article>

      <article>
        <div>
          <p>Mix</p>
          <h3>Language distribution</h3>
        </div>
        <div>
          {languageEntries.length ? (
            languageEntries.slice(0, 6).map((entry) => {
              const width = Math.max(8, (entry.value / languageTotal) * 100);

              return (
                <div key={entry.label}>
                  <div>
                    <span>{entry.label}</span>
                    <strong>{entry.value}</strong>
                  </div>
                  <div>
                    <div style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })
          ) : (
            <div>No language data available yet.</div>
          )}
        </div>
      </article>

      <article>
        <div>
          <p>Rhythm</p>
          <h3>Event activity</h3>
        </div>
        <div>
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
                <div key={entry.label}>
                  <div>
                    <span>{entry.label}</span>
                    <strong>{entry.value}</strong>
                  </div>
                  <div>
                    <div
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
            <div>No event data available yet.</div>
          )}
        </div>
      </article>

      <article>
        <div>
          <p>Focus</p>
          <h3>Top repository</h3>
        </div>
        <div>
          <div>
            <strong>{details.top_repo?.name || "No top repo"}</strong>
            <span>{topRepoStars} stars</span>
          </div>
          <div>
            <div>
              <span>Commits</span>
              <div>
                <div style={{ width: `${clamp(commitCount * 8, 14, 100)}%` }} />
              </div>
            </div>
            <div>
              <span>Star signal</span>
              <div>
                <div
                  style={{ width: `${clamp(topRepoStars * 6, 12, 100)}%` }}
                />
              </div>
            </div>
          </div>
          <div>
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
