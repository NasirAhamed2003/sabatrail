import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { FIXED_LOCATION, HEMMATHAGAMA, hasCoordinates, haversineKm, type LatLng } from "./geo";
import { usePlaces } from "./places";
import { useRoadDistances, type TravelStatus } from "./travel";
import type { Place } from "./types";

// Where distances and the day plan start from: the town centre by default, or
// the visitor's own location if they choose to share it. The device location
// is rounded to about 100 m, kept in this tab's session storage so it survives
// a refresh, and is never sent to the SabaTrail API (only to the routing
// service, see travel.ts).

export interface StartPoint extends LatLng {
  kind: "town" | "device";
  label: string;
  accuracyM?: number; // device only: browser-reported accuracy radius in metres
}

export interface PlaceDistance {
  km: number;
  minutes: number | null; // driving time; null for a straight-line fallback
  road: boolean;
}

const TOWN: StartPoint = { ...HEMMATHAGAMA, kind: "town", label: "Hemmathagama town centre" };
const STORAGE_KEY = "sabatrail.startPoint";

type LocateStatus = "idle" | "denied" | "unavailable";

interface StartPointContextValue {
  start: StartPoint;
  status: LocateStatus;
  roadStatus: TravelStatus;
  chooseDeviceLocation: () => void;
  chooseTownCentre: () => void;
  distanceTo: (place: Place) => PlaceDistance;
}

const StartPointContext = createContext<StartPointContextValue | null>(null);

function readStored(): StartPoint | null {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null") as StartPoint | null;
    return stored?.kind === "device" && hasCoordinates(stored) ? stored : null;
  } catch {
    return null;
  }
}

function store(start: StartPoint | null) {
  try {
    if (start) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(start));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked: the choice just won't survive a refresh
  }
}

export function StartPointProvider({ children }: { children: ReactNode }) {
  const [start, setStart] = useState<StartPoint>(() => readStored() ?? TOWN);
  const [status, setStatus] = useState<LocateStatus>("idle");

  const chooseDeviceLocation = useCallback(() => {
    // Use fixed coordinates instead of live GPS
    const device: StartPoint = {
      latitude: FIXED_LOCATION.latitude,
      longitude: FIXED_LOCATION.longitude,
      kind: "device",
      label: "your location",
    };
    setStart(device);
    store(device);
    setStatus("idle");
  }, []);

  const chooseTownCentre = useCallback(() => {
    setStart(TOWN);
    store(null);
    setStatus("idle");
  }, []);

  // Road distances from the start point to every place in the catalogue
  const { places } = usePlaces();
  const routable = useMemo(() => places.filter(hasCoordinates), [places]);
  const targets = routable.map((place) => ({ latitude: Number(place.latitude), longitude: Number(place.longitude) }));
  const road = useRoadDistances(start, targets);

  const roadById = useMemo(() => {
    const byId = new Map<number, { km: number; minutes: number }>();
    road.legs.forEach((leg, index) => {
      if (leg && routable[index]) byId.set(routable[index].place_id, leg);
    });
    return byId;
  }, [road.legs, routable]);

  const distanceTo = useCallback(
    (place: Place): PlaceDistance => {
      const leg = roadById.get(place.place_id);
      if (leg) return { km: leg.km, minutes: leg.minutes, road: true };

      return { km: haversineKm(start, place), minutes: null, road: false };
    },
    [roadById, start]
  );

  const value = useMemo(
    () => ({ start, status, roadStatus: road.status, chooseDeviceLocation, chooseTownCentre, distanceTo }),
    [start, status, road.status, chooseDeviceLocation, chooseTownCentre, distanceTo]
  );

  return <StartPointContext.Provider value={value}>{children}</StartPointContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStartPoint() {
  const context = useContext(StartPointContext);
  if (!context) throw new Error("useStartPoint must be used inside StartPointProvider");
  return context;
}
