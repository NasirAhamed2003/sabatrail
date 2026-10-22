import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { HEMMATHAGAMA } from "../lib/geo";
import "./PlaceMap.css";

const pinIcon = L.divIcon({
  className: "map-marker-wrapper",
  html: '<div class="map-marker"></div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const townIcon = L.divIcon({
  className: "map-marker-wrapper",
  html: '<div class="map-marker map-marker-start"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function ClickToPlace({ onPick }: { onPick: (latitude: number, longitude: number) => void }) {
  useMapEvents({
    click(event) {
      onPick(Number(event.latlng.lat.toFixed(5)), Number(event.latlng.lng.toFixed(5)));
    },
  });

  return null;
}

function Recenter({ point }: { point: [number, number] | null }) {
  const map = useMap();
  const key = point ? point.join(",") : "";

  useEffect(() => {
    if (point) map.panTo(point);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);

  return null;
}

// Click the map to set a place's coordinates. The latitude/longitude fields
// next to it remain the keyboard-accessible way to enter them.
export default function LocationPicker({
  latitude,
  longitude,
  onPick,
}: {
  latitude: number | null;
  longitude: number | null;
  onPick: (latitude: number, longitude: number) => void;
}) {
  const point: [number, number] | null =
    latitude !== null && longitude !== null ? [latitude, longitude] : null;

  return (
    <div className="place-map location-picker">
      <MapContainer
        center={point ?? [HEMMATHAGAMA.latitude, HEMMATHAGAMA.longitude]}
        zoom={11}
        scrollWheelZoom={false}
        className="place-map-canvas"
        aria-label="Map: click to set the place's location"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickToPlace onPick={onPick} />
        <Recenter point={point} />
        <Marker position={[HEMMATHAGAMA.latitude, HEMMATHAGAMA.longitude]} icon={townIcon} />
        {point && <Marker position={point} icon={pinIcon} />}
      </MapContainer>
    </div>
  );
}
