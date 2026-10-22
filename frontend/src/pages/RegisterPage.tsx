import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import api from "../api";
import { useAuth, type AuthUser } from "../lib/auth";
import { apiErrorMessage, apiFieldErrors } from "../lib/errors";
import { safeNext } from "../lib/routing";

type Field = "name" | "email" | "password" | "confirm";

// Same rules as the API (backend/Src/validation.ts registerSchema)
function validate(values: Record<Field, string>) {
  const errors: Partial<Record<Field, string>> = {};

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

  const [values, setValues] = useState<Record<Field, string>>({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const update = (field: Field, value: string) => {
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
      setErrors(apiFieldErrors(error) as Partial<Record<Field, string>>);
      setMessage(apiErrorMessage(error, "We couldn't create your account. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const fieldProps = (field: Field) => ({
    id: `register-${field}`,
    value: values[field],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => update(field, event.target.value),
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `register-${field}-error` : undefined,
  });

  const fieldError = (field: Field) =>
    errors[field] ? (
      <p className="field-error" id={`register-${field}-error`}>
        {errors[field]}
      </p>
    ) : null;

  return (
    <div className="auth-page">
      <section className="auth-card">
        <h1>Create your account</h1>
        <p>Save visit plans and pick up where you left off on any device.</p>

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="register-name">Name</label>
          <input {...fieldProps("name")} type="text" autoComplete="name" required />
          {fieldError("name")}

          <label htmlFor="register-email">Email address</label>
          <input {...fieldProps("email")} type="email" autoComplete="email" required />
          {fieldError("email")}

          <label htmlFor="register-password">Password</label>
          <input {...fieldProps("password")} type="password" autoComplete="new-password" required />
          {fieldError("password") ?? (
            <p className="field-hint">At least 8 characters, with a letter and a number.</p>
          )}

          <label htmlFor="register-confirm">Confirm password</label>
          <input {...fieldProps("confirm")} type="password" autoComplete="new-password" required />
          {fieldError("confirm")}

          {message && <p className="auth-message" role="alert">{message}</p>}

          <button type="submit" disabled={saving}>
            {saving ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link to={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}>Log in</Link>
        </p>
      </section>
    </div>
  );
}
