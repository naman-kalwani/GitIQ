import { useEffect, useRef, useState } from "react";
import axios from "axios";
import api from "./api";
import Analyze from "./components/Analyze";
import SearchPanel from "./components/SearchPanel";
import { supabase } from "./lib/supabase";

const USER_STORAGE_KEY = "gitiq-user-analysis";
const SCAN_STORAGE_KEY = "gitiq-scan-analysis";
const AUTH_SYNC_KEY = "gitiq-auth-sync";

function AnalysisDashboard({
  details,
  dashboardView,
  setDashboardView,
  onRunAgain,
  onClear,
  runAgainLabel,
  showProjectsTab = true,
}) {
  const allTabs = [
    { id: "overview", label: "Overview" },
    { id: "insights", label: "Insights" },
    { id: "projects", label: "Repositories analysis" },
  ];
  const dashboardTabs = showProjectsTab
    ? allTabs
    : allTabs.filter((tab) => tab.id !== "projects");
  const effectiveDashboardView = dashboardTabs.some(
    (tab) => tab.id === dashboardView,
  )
    ? dashboardView
    : "overview";

  return (
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
            High-signal metrics first, detailed analytics behind a collapsible
            section, and AI insights kept in a dedicated view.
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
              effectiveDashboardView === tab.id
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
            onClick={onRunAgain}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-300"
          >
            {runAgainLabel}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-xl border border-rose-400/50 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20"
          >
            Clear snapshot
          </button>
        </div>
      </div>

      <Analyze details={details} activeView={effectiveDashboardView} />
    </section>
  );
}

