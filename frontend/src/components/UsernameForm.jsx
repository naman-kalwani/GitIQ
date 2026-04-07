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
    <form onSubmit={handleSubmit} className="username-form">
      <input
        type="text"
        placeholder="github_username"
        value={username}
        className="username-input"
        onChange={(e) => setUsername(e.target.value)}
      />

      <button className="username-button" type="submit">
        {submitLabel}
      </button>
    </form>
  );
};

export default UsernameForm;
