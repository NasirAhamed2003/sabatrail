import { Link } from "react-router";
import { formatKm } from "../lib/format";
import { haversineKm } from "../lib/geo";
import { FOOD_CATEGORY, type Place } from "../lib/types";
import AddToDayButton from "./AddToDayButton";
import Icon from "./ui/Icon";

const MAX_KM = 15;

// Restaurants/Dining places closest to any stop in the plan (FR-036/037)
export default function FoodStops({ stops, places }: { stops: Place[]; places: Place[] }) {
  if (stops.length === 0) return null;

  const inPlan = new Set(stops.map((stop) => stop.place_id));
  const hasFoodStop = stops.some((stop) => stop.category?.category_name === FOOD_CATEGORY);

  const suggestions = places
    .filter((place) => place.category?.category_name === FOOD_CATEGORY && !inPlan.has(place.place_id))
    .map((place) => {
      const nearest = stops
        .map((stop) => ({ stop, km: haversineKm(stop, place) }))
        .sort((a, b) => a.km - b.km)[0];

      return { place, ...nearest };
    })
    .filter(({ km }) => km <= MAX_KM)
    .sort((a, b) => a.km - b.km)
    .slice(0, 3);

  return (
    <section className="food-stops" aria-labelledby="food-heading">
      <h3 id="food-heading">
        <Icon name="food" size={20} /> Food stops for your day
      </h3>

      <p className="muted">
        {hasFoodStop
          ? "Your day already includes a food stop. Other places to eat near your stops:"
          : "Your day has no food stop yet. Places to eat near your stops:"}
      </p>

      {suggestions.length === 0 ? (
        <p className="muted">No restaurants are listed within {MAX_KM} km of your stops.</p>
      ) : (
        <ul className="nearby-list">
          {suggestions.map(({ place, stop, km }) => (
            <li key={place.place_id} className="nearby-item">
              <div>
                <Link to={`/places/${place.place_id}`}>{place.place_name}</Link>
                <span>
                  {formatKm(km)} from {stop.place_name}
                </span>
              </div>
              <AddToDayButton place={place} size="sm" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
