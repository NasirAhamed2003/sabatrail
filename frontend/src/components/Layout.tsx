import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router";
import { useAuth } from "../lib/auth";
import { loginPath } from "../lib/routing";
import { usePlans } from "../lib/plans";
import AccountMenu from "./AccountMenu";
import DayTray from "./DayTray";
import Logo from "./Logo";
import "./Layout.css";

// Scroll to #hash targets after navigation, or to the top for new pages
function ScrollManager() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // Effects run after the DOM is committed, so the target exists now
      document.getElementById(hash.slice(1))?.scrollIntoView();
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return null;
}

export default function Layout() {
  const { isLoggedIn } = useAuth();
  const { activePlan } = usePlans();
  const location = useLocation();

  const showTray =
    isLoggedIn &&
    activePlan !== null &&
    !location.pathname.startsWith("/plan") &&
    !location.pathname.startsWith("/admin");
  // The mobile menu is open only for the page it was opened on
  const here = location.pathname + location.hash;
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === here;
  const setMenuOpen = (value: boolean | ((current: boolean) => boolean)) => {
    const next = typeof value === "function" ? value(menuOpen) : value;
    setMenuOpenOn(next ? here : null);
  };

  // Escape closes the mobile menu
  useEffect(() => {
    if (!menuOpen) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen]);

  return (
    <div className={`app-shell${showTray ? " has-tray" : ""}${location.pathname === "/" ? " is-home" : ""}`}>
      <ScrollManager />

      <header className="site-header">
        <div className="site-header-inner container">
          <Logo placement="header" />

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
                <Link to="/#how">How it works</Link>
              </li>
              {isLoggedIn && (
                <li>
                  <NavLink to="/plan">My visit plans</NavLink>
                </li>
              )}
            </ul>

            <div className="site-nav-actions">
              {isLoggedIn ? (
                <AccountMenu />
              ) : (
                <>
                  <Link className="nav-register" to="/register">
                    Create account
                  </Link>
                  <Link
                    className="nav-login"
                    to={location.pathname === "/login" ? "/login" : loginPath(location.pathname)}
                  >
                    Log in
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      </header>

      <main id="main" className="site-main">
        <Outlet />
      </main>

      <DayTray />

      <footer className="site-footer">
        <div className="site-footer-inner container">
          <Logo placement="footer" />
          <p>Plan a day around Hemmathagama.</p>
          <p className="site-footer-note">Hemmathagama, Sri Lanka</p>
        </div>
      </footer>
    </div>
  );
}
