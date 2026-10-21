
import { useState } from "react";
import api from "./api";

interface LoginProps {
  onLoginSuccess: (token: string) => void;
  onBack: () => void;
}

function Login({ onLoginSuccess, onBack }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      const token = response.data.token;

      if (!token) {
        setMessage("Login failed: no token was returned.");
        return;
      }

      localStorage.setItem("sabatrail_token", token);
      onLoginSuccess(token);
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error
      ) {
        const response = (error as {
          response?: { data?: { message?: string } };
        }).response;

        setMessage(response?.data?.message || "Login failed. Please try again.");
      } else {
        setMessage("Unable to connect to the server. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">
        <h1>Welcome to SabaTrail</h1>
        <p>Log in to manage your visit plans.</p>

        <form onSubmit={handleLogin}>
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Enter your email"
            autoComplete="email"
            required
          />

          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />

          {message && <p className="auth-message" role="alert">{message}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Log In"}
          </button>
        </form>

        <button type="button" className="auth-back-button" onClick={onBack}>
          Back to destinations
        </button>
      </section>
    </main>
  );
}

export default Login;
