import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import api from "../api";
import Alert from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import Card from "../components/ui/Card";
import Field from "../components/ui/Field";
import { useAuth, type AuthUser } from "../lib/auth";
import { apiErrorMessage } from "../lib/errors";
import { safeNext } from "../lib/routing";
import "./AuthPages.css";

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await api.post<{ token?: string; user?: AuthUser }>("/auth/login", {
        email,
        password,
      });

      const { token, user } = response.data;

      if (!token || !user) {
        setMessage("Login failed: no token was returned.");
        return;
      }

      login(token, user);
      navigate(next, { replace: true });
    } catch (error: unknown) {
      setMessage(apiErrorMessage(error, "Login failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Card as="section" className="auth-card" aria-labelledby="login-heading">
        <h1 id="login-heading">Welcome back</h1>
        <p className="auth-intro">Log in to see and edit your visit plans.</p>

        <form className="auth-form" onSubmit={handleLogin}>
          <Field id="login-email" label="Email address">
            <input
              className="input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </Field>

          <Field id="login-password" label="Password">
            <input
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>

          {message && <Alert tone="error">{message}</Alert>}

          <Button type="submit" size="lg" block disabled={loading}>
            {loading ? "Logging in…" : "Log in"}
          </Button>
        </form>

        <p className="auth-switch">
          New here?{" "}
          <Link to={`/register${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link>
        </p>
      </Card>
    </div>
  );
}

export default LoginPage;
