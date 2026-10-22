import { useStartPoint } from "../lib/startPoint";

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

      {status === "denied" && (
        <span className="start-point-note">Location permission was declined, so distances are from the town centre.</span>
      )}
      {status === "unavailable" && (
        <span className="start-point-note">Your location isn't available, so distances are from the town centre.</span>
      )}
    </div>
  );
}
