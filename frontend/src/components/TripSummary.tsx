import { formatDuration, formatKm } from "../lib/format";
import { directionsUrl, routeUrl } from "../lib/geo";
import { useStartPoint } from "../lib/startPoint";
import type { TripEstimate } from "../lib/trip";
import type { Place } from "../lib/types";
import Icon from "./ui/Icon";

// Route guidance for a plan: time at stops, estimated driving time, total
// day estimate, and Google Maps directions for each leg (FR-018/019/041-044).
export default function TripSummary({
  stops,
  estimate,
  showLegs = true,
}: {
  stops: Place[];
  estimate: TripEstimate;
  showLegs?: boolean;
}) {
  const { start } = useStartPoint();

  if (stops.length === 0) return null;

  const travelText =
    estimate.travelStatus === "loading"
      ? "Calculating…"
      : estimate.travelMinutes !== null
        ? `~${formatDuration(estimate.travelMinutes)}`
        : "Travel time unavailable";

  const totalText =
    estimate.totalMinutes !== null
      ? `~${formatDuration(estimate.totalMinutes)}`
      : estimate.travelStatus === "loading"
        ? "Calculating…"
        : "Unavailable";

  const fullRoute = routeUrl(stops, start);

  return (
    <section className="trip-summary" aria-labelledby="trip-heading">
      <h2 id="trip-heading">Your day at a glance</h2>

      <dl className="trip-stats">
        <div>
          <dt>Stops</dt>
          <dd>{estimate.stopCount}</dd>
        </div>
        <div>
          <dt>Time at stops</dt>
          <dd>{estimate.visitMinutes > 0 ? `~${formatDuration(estimate.visitMinutes)}` : "Not set"}</dd>
        </div>
        <div>
          <dt>Driving time</dt>
          <dd>{travelText}</dd>
        </div>
        <div>
          <dt>Total day</dt>
          <dd>{totalText}</dd>
        </div>
      </dl>

      {estimate.stopsWithoutDuration > 0 && (
        <p className="trip-note">
          {estimate.stopsWithoutDuration} {estimate.stopsWithoutDuration === 1 ? "stop has" : "stops have"} no
          suggested visit time, so the time at stops may be higher.
        </p>
      )}

      {showLegs && (
      <ol className="trip-legs">
        {stops.map((place, index) => {
          const leg = estimate.legs[index];
          const from = index === 0 ? start : stops[index - 1];

          return (
            <li key={place.place_id}>
              <span className="trip-leg-route">
                {index === 0 ? (start.kind === "town" ? "Town centre" : "Your location") : stops[index - 1].place_name} → <strong>{place.place_name}</strong>
              </span>
              <span className="trip-leg-time">
                {leg
                  ? `~${formatDuration(leg.minutes)} drive · ${formatKm(leg.km)}`
                  : estimate.travelStatus === "loading"
                    ? "Calculating…"
                    : "Travel time unavailable"}
              </span>
              <a className="trip-leg-link" href={directionsUrl(place, from)} target="_blank" rel="noreferrer">
                Directions
                <span className="visually-hidden"> to {place.place_name} (opens Google Maps in a new tab)</span>
              </a>
            </li>
          );
        })}
      </ol>
      )}

      {fullRoute && (
        <a className="btn btn-secondary trip-full-route" href={fullRoute} target="_blank" rel="noreferrer">
          <Icon name="route" size={18} /> Open the whole day in Google Maps
          <span className="visually-hidden"> (opens in a new tab)</span>
        </a>
      )}

      <p className="trip-disclaimer" role="note">
        <Icon name="info" size={16} />
        <span>
          <strong>Estimates, not guarantees.</strong> Driving times come from OpenStreetMap road data and assume
          normal conditions; traffic, weather, road works and stops along the way can make the day longer. The
          route starts at {start.label} and doesn&apos;t include the trip home.
        </span>
      </p>
    </section>
  );
}
