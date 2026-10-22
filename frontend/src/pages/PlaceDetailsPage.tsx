import { useMemo, useState } from "react";
import { assetUrl } from "../api";
import { Link, useParams } from "react-router";
import AddToDayButton from "../components/AddToDayButton";
import PlaceMap, { type MapMarker } from "../components/PlaceMap";
import StartPointControl from "../components/StartPointControl";
import { ButtonAnchor } from "../components/ui/Button";
import Icon, { type IconName } from "../components/ui/Icon";
import {
  formatDuration,
  formatKm,
  formatOpeningHours,
  parseGuidance,
  splitList,
} from "../lib/format";
import { directionsUrl, haversineKm } from "../lib/geo";
import { usePlaces } from "../lib/places";
import { useStartPoint, type PlaceDistance } from "../lib/startPoint";
import { FOOD_CATEGORY, type Place } from "../lib/types";
import "./PlaceDetailsPage.css";

const NEARBY_RADIUS_KM = 8;
const FOOD_RADIUS_KM = 15;

// Shown when a place has no specific guidance yet
const GENERAL_GUIDANCE = [
  { label: "Carry", text: "water, sun protection and a light rain jacket." },
  { label: "Footwear", text: "comfortable shoes with good grip." },
  { label: "Safety", text: "check opening hours and road conditions before you set off." },
];

