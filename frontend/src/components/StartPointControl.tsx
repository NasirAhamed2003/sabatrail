import { useStartPoint } from "../lib/startPoint";

// "Distances from: Hemmathagama town centre · Use my location (fixed)"
export default function StartPointControl({ prefix = "Distances from" }: { prefix?: string }) {
  const { start, chooseDeviceLocation, chooseTownCentre } = useStartPoint();

  return (
    <div className="start-point" aria-live="polite">
      <span className="start-point-label">
        {prefix} <strong>{start.label}</strong>
      </span>

      {start.kind === "town" ? (
        <button
          type="button"
          className="link-button"
          onClick={chooseDeviceLocation}
        >
          Use my location
        </button>
      ) : (
        <button type="button" className="link-button" onClick={chooseTownCentre}>
          Use town centre
        </button>
      )}
    </div>
  );
}
