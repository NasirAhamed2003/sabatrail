import { useEffect, useState } from "react";
import type { LatLng } from "./geo";

// Driving time estimates between consecutive points, from the public OSRM
// routing service (OpenStreetMap road data). Only place coordinates and the
// town centre are sent; never the visitor's own location. If the service
// can't be reached, callers show "Travel time unavailable" instead of guessing.

const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";
const TIMEOUT_MS = 8000;

export interface TravelLeg {
  minutes: number;
  km: number;
}

const cache = new Map<string, Promise<TravelLeg[] | null>>();

function keyFor(points: LatLng[]) {
  return points.map((p) => `${p.longitude.toFixed(5)},${p.latitude.toFixed(5)}`).join(";");
}

export function fetchTravelLegs(points: LatLng[]): Promise<TravelLeg[] | null> {
  if (points.length < 2) return Promise.resolve([]);

  const key = keyFor(points);
  const cached = cache.get(key);
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const request = fetch(`${OSRM_URL}/${key}?overview=false`, { signal: controller.signal })
    .then((response) => (response.ok ? response.json() : null))
    .then((data: { code?: string; routes?: { legs: { duration: number; distance: number }[] }[] } | null) => {
      const legs = data?.code === "Ok" ? data.routes?.[0]?.legs : undefined;
      if (!legs || legs.length !== points.length - 1) return null;

      return legs.map((leg) => ({ minutes: leg.duration / 60, km: leg.distance / 1000 }));
    })
    .catch(() => null)
    .finally(() => clearTimeout(timer));

  // Failed lookups aren't cached, so a later visit can try again
  request.then((legs) => {
    if (legs === null) cache.delete(key);
  });

  cache.set(key, request);
  return request;
}

export type TravelStatus = "idle" | "loading" | "ready" | "unavailable";

// React hook: legs between consecutive points (empty when fewer than 2 points)
export function useTravelLegs(points: LatLng[]) {
  const key = keyFor(points);
  const [state, setState] = useState<{ key: string; status: TravelStatus; legs: TravelLeg[] }>({
    key: "",
    status: "idle",
    legs: [],
  });

  useEffect(() => {
    if (points.length < 2) return;

    let active = true;

    fetchTravelLegs(points).then((legs) => {
      if (!active) return;
      setState({ key, status: legs ? "ready" : "unavailable", legs: legs ?? [] });
    });

    return () => {
      active = false;
    };
    // points is derived from key; key changes whenever the points change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (points.length < 2) return { status: "ready" as TravelStatus, legs: [] as TravelLeg[] };
  if (state.key !== key) return { status: "loading" as TravelStatus, legs: [] as TravelLeg[] };

  return { status: state.status, legs: state.legs };
}
