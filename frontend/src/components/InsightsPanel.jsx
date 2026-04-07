function InsightsPanel({ insights }) {
  const confidenceLevel = String(insights.confidence || "").toLowerCase();
  const confidenceWidth =
    confidenceLevel === "high"
      ? "86%"
      : confidenceLevel === "medium"
        ? "60%"
        : "38%";

  return (
    <section className="insights-view-shell">
      <div className="insights-view-header">
        <div>
          <p className="section-kicker">AI review</p>
          <h3>Developer insights</h3>
        </div>
        <span className="confidence-mark">
          Confidence: {insights.confidence}
        </span>
      </div>

      <div className="insight-highlights insight-metrics">
        <div className="highlight-item metric-chip">
          <span>Type</span>
          <strong>{insights.developer_type}</strong>
        </div>
        <div className="highlight-item metric-chip">
          <span>Experience</span>
          <strong>{insights.experience_signal}</strong>
        </div>
        <div className="highlight-item metric-chip metric-chip-wide">
          <span>Confidence</span>
          <strong>{insights.confidence}</strong>
          <div className="meter-track">
            <div className="meter-fill" style={{ width: confidenceWidth }} />
          </div>
        </div>
      </div>

      <div className="insights-grid">
        <article className="insight-card insight-card-wide">
          <h4>Summary</h4>
          <p>{insights.summary}</p>
        </article>

        <article className="insight-card">
          <h4>Strengths</h4>
          <div className="tag-list compact-tags">
            {insights.strengths.map((item, index) => (
              <span className="tag insight-tag positive" key={index}>
                {item}
              </span>
            ))}
          </div>
        </article>

        <article className="insight-card">
          <h4>Weak spots</h4>
          <div className="tag-list compact-tags">
            {insights.weaknesses.map((item, index) => (
              <span className="tag insight-tag negative" key={index}>
                {item}
              </span>
            ))}
          </div>
        </article>

        <article className="insight-card insight-card-wide">
          <h4>Highlights</h4>
          <p>{insights.highlights_of_profile}</p>
        </article>

        <article className="insight-card recommendation-card insight-card-wide">
          <h4>Recommendation</h4>
          <p>{insights.recommendation}</p>
        </article>
      </div>
    </section>
  );
}

export default InsightsPanel;
