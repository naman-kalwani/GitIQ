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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.18),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(168,85,247,0.16),transparent_30%)]" />
      <main className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800/70 bg-slate-900/70 px-4 py-3 shadow-lg shadow-slate-950/50 backdrop-blur-xl">
          <div>
            <div className="text-xl font-semibold tracking-tight">GitIQ</div>
            <p className="text-sm text-slate-400">
              Modern GitHub profile intelligence
            </p>
          </div>
          <nav aria-label="primary" className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setPage("home")}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium transition hover:border-cyan-400/60 hover:text-cyan-300"
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => setPage("access")}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium transition hover:border-cyan-400/60 hover:text-cyan-300"
            >
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
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium transition hover:border-cyan-400/60 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Dashboard
            </button>
          </nav>
        </header>

        {page === "home" && (
          <section className="grid gap-6">
            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-slate-950/60">
                <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3 text-xs text-slate-400">
                  <span className="text-rose-400">●</span>
                  <span className="text-amber-400">●</span>
                  <span className="text-emerald-400">●</span>
                  <span className="ml-2 tracking-wide">gitiq.dashboard</span>
                </div>
                <div className="space-y-2 p-4 font-mono text-sm text-slate-300">
                  <div>
                    <span className="mr-2 text-cyan-300">$</span> load github
                    profile telemetry
                  </div>
                  <div>
                    <span className="mr-2 text-fuchsia-300">&gt;</span>{" "}
                    <span className="text-slate-200">
                      initializing scan matrix and signal capture
                    </span>
                  </div>
                  <div className="h-1" />
                  <div>
                    <span className="mr-2 text-cyan-300">$</span> run profile
                    scanner protocol
                  </div>
                  <div>
                    <span className="mr-2 text-fuchsia-300">&gt;</span>{" "}
                    collecting activity, repo frequencies, language bands, and
                    AI briefing.
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-center gap-5">
                <h1 className="flex flex-col gap-2">
                  <span className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    GitIQ Signal Studio
                  </span>
                  <span className="text-base font-medium text-cyan-300 sm:text-lg">
                    Aesthetic dark analytics for developer profiles
                  </span>
                </h1>
                <p className="max-w-2xl text-slate-300">
                  Enter a GitHub username and GitIQ runs a high-signal scan that
                  maps public activity into repo signals, language bands,
                  highlighted projects, and an AI mission brief.
                </p>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200">
                    ◆ Live radar profile sweep
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200">
                    ◆ Repo and language frequency maps
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 sm:col-span-2">
                    ◆ AI command summary
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setPage("access")}
                    className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                  >
                    → Start Scan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (details) {
                        setDashboardView("insights");
                        setPage("dashboard");
                      }
                    }}
                    disabled={!details}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/60 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    View Insights
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="mb-4 text-xl font-semibold text-white">
                How it works
              </h2>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <div className="mb-2 text-sm font-semibold text-cyan-300">
                    01
                  </div>
                  <h3>Enter a username</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Use any public GitHub profile name.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <div className="mb-2 text-sm font-semibold text-cyan-300">
                    02
                  </div>
                  <h3>Run the scan</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    GitIQ processes repos, commits, topics, and languages.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <div className="mb-2 text-sm font-semibold text-cyan-300">
                    03
                  </div>
                  <h3>Read the dashboard</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    Review the summary, repository cards, and AI insights.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="mb-4 text-xl font-semibold text-white">
                Why GitIQ
              </h2>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <h4>Focused analysis</h4>
                  <p className="mt-2 text-sm text-slate-400">
                    GitHub activity is translated into a cleaner, more useful
                    profile signal.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <h4>AI insights</h4>
                  <p className="mt-2 text-sm text-slate-400">
                    Get a concise readout of strengths, weaknesses, and
                    developer type.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                  <h4>Fast results</h4>
                  <p className="mt-2 text-sm text-slate-400">
                    Your last scan persists locally so you can return to the
                    dashboard instantly.
                  </p>
                </div>
              </div>
            </section>
          </section>
        )}

        {page === "access" && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="grid gap-5">
              <div className="grid gap-2">
                <h2 className="text-2xl font-semibold text-white">
                  <span>Boot scanner</span>
                </h2>
                <p className="max-w-3xl text-slate-400">
                  Input a GitHub handle to run a full telemetry sweep and
                  generate a mission-ready profile snapshot.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <SearchPanel onAnalyze={runAnalyze} submitLabel="EXECUTE" />
              </div>

              {loading && (
                <div className="flex items-center gap-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-cyan-200">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300 [animation-delay:120ms]" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300 [animation-delay:240ms]" />
                  </div>
                  <span>Scanning {username}...</span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-200">
                  <span>⚠</span>
                  <span>{error}</span>
                </div>
              )}
            </div>
          </section>
        )}

        {page === "dashboard" && details && (
          <section className="grid gap-5">
            <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="grid gap-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
                  Overview
                </p>
                <h1 className="text-2xl font-semibold text-white sm:text-3xl">
                  Analysis Dashboard
                </h1>
                <p className="max-w-3xl text-sm text-slate-400">
                  High-signal metrics first, detailed analytics behind a
                  collapsible section, and AI insights kept in a dedicated view.
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                <div
                  aria-hidden="true"
                  className="grid h-10 w-10 place-items-center rounded-full bg-cyan-500/20 text-sm font-semibold text-cyan-300"
                >
                  {details.username?.slice(0, 1)?.toUpperCase() || "G"}
                </div>
                <div className="grid">
                  <strong>{details.username}</strong>
                  <span className="text-sm text-slate-400">
                    {details.activity_level
                      ? `${details.activity_level} activity`
                      : "Profile summary"}
                  </span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  <span>{details.activity_level || "Active"}</span>
                </div>
              </div>
            </div>

            <div
              className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-3"
              role="tablist"
              aria-label="Dashboard views"
            >
              {dashboardTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                    dashboardView === tab.id
                      ? "bg-cyan-500 text-slate-950"
                      : "border border-slate-700 bg-slate-800 text-slate-200 hover:border-cyan-400/60 hover:text-cyan-300"
                  }`}
                  onClick={() => setDashboardView(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
              <div className="ml-auto flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPage("access")}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-300"
                >
                  Run again
                </button>
                <button
                  type="button"
                  onClick={clearSession}
                  className="rounded-xl border border-rose-400/50 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20"
                >
                  Clear session
                </button>
              </div>
            </div>

            <Analyze details={details} activeView={dashboardView} />
          </section>
        )}

        {page === "dashboard" && !details && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-amber-200">
              No saved insights found yet. Run analyze first.
            </div>
          </section>
        )}

        <footer className="mt-6 border-t border-slate-800 pt-4 text-center text-xs text-slate-500">
          <span>Powered by GitHub profile and repository activity</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