function App() {
  const [page, setPage] = useState("home");
  const [userDashboardView, setUserDashboardView] = useState("overview");
  const [scanDashboardView, setScanDashboardView] = useState("overview");
  const [userDetails, setUserDetails] = useState(null);
  const [scanDetails, setScanDetails] = useState(null);
  const [loadingTarget, setLoadingTarget] = useState("");
  const [loadingUsername, setLoadingUsername] = useState("");
  const [userError, setUserError] = useState("");
  const [scanError, setScanError] = useState("");
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const lastAutoAnalyzedRef = useRef("");
  const authFlowInProgressRef = useRef(false);
  const userMenuRef = useRef(null);
  const previousSessionRef = useRef(null);

  useEffect(() => {
    const savedUser = localStorage.getItem(USER_STORAGE_KEY);
    const savedScan = localStorage.getItem(SCAN_STORAGE_KEY);
    try {
      if (savedUser) {
        setUserDetails(JSON.parse(savedUser));
      }

      if (savedScan) {
        setScanDetails(JSON.parse(savedScan));
      }
    } catch {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(SCAN_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    const hydrateSession = async () => {
      const {
        data: { session: activeSession },
      } = await supabase.auth.getSession();
      setSession(activeSession || null);
    };

    hydrateSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      const wasLoggedOut = !previousSessionRef.current;
      const isNowLoggedIn = !!nextSession;
      previousSessionRef.current = nextSession;

      if (wasLoggedOut && isNowLoggedIn) {
        setPage("userDashboard");
      }

      setSession(nextSession || null);
      if (!nextSession) {
        lastAutoAnalyzedRef.current = "";
        authFlowInProgressRef.current = false;
        sessionStorage.removeItem(AUTH_SYNC_KEY);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!userMenuRef.current?.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    const handleEsc = (event) => {
      if (event.key === "Escape") {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const extractGithubUsername = (activeSession) => {
    if (!activeSession?.user) {
      return "";
    }

    const metadata = activeSession.user.user_metadata || {};
    const identity = activeSession.user.identities?.find(
      (entry) => entry.provider === "github",
    );
    const identityData = identity?.identity_data || {};

    return (
      metadata.user_name ||
      metadata.preferred_username ||
      identityData.user_name ||
      identityData.preferred_username ||
      ""
    );
  };

  const persistGithubLogin = async (activeSession, githubUsername) => {
    const accessToken = activeSession?.access_token;
    if (!accessToken) {
      return;
    }

    const metadata = activeSession?.user?.user_metadata || {};

    await api.post("/auth/github-login", {
      access_token: accessToken,
      github_username:
        githubUsername ||
        metadata.user_name ||
        metadata.preferred_username ||
        null,
      github_avatar_url: metadata.avatar_url || null,
    });
  };

  useEffect(() => {
    const runAuthenticatedSync = async () => {
      if (!session) {
        return;
      }

      const githubUsername = extractGithubUsername(session);
      const syncKey = `${session?.user?.id || "anon"}:${githubUsername}`;
      const persistedSyncKey = sessionStorage.getItem(AUTH_SYNC_KEY);

      if (
        !githubUsername ||
        lastAutoAnalyzedRef.current === syncKey ||
        persistedSyncKey === syncKey ||
        authFlowInProgressRef.current
      ) {
        return;
      }

      authFlowInProgressRef.current = true;
      lastAutoAnalyzedRef.current = syncKey;
      setAuthError("");

      try {
        await persistGithubLogin(session, githubUsername);
        sessionStorage.setItem(AUTH_SYNC_KEY, syncKey);
      } catch (persistError) {
        setAuthError(
          persistError.message ||
            "Could not store GitHub login details in Supabase.",
        );
      } finally {
        authFlowInProgressRef.current = false;
      }
    };

    runAuthenticatedSync();
    // Sync profile only; analyze is triggered manually by user, not automatically.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

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

  const runAnalyze = async (user, target = "scan") => {
    if (!user) {
      if (target === "user") {
        setUserError("Please enter a valid GitHub username.");
      } else {
        setScanError("Please enter a valid GitHub username.");
      }
      return;
    }

    setLoadingUsername(user);
    setLoadingTarget(target);

    if (target === "user") {
      setUserError("");
    } else {
      setScanError("");
    }

    try {
      const response = await api.get(`/analyze/${user}`);

      if (target === "user") {
        setUserDetails(response.data);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.data));
        setUserDashboardView("overview");
        setPage("userDashboard");
      } else {
        setScanDetails(response.data);
        localStorage.setItem(SCAN_STORAGE_KEY, JSON.stringify(response.data));
        setScanDashboardView("overview");
        setPage("scanDashboard");
      }
    } catch (err) {
      if (target === "user") {
        setUserError(toErrorMessage(err, user));
      } else {
        setScanError(toErrorMessage(err, user));
      }
    } finally {
      setLoadingTarget("");
      setLoadingUsername("");
    }
  };

  const signInWithGithub = async () => {
    setAuthLoading(true);
    setAuthError("");
    setShowUserMenu(false);

    const redirectTo = `${window.location.origin}`;
    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo },
    });

    if (signInError) {
      setAuthError(signInError.message || "GitHub sign in failed.");
      setAuthLoading(false);
      return;
    }
  };

  const signOut = async () => {
    setAuthLoading(true);
    setAuthError("");
    setShowUserMenu(false);

    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setAuthError(signOutError.message || "Sign out failed.");
    } else {
      lastAutoAnalyzedRef.current = "";
      authFlowInProgressRef.current = false;
      sessionStorage.removeItem(AUTH_SYNC_KEY);
    }

    setAuthLoading(false);
  };

  const clearUserSnapshot = () => {
    setUserDetails(null);
    setUserError("");
    setUserDashboardView("overview");
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  const clearScanSnapshot = () => {
    setScanDetails(null);
    setScanError("");
    setScanDashboardView("overview");
    localStorage.removeItem(SCAN_STORAGE_KEY);
  };

  const detectedUsername = extractGithubUsername(session);
  const isUserLoading = loadingTarget === "user";
  const isScanLoading = loadingTarget === "scan";

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
          <div className="flex flex-wrap items-center gap-3">
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
                onClick={() => setPage("userDashboard")}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium transition hover:border-cyan-400/60 hover:text-cyan-300"
              >
                Your Insights
              </button>
              <button
                type="button"
                onClick={() => setPage("scanDashboard")}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium transition hover:border-cyan-400/60 hover:text-cyan-300"
              >
                Other Profiles
              </button>
            </nav>

            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setShowUserMenu((prev) => !prev)}
                className="grid h-10 w-10 place-items-center rounded-full border border-slate-700 bg-slate-800 text-slate-200 transition hover:border-cyan-400/60 hover:text-cyan-300"
                aria-haspopup="menu"
                aria-expanded={showUserMenu}
                aria-label="User menu"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="8" r="3.5" />
                  <path d="M5.5 19.5c1.4-3.4 4-5 6.5-5s5.1 1.6 6.5 5" />
                </svg>
              </button>

              {showUserMenu && (
                <div
                  role="menu"
                  className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-slate-700 bg-slate-900 p-3 shadow-xl shadow-slate-950/70"
                >
                  <div className="mb-3 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Account
                    </p>
                    <p className="truncate text-sm font-medium text-slate-100">
                      {detectedUsername || session?.user?.email || "Guest"}
                    </p>
                  </div>

                  {session ? (
                    <button
                      type="button"
                      onClick={signOut}
                      disabled={authLoading}
                      className="w-full rounded-lg border border-rose-400/50 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Sign out
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={signInWithGithub}
                      disabled={authLoading}
                      className="w-full rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Login with GitHub
                    </button>
                  )}

                  {authError && (
                    <p className="mt-3 text-xs text-rose-300">{authError}</p>
                  )}
                </div>
              )}
            </div>
          </div>
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
                    Dark analytics for developer profiles
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
                    onClick={() => setPage("userDashboard")}
                    className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                  >
                    → Get Your Insights
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage("scanDashboard")}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-cyan-400/60 hover:text-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Scan other Profiles
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

        {page === "userDashboard" && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="grid gap-5">
              <div className="grid gap-2">
                <h2 className="text-2xl font-semibold text-white">
                  <span>User Dashboard</span>
                </h2>
                <p className="max-w-3xl text-slate-400">
                  Signed-in profile insights live here. Use the user icon in the
                  header to login or sign out.
                </p>
              </div>

              {session && !userDetails && !isUserLoading && (
                <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-amber-200">
                  <p className="mb-3 text-sm">
                    No user snapshot found yet. Sync your GitHub profile to
                    generate insights.
                  </p>
                  <button
                    type="button"
                    onClick={() => runAnalyze(detectedUsername, "user")}
                    disabled={!detectedUsername}
                    className="rounded-xl border border-amber-300/40 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Sync my profile
                  </button>
                </div>
              )}

              {isUserLoading && (
                <div className="flex items-center gap-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-cyan-200">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300 [animation-delay:120ms]" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300 [animation-delay:240ms]" />
                  </div>
                  <span>Scanning {loadingUsername}...</span>
                </div>
              )}

              {userError && (
                <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-200">
                  <span>⚠</span>
                  <span>{userError}</span>
                </div>
              )}

              {!session && (
                <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">
                  Sign in with GitHub to unlock your personal dashboard.
                </div>
              )}

              {session && userDetails && (
                <AnalysisDashboard
                  details={userDetails}
                  dashboardView={userDashboardView}
                  setDashboardView={setUserDashboardView}
                  onRunAgain={() => runAnalyze(detectedUsername, "user")}
                  onClear={clearUserSnapshot}
                  runAgainLabel="Refresh my insights"
                  showProjectsTab
                />
              )}
            </div>
          </section>
        )}

        {page === "scanDashboard" && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="grid gap-5">
              <div className="grid gap-2">
                <h2 className="text-2xl font-semibold text-white">
                  <span>Scan Dashboard</span>
                </h2>
                <p className="max-w-3xl text-slate-400">
                  Analyze any public GitHub username and review insights in a
                  dedicated scan workspace.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <SearchPanel
                  onAnalyze={(user) => runAnalyze(user, "scan")}
                  submitLabel="SCAN"
                />
              </div>

              {isScanLoading && (
                <div className="flex items-center gap-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-cyan-200">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300 [animation-delay:120ms]" />
                    <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300 [animation-delay:240ms]" />
                  </div>
                  <span>Scanning {loadingUsername}...</span>
                </div>
              )}

              {scanError && (
                <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-200">
                  <span>⚠</span>
                  <span>{scanError}</span>
                </div>
              )}

              {scanDetails ? (
                <AnalysisDashboard
                  details={scanDetails}
                  dashboardView={scanDashboardView}
                  setDashboardView={setScanDashboardView}
                  onRunAgain={() => runAnalyze(scanDetails.username, "scan")}
                  onClear={clearScanSnapshot}
                  runAgainLabel="Run this scan again"
                  showProjectsTab={false}
                />
              ) : (
                <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-300">
                  Start a scan to populate this dashboard.
                </div>
              )}
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
