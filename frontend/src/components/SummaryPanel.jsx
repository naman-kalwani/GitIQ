function SummaryPanel({ details }) {
  const languageEntries = details.top_languages || [];

  return (
    <section>
      <div>
        <p>Overview</p>
        <h3>{details.username}</h3>
        <p>Profile analysis completed</p>
      </div>

      <div>
        <article>
          <span>Total Repos</span>
          <strong>{details.total_repos}</strong>
        </article>
        <article>
          <span>Total Stars</span>
          <strong>{details.total_stars}</strong>
        </article>
        <article>
          <span>Activity Level</span>
          <strong>{details.activity_level || "Unknown"}</strong>
        </article>
        <article>
          <span>Org Experience</span>
          <strong>{details.has_org_experience ? "Yes" : "No"}</strong>
        </article>
      </div>

      <div>
        <div>
          <div>
            <h4>Top languages</h4>
            <span>Language share across the profile</span>
          </div>
          <div>
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
                  <div key={`${lang}-${index}`}>
                    <div>
                      <span>{lang}</span>
                      <strong>{count}</strong>
                    </div>
                    <div>
                      <div
                       
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div>No language data available.</div>
            )}
          </div>
        </div>

        <div>
          <div>
            <h4>Top repository</h4>
            <span>Most visible public project</span>
          </div>
          <div>
            <strong>{details.top_repo?.name || "None"}</strong>
            <p>
              {details.top_repo?.description || "No description available."}
            </p>
            <div>
              <span>{details.top_repo?.stars ?? 0} stars</span>
              <span>{details.top_repo?.total_commits ?? 0} commits</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <article>
          <span>Event types</span>
          <strong>
            {details.top_events?.map(([type]) => type).join(", ") || "None"}
          </strong>
        </article>
        <article>
          <span>Recent events</span>
          <strong>{details.total_events ?? 0}</strong>
        </article>
        <article>
          <span>Repos touched</span>
          <strong>{details.active_event_repos ?? 0}</strong>
        </article>
        <article>
          <span>Fork signal</span>
          <strong>{details.fork_signal || "Unknown"}</strong>
        </article>
      </div>
    </section>
  );
}

export default SummaryPanel;

