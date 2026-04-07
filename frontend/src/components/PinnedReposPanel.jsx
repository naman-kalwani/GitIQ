function PinnedReposPanel({ repos }) {
  if (!repos || repos.length === 0) {
    return null;
  }

  return (
    <section className="projects-view-shell">
      <div className="section-head projects-head">
        <p className="section-kicker">Portfolio</p>
        <h3>Pinned repositories</h3>
        <p>Projects with the strongest visibility and current focus signals.</p>
      </div>

      <ul className="repo-grid">
        {repos.map((repo, index) => (
          <li className="repo-card" key={index}>
            <div className="repo-head">
              <strong>{repo.name}</strong>
              <span>{repo.total_commits ?? 0} commits</span>
            </div>
            <p className="repo-description">
              {repo.description || "No description"}
            </p>
            <div className="repo-meta-group">
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
