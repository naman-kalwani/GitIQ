import React from 'react'
import { useState } from "react";

const UsernameForm = ({ getUser }) => {
  const [username, setUsername] = useState("");
  const handleSubmit = (event) => {
    event.preventDefault();
    if (username.trim() !== '' && getUser) {
      getUser(username.trim());
      setUsername('');
    }
  }
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Enter GitHub username"
        value={username}
        className="bg-gray-700 border-2 border-gray-500 px-2 py-2 mt-4 "
        onChange={(e) => setUsername(e.target.value)}
      />

      <button
        className="border-2 border-gray-500 px-4 py-2 hover:bg-gray-700"
        type='submit'
      >
        Analyze
      </button>
    </form>
  );
}

export default UsernameForm
