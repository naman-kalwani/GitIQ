import React, { useState } from "react";
import api from "../api.js";
import UsernameForm from "./UsernameForm.jsx";

function Analyze() {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");

  const fetchDetails = async (user) => {
    setUsername(user);
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/analyze/${user}`);
      setDetails(response.data);
    } catch (error) {
      console.error("Error fetching details : ", error);
      setError(
        error.response?.data?.detail || "Failed to fetch analysis data.",
      );
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
            Results for {details.username}
          </h2>
          <div className="mt-4 grid gap-3 text-sm text-gray-200">
            <p>Total repos: {details.total_repos}</p>
            <p>Total stars: {details.total_stars}</p>
            <p>Top language: {details.top_language}</p>
            <p>
              Top repo: {details.top_repo.name} ({details.top_repo.stars} stars)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Analyze;
