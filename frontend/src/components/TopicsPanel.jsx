function TopicsPanel({ topics }) {
  return (
    <section className="content-section topics-section">
      <div className="section-head">
        <p className="section-kicker">Signals</p>
        <h3>Top Topics</h3>
      </div>
      <ul className="ranked-list">
        {topics.map(([topic, count], index) => (
          <li key={index}>
            <span>{topic}</span>
            <strong>{count}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default TopicsPanel;
