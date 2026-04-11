import { useState } from "react";

const UsernameForm = ({ getUser, submitLabel = "Analyze" }) => {
  const [username, setUsername] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    if (username.trim() !== "" && getUser) {
      getUser(username.trim());
      setUsername("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
      <input
        type="text"
        placeholder="github_username"
        value={username}
        className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-slate-100 placeholder:text-slate-500 focus:border-cyan-400/70 focus:outline-none"
        onChange={(e) => setUsername(e.target.value)}
      />

      <button
        type="submit"
        className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 sm:w-auto"
      >
        {submitLabel}
      </button>
    </form>
  );
};

export default UsernameForm;
