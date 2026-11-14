import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { refresh } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!username || !email || !password) {
      setError("Fill all fields");
      return;
    }

    try {
      const res = await api("/api/auth/register", {
        method: "POST",
        auth: false,
        body: { username, email, password },
      });

      if (!res.ok) {
        setError((await res.text()) || "Registration failed");
        return;
      }

      const data = await res.json();
      localStorage.setItem("token", data.token);
      await refresh();
      navigate("/");
    } catch {
      setError("Server error");
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Register</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">Register</button>
        </form>

        <p className="auth-error">{error}</p>
      </div>
    </div>
  );
}
