import React, { useState } from "react";
import axios from "axios";
import api from "../api.js";
import UsernameForm from "./UsernameForm.jsx";

function Analyze() {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");

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

  const fetchDetails = async (user) => {
    if (!user) {
      setError("Please enter a valid GitHub username.");
      setDetails(null);
      return;
    }

    setUsername(user);
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/analyze/${user}`);
      setDetails(response.data);
    } catch (error) {
      console.error("Error fetching details : ", error);
      setError(toErrorMessage(error, user));
      setDetails(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl">
      <UsernameForm getUser={fetchDetails} />

      {loading && <p className="mt-4 text-gray-300">Analyzing {username}...</p>}

      {error && <p className="mt-4 text-red-400">{error}</p>}

      {details && !loading && !error && (
        <div className="mt-6 rounded-lg border border-gray-700 bg-gray-800 p-4 text-left">
          <h2 className="text-xl font-semibold">
            Results for : {details.username}
          </h2>
          <div className="mt-4 grid gap-3 text-sm text-gray-200">
            <p>📦 Total repos: {details.total_repos}</p>
            <p>⭐ Total stars: {details.total_stars}</p>
            <p>
              💻 Top languages:{" "}
              {details.top_languages.map(([lang]) => `${lang}`).join(", ")}
            </p>
            <p>
              🧭 Recent event types:{" "}
              {details.top_events?.map(([type]) => type).join(", ") || "None"}
            </p>
            <p>📊 Activity level: {details.activity_level || "unknown"}</p>
            <p>🗂️ Recent events count: {details.total_events ?? 0}</p>
            <p>📁 Repos touched in events: {details.active_event_repos ?? 0}</p>
            <p>
              🏢 Org experience: {details.has_org_experience ? "Yes" : "No"}
            </p>
            <p>
              🏆 Top repo: {details.top_repo.name} ({details.top_repo.stars}{" "}
              stars)
            </p>
            <div>
              <p>🏷️ Top topics:</p>
              <ul className="list-disc list-inside">
                {details.top_topics.map(([topic, count], index) => (
                  <li key={index}>
                    {topic} ({count})
                  </li>
                ))}
              </ul>
            </div>
            <p>🔀 Fork signal: {details.fork_signal}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Analyze;
