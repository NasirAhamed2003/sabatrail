import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import api from "../api";
import Alert from "../components/ui/Alert";
import { Button } from "../components/ui/Button";
import Card from "../components/ui/Card";
import Field from "../components/ui/Field";
import { useAuth, type AuthUser } from "../lib/auth";
import { apiErrorMessage, apiFieldErrors } from "../lib/errors";
import { safeNext } from "../lib/routing";
import "./AuthPages.css";

type FieldName = "name" | "email" | "password" | "confirm";

// Same rules as the API (backend/Src/validation.ts registerSchema)
function validate(values: Record<FieldName, string>) {
  const errors: Partial<Record<FieldName, string>> = {};

  if (!values.name.trim()) errors.name = "Enter your name.";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Enter a valid email address, like name@example.com.";
  }

  if (values.password.length < 8) {
    errors.password = "Use at least 8 characters.";
  } else if (!/[A-Za-z]/.test(values.password) || !/\d/.test(values.password)) {
    errors.password = "Include at least one letter and one number.";
  }

  if (values.confirm !== values.password) {
    errors.confirm = "Passwords don't match.";
  }

  return errors;
}

export default function RegisterPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [values, setValues] = useState<Record<FieldName, string>>({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (field: FieldName, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    const found = validate(values);
    setErrors(found);

    if (Object.keys(found).length > 0) {
      const first = Object.keys(found)[0];
      document.getElementById(`register-${first}`)?.focus();
      return;
    }

    setSaving(true);

    try {
      await api.post("/auth/register", {
        name: values.name.trim(),
        email: values.email.trim(),
        password: values.password,
      });

      // Sign straight in so the visitor can start planning
      const response = await api.post<{ token: string; user: AuthUser }>("/auth/login", {
        email: values.email.trim(),
        password: values.password,
      });

      login(response.data.token, response.data.user);
      navigate(next, { replace: true });
    } catch (error) {
      setErrors(apiFieldErrors(error) as Partial<Record<FieldName, string>>);
      setMessage(apiErrorMessage(error, "We couldn't create your account. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="auth-page">
      <Card as="section" className="auth-card" aria-labelledby="register-heading">
        <h1 id="register-heading">Create your account</h1>
        <p className="auth-intro">Save visit plans and pick up where you left off on any device.</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <Field id="register-name" label="Name" error={errors.name}>
            <input
              className="input"
              type="text"
              value={values.name}
              onChange={(event) => update("name", event.target.value)}
              autoComplete="name"
              required
            />
          </Field>

          <Field id="register-email" label="Email address" error={errors.email}>
            <input
              className="input"
              type="email"
              value={values.email}
              onChange={(event) => update("email", event.target.value)}
              autoComplete="email"
              required
            />
          </Field>

          <Field
            id="register-password"
            label="Password"
            hint="At least 8 characters, with a letter and a number."
            error={errors.password}
          >
            <input
              className="input"
              type="password"
              value={values.password}
              onChange={(event) => update("password", event.target.value)}
              autoComplete="new-password"
              required
            />
          </Field>

          <Field id="register-confirm" label="Confirm password" error={errors.confirm}>
            <input
              className="input"
              type="password"
              value={values.confirm}
              onChange={(event) => update("confirm", event.target.value)}
              autoComplete="new-password"
              required
            />
          </Field>

          {message && <Alert tone="error">{message}</Alert>}

          <Button type="submit" size="lg" block disabled={saving}>
            {saving ? "Creating account…" : "Create account"}
          </Button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link to={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}>Log in</Link>
        </p>
      </Card>
    </div>
  );
}
