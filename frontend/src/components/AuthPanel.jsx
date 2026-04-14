function AuthPanel({
  session,
  onSignIn,
  onSignOut,
  isBusy,
  authError,
  detectedUsername,
}) {
  const email = session?.user?.email;

  return (
    <section className="grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="grid gap-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-300">
          Access
        </p>
        <h2 className="text-xl font-semibold text-white">Login / Signup</h2>
      </div>

      <p className="text-sm text-slate-400">
        Continue with GitHub once. GitIQ will auto-detect your username and sync
        your profile to Supabase. Then click "Analyze" to start analysis.
      </p>

      {session ? (
        <div className="grid gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              Signed in as{" "}
              <strong>{detectedUsername || email || "GitHub user"}</strong>
            </span>
            <button
              type="button"
              onClick={onSignOut}
              disabled={isBusy}
              className="rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sign out
            </button>
          </div>
          <span className="text-emerald-100/90">
            Username is synced to analysis automatically.
          </span>
        </div>
      ) : (
        <button
          type="button"
          onClick={onSignIn}
          disabled={isBusy}
          className="inline-flex w-fit items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span aria-hidden="true">↗</span>
          Continue with GitHub
        </button>
      )}

      {authError && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {authError}
        </div>
      )}
    </section>
  );
}

export default AuthPanel;