function Fact({ icon, label, value }: { icon: IconName; label: string; value: string | null }) {
  if (!value) return null;

  return (
    <div className="fact">
      <Icon name={icon} size={20} />
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function NearbyList({ title, places, origin, emptyText }: {
  title: string;
  places: Place[];
  origin: Place;
  emptyText: string;
}) {
  return (
    <section className="details-section" aria-labelledby={`${title}-heading`.replace(/\s+/g, "-")}>
      <h2 id={`${title}-heading`.replace(/\s+/g, "-")}>{title}</h2>

      {places.length === 0 ? (
        <p className="muted">{emptyText}</p>
      ) : (
        <ul className="nearby-list">
          {places.map((place) => (
            <li key={place.place_id} className="nearby-item">
              <div>
                <Link to={`/places/${place.place_id}`}>{place.place_name}</Link>
                <span>
                  {place.category?.category_name} · {formatKm(haversineKm(origin, place))} away
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

function describeDistance(away: PlaceDistance, from: string) {
  const km = formatKm(away.km);
  if (!km) return null;
  if (!away.road) return `${km} in a straight line from ${from}`;

  return `${km} by road from ${from} (~${formatDuration(away.minutes)} drive)`;
}

export default function PlaceDetailsPage() {
  const { id } = useParams();
  const { places, status } = usePlaces();
  const { start, distanceTo } = useStartPoint();
  const [imageFailed, setImageFailed] = useState(false);

  const place = places.find((p) => p.place_id === Number(id));

  // Other places by straight-line distance from this one (FR-034/035)
  const { nearby, food } = useMemo(() => {
    if (!place) return { nearby: [], food: [] };

    const others = places
      .filter((p) => p.place_id !== place.place_id)
      .map((p) => ({ p, km: haversineKm(place, p) }))
      .sort((a, b) => a.km - b.km);

    return {
      nearby: others
        .filter(({ p, km }) => km <= NEARBY_RADIUS_KM && p.category?.category_name !== FOOD_CATEGORY)
        .slice(0, 4)
        .map(({ p }) => p),
      food: others
        .filter(({ p, km }) => km <= FOOD_RADIUS_KM && p.category?.category_name === FOOD_CATEGORY)
        .slice(0, 3)
        .map(({ p }) => p),
    };
  }, [place, places]);

  if (status === "loading") {
    return (
      <section className="container status-page" role="status">
        <p>Loading destination…</p>
      </section>
    );
  }

  if (status === "error" || !place) {
    return (
      <section className="container status-page">
        <h1>{status === "error" ? "Couldn't load this destination" : "Destination not found"}</h1>
        <p>
          {status === "error"
            ? "We couldn't reach SabaTrail. Check your connection and try again."
            : "It may have been removed or the link may be wrong."}
        </p>
        <Link to="/#explore">Back to destinations</Link>
      </section>
    );
  }

  const guidance = parseGuidance(place.before_you_go);
  const suitability = splitList(place.suitability);
  const category = place.category?.category_name;

  const markers: MapMarker[] = [
    { id: "start", latitude: start.latitude, longitude: start.longitude, label: `Start: ${start.label}`, kind: "start" },
    { id: place.place_id, latitude: place.latitude, longitude: place.longitude, label: place.place_name, detail: place.address ?? undefined, number: 1 },
    ...nearby.map((p) => ({ id: p.place_id, latitude: p.latitude, longitude: p.longitude, label: p.place_name, detail: "Nearby", kind: "nearby" as const })),
    ...food.map((p) => ({ id: p.place_id, latitude: p.latitude, longitude: p.longitude, label: p.place_name, detail: "Food stop", kind: "food" as const })),
  ];

  return (
    <article className="place-details">
      <div className="container">
        <Link className="back-link" to="/#explore">
          ← All destinations
        </Link>

        <header className="details-hero">
          <figure className="details-photo">
            {place.image && !imageFailed ? (
              <img src={assetUrl(place.image)} alt={place.place_name} onError={() => setImageFailed(true)} />
            ) : (
              <div className="details-photo-placeholder" aria-hidden="true">
                {category ?? "SabaTrail"}
              </div>
            )}
            {place.image && !imageFailed && place.image_credit && (
              <figcaption>Photo: {place.image_credit}</figcaption>
            )}
          </figure>

          <div className="details-intro">
            {category && <span className="chip">{category}</span>}
            <h1>{place.place_name}</h1>
            {place.address && (
              <p className="details-address">
                <Icon name="pin" size={18} /> {place.address}
              </p>
            )}

            <div className="details-actions">
              <AddToDayButton place={place} size="lg" />
              <ButtonAnchor href={directionsUrl(place)} size="lg">
                <Icon name="car" size={18} /> Get directions
              </ButtonAnchor>
            </div>

            <dl className="facts">
              <Fact icon="pin" label="Distance" value={describeDistance(distanceTo(place), start.label)} />
              <Fact icon="clock" label="Time to spend" value={formatDuration(place.visit_duration_minutes)} />
              <Fact icon="door" label="Opening hours" value={formatOpeningHours(place.opening_time, place.closing_time) ?? "Check locally"} />
              <Fact icon="sun" label="Best time" value={place.best_time_to_visit ?? null} />
            </dl>

            <StartPointControl />
            <p className="estimate-note">
              Road distances and driving times come from OpenStreetMap and assume normal traffic. Hours and
              durations are a guide, not a guarantee.
            </p>
          </div>
        </header>

        <div className="details-columns">
          <div className="details-main">
            {place.description && (
              <section className="details-section">
                <h2>About</h2>
                <p>{place.description}</p>
              </section>
            )}

            <section className="details-section before-you-go" aria-labelledby="before-heading">
              <h2 id="before-heading">Before you go</h2>
              <ul>
                {(guidance.length > 0 ? guidance : GENERAL_GUIDANCE).map((item, index) => (
                  <li key={index}>
                    {item.label && <strong>{item.label}: </strong>}
                    {item.text}
                  </li>
                ))}
              </ul>
              {guidance.length === 0 && <p className="muted">General advice: this place has no specific guidance yet.</p>}
            </section>

            {suitability.length > 0 && (
              <section className="details-section">
                <h2>Good for</h2>
                <ul className="chip-list">
                  {suitability.map((tag) => (
                    <li key={tag} className="chip">
                      {tag}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {place.facilities && (
              <section className="details-section">
                <h2>Facilities</h2>
                <p>{place.facilities}</p>
              </section>
            )}

            {place.travel_tips && (
              <section className="details-section">
                <h2>Travel tips</h2>
                <p>{place.travel_tips}</p>
              </section>
            )}
          </div>

          <aside className="details-side">
            <section className="details-section" aria-labelledby="map-heading">
              <h2 id="map-heading">Location</h2>
              <PlaceMap
                markers={markers}
                label={`Map showing ${place.place_name}, the start point, and nearby places`}
                height="320px"
              />
              <p className="map-legend">
                <span className="legend-dot legend-place" /> This place
                <span className="legend-dot legend-start" /> Start
                <span className="legend-dot legend-nearby" /> Nearby
                <span className="legend-dot legend-food" /> Food
              </p>
            </section>

            <NearbyList
              title="Nearby places"
              places={nearby}
              origin={place}
              emptyText={`No other places within ${NEARBY_RADIUS_KM} km.`}
            />

            <NearbyList
              title="Food stops nearby"
              places={food}
              origin={place}
              emptyText={`No restaurants listed within ${FOOD_RADIUS_KM} km.`}
            />
          </aside>
        </div>
      </div>
    </article>
  );
}
