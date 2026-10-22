import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import api, { SESSION_EXPIRED_EVENT } from "../api";

const TOKEN_KEY = "sabatrail_token";
const USER_KEY = "sabatrail_user";

export interface AuthUser {
  user_id: number;
  role: "USER" | "ADMIN";
  name?: string;
  email?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function safeGet(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

// Read the JWT payload for display only. The backend verifies every
// protected request; this just decides what the interface shows.
function readTokenPayload(token: string): { user_id: number; role: AuthUser["role"]; exp?: number } | null {
  try {
    const part = token.split(".")[1];
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded));

    if (typeof payload.user_id !== "number" || typeof payload.role !== "string") return null;
    if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

function loadSession(): AuthUser | null {
  const token = safeGet(TOKEN_KEY);
  if (!token) return null;

  const payload = readTokenPayload(token);

  if (!payload) {
    clearSession();
    return null;
  }

  const profile: Partial<AuthUser> = (() => {
    try {
      return JSON.parse(safeGet(USER_KEY) ?? "{}");
    } catch {
      return {};
    }
  })();

  return {
    user_id: payload.user_id,
    role: payload.role,
    name: profile.user_id === payload.user_id ? profile.name : undefined,
    email: profile.user_id === payload.user_id ? profile.email : undefined,
  };
}

function clearSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // Storage unavailable: nothing to clear
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadSession);

  const login = useCallback((token: string, profile: AuthUser) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(profile));
    } catch {
      // Storage unavailable: the session lasts until the page reloads
    }

    setUser(profile);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
  }, []);

  // End the session when the API rejects the stored token
  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, logout);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, logout);
  }, [logout]);

  // Sessions saved before profiles were stored only know the user ID
  const needsProfile = user !== null && !user.name;

  useEffect(() => {
    if (!needsProfile) return;

    api
      .get<{ user: AuthUser }>("/auth/me")
      .then((response) => {
        const profile = response.data.user;

        try {
          localStorage.setItem(USER_KEY, JSON.stringify(profile));
        } catch {
          // Storage unavailable: keep the profile in memory only
        }

        setUser(profile);
      })
      .catch(() => {
        // A 401 is handled by the session-expired event; other errors just
        // leave the name unknown
      });
  }, [needsProfile]);

  const value = useMemo(
    () => ({
      user,
      isLoggedIn: user !== null,
      isAdmin: user?.role === "ADMIN",
      login,
      logout,
    }),
    [user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
