import { useEffect, useState } from "react";
import axios from "axios";
import api from "./api";
import Analyze from "./components/Analyze";
import SearchPanel from "./components/SearchPanel";

const STORAGE_KEY = "gitiq-analysis";

function App() {
  const [page, setPage] = useState("home");
  const [dashboardView, setDashboardView] = useState("overview");
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved);
      setDetails(parsed);
      setPage("dashboard");
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const toErrorMessage = (err, user) => {
    if (!axios.isAxiosError(err)) {
      return "Something unexpected happened. Please try again.";
    }

    if (err.code === "ECONNABORTED") {
      return "Request timed out. Please try again.";
    }

    if (err.response) {
      const { status, data } = err.response;

      if (status === 404) {
        return `GitHub user "${user}" was not found.`;
      }

      if (status === 429) {
        return "GitHub rate limit hit. Please wait and try again.";
      }

      const detail = data?.detail;
      if (typeof detail === "string" && detail.trim()) {
        return detail;
      }

      if (typeof detail === "object" && detail?.message) {
        return detail.message;
      }

      if (typeof data?.message === "string" && data.message.trim()) {
        return data.message;
      }

      return `Request failed with status ${status}.`;
    }

    if (err.request) {
      return "Cannot reach server. Ensure backend is running on port 8000.";
    }

    return err.message || "Failed to fetch analysis data.";
  };

  const runAnalyze = async (user) => {
    if (!user) {
      setError("Please enter a valid GitHub username.");
      return;
    }

    setUsername(user);
    setLoading(true);
    setError("");

    try {
      const response = await api.get(`/analyze/${user}`);
      setDetails(response.data);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(response.data));
      setDashboardView("overview");
      setPage("dashboard");
    } catch (err) {
      setError(toErrorMessage(err, user));
    } finally {
      setLoading(false);
    }
  };

  const clearSession = () => {
    setDetails(null);
    setError("");
    setUsername("");
    setDashboardView("overview");
    localStorage.removeItem(STORAGE_KEY);
    setPage("home");
  };

  const dashboardTabs = [
    { id: "overview", label: "Overview" },
    { id: "insights", label: "Insights" },
    { id: "projects", label: "Projects" },
  ];

  return (
    <div className="app-shell">
      <main className="site-shell">
        <header className="site-header">
          <div className="brand-wrap">
            <div className="brand">GitIQ</div>
            <p className="brand-subtitle">Retro profile radar terminal</p>
          </div>
          <nav className="site-nav" aria-label="primary">
            <button type="button" onClick={() => setPage("home")}>
              Home
            </button>
            <button type="button" onClick={() => setPage("access")}>
              Scan
            </button>
            <button
              type="button"
              onClick={() => {
                if (details) {
                  setDashboardView("overview");
                  setPage("dashboard");
                }
              }}
              disabled={!details}
            >
              Dashboard
            </button>
          </nav>
        </header>

        {page === "home" && (
          <section className="page-home">
            <section className="hero hero-retro">
              <div className="hero-terminal">
                <div className="terminal-header">
                  <span className="terminal-button close">●</span>
                  <span className="terminal-button minimize">●</span>
                  <span className="terminal-button maximize">●</span>
                  <span className="terminal-title">gitiq.dashboard</span>
                </div>
                <div className="terminal-content">
                  <div className="terminal-line">
                    <span className="prompt">$</span> load github profile
                    telemetry
                  </div>
                  <div className="terminal-line">
                    <span className="prompt">&gt;</span>{" "}
                    <span className="typing-text">
                      initializing scan matrix and signal capture
                    </span>
                  </div>
                  <div className="terminal-line empty"></div>
                  <div className="terminal-line">
                    <span className="prompt">$</span> run profile scanner
                    protocol
                  </div>
                  <div className="terminal-line">
                    <span className="prompt">&gt;</span> collecting activity,
                    repo frequencies, language bands, and AI briefing.
                  </div>
                </div>
              </div>

              <div className="hero-copy">
                <h1 className="hero-title">
                  <span className="glitch" data-glitch="Retro Dev Scanner">
                    Retro Dev Scanner
                  </span>
                  <span className="sub-glow">
                    arcade HUD for GitHub signals
                  </span>
                </h1>
                <p className="hero-subtitle">
                  Enter a GitHub username and GitIQ runs a CRT-style scan that
                  maps public activity into repo signals, language bands,
                  highlighted projects, and an AI mission brief.
                </p>

                <div className="hero-features">
                  <div className="feature">
                    <span className="feature-icon">◆</span>
                    <span className="feature-text">
                      Live radar profile sweep
                    </span>
                  </div>
                  <div className="feature">
                    <span className="feature-icon">◆</span>
                    <span className="feature-text">
                      Repo and language frequency maps
                    </span>
                  </div>
                  <div className="feature">
                    <span className="feature-icon">◆</span>
                    <span className="feature-text">AI command summary</span>
                  </div>
                </div>

                <div className="hero-actions">
                  <button
                    type="button"
                    onClick={() => setPage("access")}
                    className="btn-primary"
                  >
                    → Start Scan
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      if (details) {
                        setDashboardView("insights");
                        setPage("dashboard");
                      }
                    }}
                    disabled={!details}
                  >
                    View Insights
                  </button>
                </div>
              </div>
            </section>

            <section className="hero-section">
              <h2 className="section-title neon-cyan">How it works</h2>
              <div className="flow-grid">
                <div className="flow-item">
                  <div className="flow-number">01</div>
                  <h3>Enter a username</h3>
                  <p>Use any public GitHub profile name.</p>
                </div>
                <div className="flow-item">
                  <div className="flow-number">02</div>
                  <h3>Run the scan</h3>
                  <p>GitIQ processes repos, commits, topics, and languages.</p>
                </div>
                <div className="flow-item">
                  <div className="flow-number">03</div>
                  <h3>Read the dashboard</h3>
                  <p>Review the summary, repository cards, and AI insights.</p>
                </div>
              </div>
            </section>

            <section className="hero-section alt">
              <h2 className="section-title neon-magenta">Why GitIQ</h2>
              <div className="reasons-grid">
                <div className="reason-card">
                  <h4>Focused analysis</h4>
                  <p>
                    GitHub activity is translated into a cleaner, more useful
                    profile signal.
                  </p>
                </div>
                <div className="reason-card">
                  <h4>AI insights</h4>
                  <p>
                    Get a concise readout of strengths, weaknesses, and
                    developer type.
                  </p>
                </div>
                <div className="reason-card">
                  <h4>Fast results</h4>
                  <p>
                    Your last scan persists locally so you can return to the
                    dashboard instantly.
                  </p>
                </div>
              </div>
            </section>
          </section>
        )}

        {page === "access" && (
          <section className="page-access">
            <div className="scanner-section">
              <div className="scanner-header">
                <h2 className="scanner-title">
                  <span className="title-glow">Boot scanner</span>
                </h2>
                <p className="scanner-subtitle">
                  Input a GitHub handle to run a full telemetry sweep and
                  generate a mission-ready profile snapshot.
                </p>
              </div>

              <div className="scanner-input-wrapper">
                <SearchPanel onAnalyze={runAnalyze} submitLabel="EXECUTE" />
              </div>

              {loading && (
                <div className="scanner-status scanning">
                  <div className="scan-dot">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span>Scanning {username}...</span>
                </div>
              )}

              {error && (
                <div className="scanner-status error-state">
                  <span className="error-icon">⚠</span>
                  <span>{error}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {page === "dashboard" && details && (
          <section className="page-dashboard">
            <div className="dashboard-header">
              <div className="dashboard-copy">
                <p className="section-kicker dashboard-kicker">Overview</p>
                <h1>Analysis Dashboard</h1>
                <p>
                  High-signal metrics first, detailed analytics behind a
                  collapsible section, and AI insights kept in a dedicated view.
                </p>
              </div>

              <div className="dashboard-user-card">
                <div className="dashboard-avatar" aria-hidden="true">
                  {details.username?.slice(0, 1)?.toUpperCase() || "G"}
                </div>
                <div className="dashboard-user-copy">
                  <strong>{details.username}</strong>
                  <span>
                    {details.activity_level
                      ? `${details.activity_level} activity`
                      : "Profile summary"}
                  </span>
                </div>
                <div className="dashboard-status-pill">
                  <span className="status-dot" />
                  <span>{details.activity_level || "Active"}</span>
                </div>
              </div>
            </div>

            <div
              className="dashboard-tabs"
              role="tablist"
              aria-label="Dashboard views"
            >
              {dashboardTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={dashboardView === tab.id ? "is-active" : ""}
                  onClick={() => setDashboardView(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
              <div className="dashboard-actions">
                <button type="button" onClick={() => setPage("access")}>
                  Run again
                </button>
                <button type="button" className="ghost" onClick={clearSession}>
                  Clear session
                </button>
              </div>
            </div>

            <Analyze details={details} activeView={dashboardView} />
          </section>
        )}

        {page === "dashboard" && !details && (
          <section className="page-access">
            <div className="status-card status-loading">
              No saved insights found yet. Run analyze first.
            </div>
          </section>
        )}

        <footer className="site-footer">
          <span>Powered by GitHub profile and repository activity</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
