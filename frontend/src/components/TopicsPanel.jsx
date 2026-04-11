function TopicsPanel({ topics }) {
  return (
    <section>
      <div>
        <p>Signals</p>
        <h3>Top Topics</h3>
      </div>
      <ul>
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

