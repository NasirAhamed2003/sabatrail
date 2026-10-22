import { useEffect, useState } from "react";
import type { LatLng } from "./geo";

// Driving time and road distance estimates from the public OSRM routing
// service (OpenStreetMap road data). Only coordinates are sent: places, the
// town centre, or the visitor's start point if they chose "Use my location"
// (rounded to about 100 m first). If the service can't be reached, callers
// fall back to straight-line distance or "Travel time unavailable".

const OSRM_URL = "https://router.project-osrm.org/route/v1/driving";
const OSRM_TABLE_URL = "https://router.project-osrm.org/table/v1/driving";
const TIMEOUT_MS = 8000;

export interface TravelLeg {
  minutes: number;
  km: number;
}

const cache = new Map<string, Promise<TravelLeg[] | null>>();

function keyFor(points: LatLng[]) {
  return points.map((p) => `${p.longitude.toFixed(5)},${p.latitude.toFixed(5)}`).join(";");
}

function fetchTravelLegs(points: LatLng[]): Promise<TravelLeg[] | null> {
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

// Road distance and driving time from one point to many (OSRM table service).
// An entry is null where OSRM found no route; the whole result is null if the
// service can't be reached.
const tableCache = new Map<string, Promise<(TravelLeg | null)[] | null>>();

function fetchRoadDistances(from: LatLng, to: LatLng[]): Promise<(TravelLeg | null)[] | null> {
  if (to.length === 0) return Promise.resolve([]);

  const key = keyFor([from, ...to]);
  const cached = tableCache.get(key);
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const request = fetch(`${OSRM_TABLE_URL}/${key}?sources=0&annotations=duration,distance`, { signal: controller.signal })
    .then((response) => (response.ok ? response.json() : null))
    .then((data: { code?: string; durations?: (number | null)[][]; distances?: (number | null)[][] } | null) => {
      const durations = data?.code === "Ok" ? data.durations?.[0] : undefined;
      const distances = data?.code === "Ok" ? data.distances?.[0] : undefined;
      if (!durations || !distances || durations.length !== to.length + 1) return null;

      // Index 0 is the start point itself
      return to.map((_, index) => {
        const seconds = durations[index + 1];
        const metres = distances[index + 1];
        return seconds == null || metres == null ? null : { minutes: seconds / 60, km: metres / 1000 };
      });
    })
    .catch(() => null)
    .finally(() => clearTimeout(timer));

  request.then((legs) => {
    if (legs === null) tableCache.delete(key);
  });

  tableCache.set(key, request);
  return request;
}

// React hook: road distances from one point to each of the given points
export function useRoadDistances(from: LatLng, to: LatLng[]) {
  const key = keyFor([from, ...to]);
  const [state, setState] = useState<{ key: string; status: TravelStatus; legs: (TravelLeg | null)[] }>({
    key: "",
    status: "idle",
    legs: [],
  });

  useEffect(() => {
    if (to.length === 0) return;

    let active = true;

    fetchRoadDistances(from, to).then((legs) => {
      if (!active) return;
      setState({ key, status: legs ? "ready" : "unavailable", legs: legs ?? [] });
    });

    return () => {
      active = false;
    };
    // from and to are derived from key; key changes whenever they change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (to.length === 0) return { status: "ready" as TravelStatus, legs: [] as (TravelLeg | null)[] };
  if (state.key !== key) return { status: "loading" as TravelStatus, legs: [] as (TravelLeg | null)[] };

  return { status: state.status, legs: state.legs };
}
