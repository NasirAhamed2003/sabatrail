import { startTransition, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "../lib/auth";

// Signed-in visitor's menu: name, My visit plans, Admin (admins only), Log out.
// On small screens it's shown expanded inside the navigation sheet.
export default function AccountMenu() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;

    const onPointer = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        wrapperRef.current?.querySelector<HTMLButtonElement>(".account-button")?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;

  const displayName = user.name || "My account";
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  // Navigation runs as a transition, so the logout is put in the same
  // transition; otherwise a protected page would redirect to login first.
  const handleLogout = () => {
    setOpen(false);
    startTransition(() => {
      navigate("/", { replace: true });
      logout();
    });
  };

  return (
    <div className={`account${open ? " is-open" : ""}`} ref={wrapperRef}>
      <button
        type="button"
        className="account-button"
        aria-expanded={open}
        aria-controls="account-panel"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="account-avatar" aria-hidden="true">{initial}</span>
        <span className="account-name">{displayName}</span>
        <span className="account-caret" aria-hidden="true" />
      </button>

      <div id="account-panel" className="account-panel">
        <div className="account-identity">
          <strong>{displayName}</strong>
          {user.email && <span>{user.email}</span>}
        </div>

        <ul>
          <li>
            <Link to="/plan">My visit plans</Link>
          </li>
          {isAdmin && (
            <li>
              <Link to="/admin">Admin dashboard</Link>
            </li>
          )}
          <li>
            <button type="button" className="account-logout" onClick={handleLogout}>
              Log out
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}
