import { Link } from "react-router";

export default function NotFoundPage() {
  return (
    <section className="container status-page">
      <h1>Page not found</h1>
      <p>The page you were looking for doesn't exist or has moved.</p>
      <Link to="/">Back to destinations</Link>
    </section>
  );
}
