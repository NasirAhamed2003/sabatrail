import { formatKm } from "../lib/format";
import { useStartPoint } from "../lib/startPoint";

// Beyond this accuracy radius the fix is network/IP based, not GPS
const APPROXIMATE_M = 1000;

// "Distances from: Hemmathagama town centre · Use my location"
export default function StartPointControl() {
  const { start, status, chooseDeviceLocation, chooseTownCentre } = useStartPoint();

  return (
    <div className="start-point" aria-live="polite">
      <span className="start-point-label">
        Distances from <strong>{start.label}</strong>
      </span>

      {start.kind === "town" ? (
        <button
          type="button"
          className="link-button"
          onClick={chooseDeviceLocation}
          disabled={status === "locating"}
        >
          {status === "locating" ? "Finding your location…" : "Use my location"}
        </button>
      ) : (
        <button type="button" className="link-button" onClick={chooseTownCentre}>
          Use town centre
        </button>
      )}

      {start.kind === "device" && start.accuracyM != null && start.accuracyM > APPROXIMATE_M && (
        <span className="start-point-note">
          Your browser could only estimate your location (to within about {formatKm(start.accuracyM / 1000)}),
          usually from your internet connection, so these distances may be off. A phone with GPS gives a better fix.
        </span>
      )}
      {status === "denied" && (
        <span className="start-point-note">Location permission was declined, so distances are from the town centre.</span>
      )}
      {status === "unavailable" && (
        <span className="start-point-note">Your location isn't available, so distances are from the town centre.</span>
      )}
    </div>
  );
}
