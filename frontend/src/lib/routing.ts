// Only allow redirects to pages inside this app (no external or protocol-relative URLs)
export function safeNext(next: string | null | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

// Login link that returns the visitor to where they were
export function loginPath(returnTo: string) {
  return `/login?next=${encodeURIComponent(returnTo)}`;
}
