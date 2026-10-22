import { HEMMATHAGAMA, hasCoordinates, type LatLng } from "./geo";
import { useTravelLegs, type TravelLeg, type TravelStatus } from "./travel";
import type { Place } from "./types";

// Day estimate for an ordered list of stops, starting from the town centre:
// time at stops (sum of each place's visit duration), driving time between
// stops, and the total. All values are estimates, not guarantees.

export interface TripEstimate {
  stopCount: number;
  visitMinutes: number;
  stopsWithoutDuration: number;
  travelStatus: TravelStatus;
  legs: (TravelLeg | null)[]; // legs[i] = drive to stop i (from start or previous stop)
  travelMinutes: number | null;
  travelKm: number | null;
  totalMinutes: number | null;
}

export function useTripEstimate(stops: Place[], start: LatLng = HEMMATHAGAMA): TripEstimate {
  const routable = stops.filter(hasCoordinates);
  // useTravelLegs keys its lookups by the coordinates, so a new array each render is fine
  const points = [start, ...routable.map((p) => ({ latitude: Number(p.latitude), longitude: Number(p.longitude) }))];

  const { status, legs } = useTravelLegs(points);

  const visitMinutes = stops.reduce((sum, place) => sum + (place.visit_duration_minutes ?? 0), 0);
  const stopsWithoutDuration = stops.filter((place) => place.visit_duration_minutes == null).length;

  const allRoutable = routable.length === stops.length;
  const travelReady = status === "ready" && allRoutable && legs.length === stops.length;

  const travelMinutes = travelReady ? legs.reduce((sum, leg) => sum + leg.minutes, 0) : null;
  const travelKm = travelReady ? legs.reduce((sum, leg) => sum + leg.km, 0) : null;

  return {
    stopCount: stops.length,
    visitMinutes,
    stopsWithoutDuration,
    travelStatus: stops.length === 0 ? "ready" : allRoutable ? status : "unavailable",
    legs: stops.map((_, index) => (travelReady ? legs[index] : null)),
    travelMinutes,
    travelKm,
    totalMinutes: travelMinutes === null ? null : travelMinutes + visitMinutes,
  };
}
