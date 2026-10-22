import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useAuth } from "../lib/auth";
import "./Layout.css";

// Scroll to #hash targets after navigation, or to the top for new pages
function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // Wait a frame so the target section has rendered
      requestAnimationFrame(() => {
        document.getElementById(hash.slice(1))?.scrollIntoView();
      });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return null;
}

function Brand() {
  return (
    <Link className="brand" to="/">
      <span className="brand-icon" aria-hidden="true">S</span>
      <span>SabaTrail</span>
    </Link>
  );
}

export default function Layout() {
  const { isLoggedIn, isAdmin } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu whenever the route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  // Escape closes the mobile menu
  useEffect(() => {
    if (!menuOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div className="app-shell">
      <ScrollManager />

      <header className="site-header">
        <div className="site-header-inner container">
          <Brand />

          <button
            type="button"
            className="menu-button"
            aria-expanded={menuOpen}
            aria-controls="site-nav"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="menu-icon" aria-hidden="true" />
            <span className="visually-hidden">{menuOpen ? "Close menu" : "Open menu"}</span>
          </button>

          <nav
            id="site-nav"
            className={`site-nav${menuOpen ? " is-open" : ""}`}
            aria-label="Main"
          >
            <ul className="site-nav-links">
              <li>
                <NavLink to="/" end>
                  Home
                </NavLink>
              </li>
              <li>
                <Link to="/#explore">Explore places</Link>
              </li>
              <li>
                <Link to="/#about">About</Link>
              </li>
              {isLoggedIn && (
                <li>
                  <NavLink to="/plan">My visit plans</NavLink>
                </li>
              )}
              {isAdmin && (
                <li>
                  <NavLink to="/admin">Admin</NavLink>
                </li>
              )}
            </ul>

            {!isLoggedIn && (
              <div className="site-nav-actions">
                <Link
                  className="nav-login"
                  to={`/login?next=${encodeURIComponent(location.pathname)}`}
                >
                  Log in
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main id="main" className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="site-footer-inner container">
          <Brand />
          <p>Plan a day around Hemmathagama.</p>
          <p className="site-footer-note">Hemmathagama, Sri Lanka</p>
        </div>
      </footer>
    </div>
  );
}
