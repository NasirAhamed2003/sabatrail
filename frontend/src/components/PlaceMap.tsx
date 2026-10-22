import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "./PlaceMap.css";

export interface MapMarker {
  id: string | number;
  latitude: number;
  longitude: number;
  label: string;
  detail?: string;
  kind?: "place" | "start" | "nearby" | "food";
  number?: number;
}

function markerIcon(marker: MapMarker) {
  const kind = marker.kind ?? "place";
  const content = marker.number != null ? String(marker.number) : kind === "start" ? "" : "";

  return L.divIcon({
    className: "map-marker-wrapper",
    html: `<div class="map-marker map-marker-${kind}">${content}</div>`,
    iconSize: kind === "start" ? [18, 18] : [32, 32],
    iconAnchor: kind === "start" ? [9, 9] : [16, 16],
    popupAnchor: [0, -16],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join(";");

  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [32, 32], maxZoom: 15 });
    else if (points.length === 1) map.setView(points[0], 14);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);

  return null;
}

// OpenStreetMap map with numbered stops, an optional order line, and a
// short text alternative for screen readers.
export default function PlaceMap({
  markers,
  line = false,
  label,
  height = "clamp(260px, 45vh, 420px)",
}: {
  markers: MapMarker[];
  line?: boolean;
  label: string;
  height?: string;
}) {
  const points = useMemo<[number, number][]>(
    () => markers.map((m) => [m.latitude, m.longitude]),
    [markers]
  );

  const linePoints = useMemo<[number, number][]>(
    () => markers.filter((m) => m.kind === "start" || m.number != null).map((m) => [m.latitude, m.longitude]),
    [markers]
  );

  if (markers.length === 0) return null;

  return (
    <figure className="place-map" style={{ height }}>
      <MapContainer
        center={points[0]}
        zoom={13}
        scrollWheelZoom={false}
        className="place-map-canvas"
        aria-label={label}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds points={points} />

        {line && linePoints.length > 1 && (
          <Polyline
            positions={linePoints}
            pathOptions={{ color: "#276b4b", weight: 4, opacity: 0.85, dashArray: "8 8" }}
          />
        )}

        {markers.map((marker) => (
          <Marker key={marker.id} position={[marker.latitude, marker.longitude]} icon={markerIcon(marker)}>
            <Popup>
              <strong>{marker.label}</strong>
              {marker.detail && (
                <>
                  <br />
                  {marker.detail}
                </>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <figcaption className="visually-hidden">{label}</figcaption>
    </figure>
  );
}
