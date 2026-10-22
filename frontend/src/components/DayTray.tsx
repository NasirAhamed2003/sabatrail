import { Link, useLocation } from "react-router";
import { useAuth } from "../lib/auth";
import { formatDate, formatDuration } from "../lib/format";
import { usePlans } from "../lib/plans";
import type { PlanStop } from "../lib/types";
import { ButtonLink } from "./ui/Button";
import Icon from "./ui/Icon";
import "./DayTray.css";

// "3 stops · ~3 h 50 min at stops · 09:00–12:30"
function summarize(stops: PlanStop[]) {
  const minutes = stops.reduce((sum, stop) => sum + (stop.place.visit_duration_minutes ?? 0), 0);

  const times = stops
    .map((stop) => stop.planned_time?.slice(0, 5))
    .filter((time): time is string => Boolean(time))
    .sort();

  const timeWindow = times.length > 0 ? `${times[0]}–${times[times.length - 1]}` : null;

  return [
    `${stops.length} ${stops.length === 1 ? "stop" : "stops"}`,
    minutes > 0 ? `~${formatDuration(minutes)} at stops` : null,
    timeWindow,
  ]
    .filter(Boolean)
    .join(" · ");
}

// Persistent "Your day" bar. Hidden on the planner itself and in the admin area.
export default function DayTray() {
  const { isLoggedIn } = useAuth();
  const { activePlan, activeStops } = usePlans();
  const { pathname } = useLocation();

  if (!isLoggedIn || !activePlan) return null;
  if (pathname.startsWith("/plan") || pathname.startsWith("/admin")) return null;

  return (
    <aside className="day-tray" aria-label="Your day">
      <Link to={`/plan/${activePlan.plan_id}`} className="day-tray-link container">
        <span className="day-tray-icon" aria-hidden="true">
          <Icon name="route" size={20} />
        </span>
        <span className="day-tray-text">
          <strong>{activePlan.plan_name}</strong>
          <span>{activeStops.length === 0 ? "No stops yet — add places to start your day" : summarize(activeStops)}</span>
        </span>
        <span className="day-tray-cta">View plan</span>
      </Link>
    </aside>
  );
}

// The same information as a right-hand rail beside the catalogue (desktop)
export function DayRail() {
  const { isLoggedIn } = useAuth();
  const { activePlan, activeStops } = usePlans();

  if (!isLoggedIn) {
    return (
      <aside className="day-rail" aria-label="Your day">
        <h2>Plan your day</h2>
        <p className="day-rail-meta">
          Add places as you browse. SabaTrail keeps them in order with times, directions and an estimate for the whole
          day.
        </p>
        <ButtonLink to="/register" block>
          Create a free account
        </ButtonLink>
        <ButtonLink to="/login" variant="ghost" block>
          Log in
        </ButtonLink>
      </aside>
    );
  }

  if (!activePlan) {
    return (
      <aside className="day-rail" aria-label="Your day">
        <h2>Your day</h2>
        <p className="day-rail-meta">Choose “Add to my day” on any place to start a plan.</p>
      </aside>
    );
  }

  return (
    <aside className="day-rail" aria-label="Your day">
      <div>
        <h2>{activePlan.plan_name}</h2>
        <p className="day-rail-meta">{formatDate(activePlan.visit_date)}</p>
      </div>

      {activeStops.length === 0 ? (
        <p className="day-rail-meta">No stops yet. Choose “Add to my day” on any place.</p>
      ) : (
        <>
          <ol>
            {activeStops.map((stop) => (
              <li key={stop.plan_place_id}>
                <Link to={`/places/${stop.place_id}`}>{stop.place.place_name}</Link>
              </li>
            ))}
          </ol>
          <p className="day-rail-meta">{summarize(activeStops)}</p>
        </>
      )}

      <ButtonLink to={`/plan/${activePlan.plan_id}`} variant="secondary" block>
        View plan and route
      </ButtonLink>
    </aside>
  );
}
