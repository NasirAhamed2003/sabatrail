import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { HEMMATHAGAMA, haversineKm, type LatLng } from "./geo";

// Where distances are measured from: the town centre by default, or the
// visitor's own location if they choose to share it. The device location is
// kept in memory only and is never sent to the SabaTrail API.

export interface StartPoint extends LatLng {
  kind: "town" | "device";
  label: string;
}

const TOWN: StartPoint = { ...HEMMATHAGAMA, kind: "town", label: "Hemmathagama town centre" };

type LocateStatus = "idle" | "locating" | "denied" | "unavailable";

interface StartPointContextValue {
  start: StartPoint;
  status: LocateStatus;
  chooseDeviceLocation: () => void;
  chooseTownCentre: () => void;
  distanceKm: (to: LatLng) => number;
}

const StartPointContext = createContext<StartPointContextValue | null>(null);

export function StartPointProvider({ children }: { children: ReactNode }) {
  const [start, setStart] = useState<StartPoint>(TOWN);
  const [status, setStatus] = useState<LocateStatus>("idle");

  const chooseDeviceLocation = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }

    setStatus("locating");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStart({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          kind: "device",
          label: "your location",
        });
        setStatus("idle");
      },
      (error) => {
        setStatus(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  const chooseTownCentre = useCallback(() => {
    setStart(TOWN);
    setStatus("idle");
  }, []);

  const distanceKm = useCallback((to: LatLng) => haversineKm(start, to), [start]);

  const value = useMemo(
    () => ({ start, status, chooseDeviceLocation, chooseTownCentre, distanceKm }),
    [start, status, chooseDeviceLocation, chooseTownCentre, distanceKm]
  );

  return <StartPointContext.Provider value={value}>{children}</StartPointContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStartPoint() {
  const context = useContext(StartPointContext);
  if (!context) throw new Error("useStartPoint must be used inside StartPointProvider");
  return context;
}
