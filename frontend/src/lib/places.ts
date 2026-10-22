import { useCallback, useEffect, useState } from "react";
import api from "../api";
import type { Place } from "./types";

// The catalogue is small and shared by several screens, so it is fetched once
// per page load and reused. reload() fetches it again (e.g. after admin edits).

let cachedRequest: Promise<Place[]> | null = null;

function fetchPlaces(force = false) {
  if (!cachedRequest || force) {
    cachedRequest = api.get<Place[]>("/places").then((response) => (Array.isArray(response.data) ? response.data : []));

    // Don't keep a failed request; the next caller retries
    cachedRequest.catch(() => {
      cachedRequest = null;
    });
  }

  return cachedRequest;
}

// fresh: skip the shared cache (admin screens must show the latest data)
export function usePlaces({ fresh = false }: { fresh?: boolean } = {}) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const apply = useCallback((request: Promise<Place[]>, isActive: () => boolean = () => true) => {
    return request
      .then((list) => {
        if (!isActive()) return;
        setPlaces(list);
        setStatus("ready");
      })
      .catch(() => {
        if (isActive()) setStatus("error");
      });
  }, []);

  useEffect(() => {
    let active = true;
    void apply(fetchPlaces(fresh), () => active);

    return () => {
      active = false;
    };
  }, [apply, fresh]);

  // Retry or refresh, called from event handlers
  const reload = useCallback(() => {
    setStatus("loading");
    return apply(fetchPlaces(true));
  }, [apply]);

  return { places, status, reload };
}

// Forget the cached catalogue (after admin changes)
export function invalidatePlaces() {
  cachedRequest = null;
}
