import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Fill all fields");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Invalid email format");
      return;
    }

    try {
      const res = await api("/api/auth/login", {
        method: "POST",
        auth: false,
        body: { email: trimmedEmail, password },
      });

      setEmail("");
      setPassword("");

      if (!res.ok) {
        setError((await res.text()) || "Invalid email or password");
        return;
      }

      const data = await res.json();
      localStorage.setItem("token", data.token);
      await refresh();
      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      setError("Server error. Please try again.");
      setEmail("");
      setPassword("");
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login</h2>

        <form onSubmit={handleSubmit} autoComplete="off">
          <input
            name="email"
            type="email"
            placeholder="Email"
            autoComplete="new-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">Login</button>
        </form>

        <p className="auth-error">{error}</p>

        <p className="auth-link">
          Don't have an account? <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}
