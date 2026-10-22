import { useState } from "react";
import { assetUrl } from "../api";
import { Link } from "react-router";
import { formatDuration, formatKm, formatOpeningHours } from "../lib/format";
import { useStartPoint } from "../lib/startPoint";
import type { Place } from "../lib/types";
import AddToDayButton from "./AddToDayButton";
import Icon from "./ui/Icon";
import "./PlaceCard.css";

// Compact catalogue card: photo, category, name, short summary, key facts,
// and the "Add to my day" action. Full details live on /places/:id.
export default function PlaceCard({ place }: { place: Place }) {
  const { distanceTo, start } = useStartPoint();
  const [imageFailed, setImageFailed] = useState(false);

  const away = distanceTo(place);
  const distance = formatKm(away.km);
  const drive = away.minutes != null ? formatDuration(away.minutes) : null;
  const duration = formatDuration(place.visit_duration_minutes);
  const hours = formatOpeningHours(place.opening_time, place.closing_time);
  const category = place.category?.category_name;

  return (
    <article className="place-tile">
      <Link to={`/places/${place.place_id}`} className="place-tile-media" tabIndex={-1} aria-hidden="true">
        {place.image && !imageFailed ? (
          <img src={assetUrl(place.image)} alt="" loading="lazy" onError={() => setImageFailed(true)} />
        ) : (
          <span className="place-tile-placeholder">{category ?? "SabaTrail"}</span>
        )}
      </Link>

      <div className="place-tile-body">
        {category && <span className="chip">{category}</span>}

        <h3>
          <Link to={`/places/${place.place_id}`}>{place.place_name}</Link>
        </h3>

        {place.description && <p className="place-tile-summary">{place.description}</p>}

        <ul className="place-tile-facts">
          {distance && (
            <li title={away.road ? `Road distance from ${start.label}` : `Straight-line distance from ${start.label}`}>
              <Icon name="pin" size={16} /> {distance}
              {drive && <> · {drive} drive</>}
              <span className="visually-hidden">
                {away.road ? " by road" : " in a straight line"} from {start.label}
              </span>
            </li>
          )}
          {duration && (
            <li>
              <Icon name="clock" size={16} /> {duration}
              <span className="visually-hidden"> visit</span>
            </li>
          )}
          {hours && (
            <li>
              <Icon name="door" size={16} /> {hours}
            </li>
          )}
        </ul>

        <div className="place-tile-actions">
          <AddToDayButton place={place} size="sm" />
          <Link className="place-tile-more" to={`/places/${place.place_id}`}>
            Details<span className="visually-hidden"> about {place.place_name}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
