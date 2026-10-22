
import { useCallback, useEffect, useState, type FormEvent } from "react";
import api from "./api";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface Category {
  category_id: number;
  category_name: string;
}

interface Place {
  place_id: number;
  place_name: string;
  description?: string | null;
  address?: string | null;
  distance?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  image?: string | null;
  visit_duration?: string | null;
  best_time_to_visit?: string | null;
  category?: Category | null;
}

interface VisitPlan {
  plan_id: number;
  plan_name: string;
  visit_date: string;
}

interface PlanPlace {
  plan_place_id: number;
  plan_id: number;
  place_id: number;
  visit_order: number;
  planned_time?: string | null;
  place: Place;
}

interface VisitPlanDetails {
  plan_id: number;
  plan_name: string;
  total_places: number;
  places: PlanPlace[];
}

interface VisitPlansProps {
  onBack: () => void;
}

// Today's date as YYYY-MM-DD in the visitor's time zone
function todayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);

  return local.toISOString().slice(0, 10);
}

function createNumberedIcon(number: number) {
  return L.divIcon({
    className: "sabatrail-numbered-marker-wrapper",
    html: `<div class="sabatrail-numbered-marker">${number}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}

function FitMapToDestinations({
  coordinates,
}: {
  coordinates: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    if (coordinates.length > 1) {
      map.fitBounds(coordinates, { padding: [35, 35] });
    } else if (coordinates.length === 1) {
      map.setView(coordinates[0], 12);
    }
  }, [coordinates, map]);

  return null;
}

export default function VisitPlans({ onBack }: VisitPlansProps) {
  const [plans, setPlans] = useState<VisitPlan[]>([]);
  const [allPlaces, setAllPlaces] = useState<Place[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] =
    useState<VisitPlanDetails | null>(null);

  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanDate, setNewPlanDate] = useState(todayIso);
  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const [plannedTime, setPlannedTime] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadPlans = useCallback(async () => {
    try {
      const response = await api.get<VisitPlan[]>("/visit-plans");
      const loadedPlans = Array.isArray(response.data) ? response.data : [];

      setPlans(loadedPlans);

      setSelectedPlanId((currentId) => {
        if (
          currentId !== null &&
          loadedPlans.some((plan) => plan.plan_id === currentId)
        ) {
          return currentId;
        }

        return loadedPlans.length > 0 ? loadedPlans[0].plan_id : null;
      });
    } catch (err) {
      console.error("Failed to load visit plans:", err);
      setError("Unable to load your visit plans. Please try again.");
    }
  }, []);

  const loadPlaces = useCallback(async () => {
    try {
      const response = await api.get<Place[] | { places: Place[] }>("/places");
      const data = response.data;
      const places = Array.isArray(data) ? data : data.places;

      setAllPlaces(Array.isArray(places) ? places : []);
    } catch (err) {
      console.error("Failed to load destinations:", err);
      setError("Unable to load destinations. Please try again.");
    }
  }, []);

  const loadPlanDetails = useCallback(async (planId: number) => {
    try {
      const response = await api.get<VisitPlanDetails>(
        `/visit-plans/${planId}/places`
      );

      const details = response.data;

      const orderedPlaces = [...(details.places ?? [])].sort(
        (a, b) =>
          a.visit_order - b.visit_order ||
          a.plan_place_id - b.plan_place_id
      );

      setSelectedPlan({
        ...details,
        places: orderedPlaces,
        total_places: orderedPlaces.length,
      });
    } catch (err) {
      console.error("Failed to load visit-plan details:", err);
      setSelectedPlan(null);
      setError("Unable to load this itinerary. Please try again.");
    }
  }, []);

  useEffect(() => {
    void loadPlans();
    void loadPlaces();
  }, [loadPlans, loadPlaces]);

  useEffect(() => {
    if (selectedPlanId === null) {
      setSelectedPlan(null);
      return;
    }

    void loadPlanDetails(selectedPlanId);
  }, [selectedPlanId, loadPlanDetails]);

  const handleCreatePlan = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!newPlanName.trim()) {
      setError("Please enter a name for your visit plan.");
      return;
    }

    if (!newPlanDate) {
      setError("Please choose the date of your visit.");
      return;
    }

    setSaving(true);

    try {
      const response = await api.post<VisitPlan>("/visit-plans", {
        plan_name: newPlanName.trim(),
        visit_date: newPlanDate,
      });

      setNewPlanName("");
      setNewPlanDate(todayIso());

      await loadPlans();
      setSelectedPlanId(response.data.plan_id);
      setMessage("Your visit plan was created successfully.");
    } catch (err) {
      console.error("Failed to create visit plan:", err);
      setError("Unable to create the visit plan. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddPlace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (selectedPlanId === null) {
      setError("Please select or create a visit plan first.");
      return;
    }

    if (!selectedPlaceId) {
      setError("Please select a destination.");
      return;
    }

    const placeId = Number(selectedPlaceId);

    if (selectedPlan?.places.some((item) => item.place_id === placeId)) {
      setError("This destination is already in your visit plan.");
      return;
    }

    setSaving(true);

    try {
      const nextOrder = (selectedPlan?.places.length ?? 0) + 1;

      await api.post(`/visit-plans/${selectedPlanId}/places`, {
        place_id: placeId,
        visit_order: nextOrder,
        planned_time: plannedTime || null,
      });

      setSelectedPlaceId("");
      setPlannedTime("");

      await loadPlanDetails(selectedPlanId);
      setMessage("Destination added successfully.");
    } catch (err) {
      console.error("Failed to add destination:", err);
      setError("Unable to add this destination. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleRemovePlace = async (placeId: number) => {
    if (selectedPlanId === null || !selectedPlan) {
      return;
    }

    if (
      !window.confirm("Are you sure you want to remove this destination?")
    ) {
      return;
    }

    setError("");
    setMessage("");
    setSaving(true);

    try {
      await api.delete(
        `/visit-plans/${selectedPlanId}/places/${placeId}`
      );

      const response = await api.get<VisitPlanDetails>(
        `/visit-plans/${selectedPlanId}/places`
      );

      const remainingPlaces = [...(response.data.places ?? [])].sort(
        (a, b) =>
          a.visit_order - b.visit_order ||
          a.plan_place_id - b.plan_place_id
      );

      // Update stored visit order after removing a destination.
      for (let index = 0; index < remainingPlaces.length; index++) {
        const item = remainingPlaces[index];
        const newOrder = index + 1;

        if (item.visit_order !== newOrder) {
          await api.put(
            `/visit-plans/${selectedPlanId}/places/${item.place_id}`,
            {
              visit_order: newOrder,
              planned_time: item.planned_time ?? null,
            }
          );
        }
      }

      await loadPlanDetails(selectedPlanId);
      setMessage("Destination removed and visit order updated.");
    } catch (err) {
      console.error("Failed to remove or reorder destination:", err);
      await loadPlanDetails(selectedPlanId);

      setError(
        "The destination may have been removed, but the visit order could not be fully updated. Please refresh and check your itinerary."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTime = async (item: PlanPlace, newTime: string) => {
    if (selectedPlanId === null) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await api.put(
        `/visit-plans/${selectedPlanId}/places/${item.place_id}`,
        {
          visit_order: item.visit_order,
          planned_time: newTime || null,
        }
      );

      await loadPlanDetails(selectedPlanId);
      setMessage("Planned time updated.");
    } catch (err) {
      console.error("Failed to update planned time:", err);
      setError("Unable to update the planned time. Please try again.");
    }
  };

  const itineraryPlaces = selectedPlan?.places ?? [];

  const availablePlaces = allPlaces.filter(
    (place) =>
      !itineraryPlaces.some((item) => item.place_id === place.place_id)
  );

  // Assign display numbers from the current position in the ordered list.
  const mapDestinations = itineraryPlaces
    .filter(
      (item) =>
        item.place &&
        item.place.latitude !== null &&
        item.place.latitude !== undefined &&
        item.place.longitude !== null &&
        item.place.longitude !== undefined &&
        Number.isFinite(Number(item.place.latitude)) &&
        Number.isFinite(Number(item.place.longitude))
    )
    .map((item, index) => ({
      ...item,
      displayOrder: index + 1,
    }));

  const coordinates: [number, number][] = mapDestinations.map((item) => [
    Number(item.place.latitude),
    Number(item.place.longitude),
  ]);

  const scheduledTimes = itineraryPlaces
    .map((item) => item.planned_time?.slice(0, 5))
    .filter((time): time is string => Boolean(time))
    .sort();

  const scheduledCount = scheduledTimes.length;
  const missingTimeCount = itineraryPlaces.length - scheduledCount;
  const firstTime = scheduledTimes[0] ?? null;
  const lastTime = scheduledTimes[scheduledTimes.length - 1] ?? null;

  const totalDestinationDistance = itineraryPlaces.reduce(
    (total, item) => total + (Number(item.place.distance) || 0),
    0
  );

  return (
    <main className="visit-plans-page">
      <button type="button" onClick={onBack} className="back-button">
        ← Back
      </button>

      <h2>My Visit Plans</h2>

      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}

      {message && (
        <p role="status" className="success-message">
          {message}
        </p>
      )}

      <section className="visit-plan-create-section">
        <h3>Create a New Visit Plan</h3>

        <form onSubmit={handleCreatePlan} className="create-plan-form">
          <label>
            Plan name
            <input
              type="text"
              value={newPlanName}
              onChange={(event) => setNewPlanName(event.target.value)}
              placeholder="e.g. My Hemmathagama Day Trip"
              required
            />
          </label>

          <label>
            Visit date
            <input
              type="date"
              value={newPlanDate}
              min={todayIso()}
              onChange={(event) => setNewPlanDate(event.target.value)}
              required
            />
          </label>

          <button type="submit" disabled={saving}>
            {saving ? "Please wait..." : "Create Plan"}
          </button>
        </form>
      </section>

      <section className="visit-plan-select-section">
        <h3>Select a Visit Plan</h3>

        {plans.length === 0 ? (
          <p>You have no visit plans yet. Create one above to get started.</p>
        ) : (
          <label>
            Your plans
            <select
              value={selectedPlanId ?? ""}
              onChange={(event) =>
                setSelectedPlanId(
                  event.target.value ? Number(event.target.value) : null
                )
              }
            >
              {plans.map((plan) => (
                <option key={plan.plan_id} value={plan.plan_id}>
                  {plan.plan_name}
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      {selectedPlan && (
        <>
          <section className="add-place-section">
            <h3>Add a Destination</h3>

            <form onSubmit={handleAddPlace} className="add-place-form">
              <label>
                Destination
                <select
                  value={selectedPlaceId}
                  onChange={(event) => setSelectedPlaceId(event.target.value)}
                  required
                >
                  <option value="">Select a destination</option>
                  {availablePlaces.map((place) => (
                    <option key={place.place_id} value={place.place_id}>
                      {place.place_name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Planned time
                <input
                  type="time"
                  value={plannedTime}
                  onChange={(event) => setPlannedTime(event.target.value)}
                />
              </label>

              <button
                type="submit"
                disabled={saving || availablePlaces.length === 0}
              >
                {saving ? "Please wait..." : "Add Destination"}
              </button>
            </form>

            {availablePlaces.length === 0 && (
              <p>All available destinations have been added to this plan.</p>
            )}
          </section>

          <section className="itinerary-summary">
            <h3>Itinerary Summary</h3>

            <div className="itinerary-summary-grid">
              <div className="itinerary-summary-card">
                <span>Total Destinations</span>
                <strong>{itineraryPlaces.length}</strong>
              </div>

              <div className="itinerary-summary-card">
                <span>Scheduled</span>
                <strong>{scheduledCount}</strong>
              </div>

              <div className="itinerary-summary-card">
                <span>Recorded Distance Total</span>
                <strong>{totalDestinationDistance.toFixed(1)} km</strong>
              </div>

              <div className="itinerary-summary-card">
                <span>Visit Time Range</span>
                <strong>
                  {firstTime && lastTime
                    ? `${firstTime} – ${lastTime}`
                    : "Not set"}
                </strong>
              </div>
            </div>

            {missingTimeCount > 0 && (
              <p>
                {missingTimeCount} destination
                {missingTimeCount === 1 ? " has" : "s have"} no planned time.
              </p>
            )}

            <p className="itinerary-map-note">
              Distance total adds the recorded distance for each destination.
              It is not the driving distance between destinations.
            </p>
          </section>

          <section className="itinerary-map-section">
            <h3>Destination Map</h3>

            <p>
              Showing {mapDestinations.length} of {itineraryPlaces.length}{" "}
              selected destinations.
            </p>

            {coordinates.length > 0 ? (
              <div className="itinerary-map">
                <MapContainer
                  key={`${selectedPlanId}-${mapDestinations
                    .map((item) => item.place_id)
                    .join("-")}`}
                  center={coordinates[0]}
                  zoom={11}
                  scrollWheelZoom={true}
                  style={{
                    height: "400px",
                    width: "100%",
                    borderRadius: "12px",
                  }}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <FitMapToDestinations coordinates={coordinates} />

                  {coordinates.length > 1 && (
                    <Polyline
                      positions={coordinates}
                      pathOptions={{
                        color: "#285b3c",
                        weight: 4,
                        opacity: 0.85,
                        dashArray: "8 8",
                      }}
                    />
                  )}

                  {mapDestinations.map((item) => (
                    <Marker
                      key={item.plan_place_id}
                      position={[
                        Number(item.place.latitude),
                        Number(item.place.longitude),
                      ]}
                      icon={createNumberedIcon(item.displayOrder)}
                    >
                      <Popup>
                        <strong>
                          {item.displayOrder}. {item.place.place_name}
                        </strong>
                        <br />
                        {item.planned_time
                          ? `Planned time: ${item.planned_time.slice(0, 5)}`
                          : "Planned time not set"}
                        {item.place.address && (
                          <>
                            <br />
                            {item.place.address}
                          </>
                        )}
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            ) : (
              <p>
                No destinations with valid map coordinates have been added yet.
              </p>
            )}

            <p className="itinerary-map-note">
              The dashed line shows visit order only. It is not a road route
              and does not represent driving distance.
            </p>
          </section>

          <section className="planned-destinations-section">
            <h3>Planned Destinations</h3>

            {itineraryPlaces.length === 0 ? (
              <p>
                No destinations have been added to this plan yet. Add one above
                to begin your itinerary.
              </p>
            ) : (
              <div className="planned-destinations-list">
                {itineraryPlaces.map((item, index) => (
                  <article
                    key={item.plan_place_id}
                    className="planned-destination-card"
                  >
                    <div className="planned-destination-order">
                      {index + 1}
                    </div>

                    {item.place.image && (
                      <img
                        className="planned-destination-image"
                        src={item.place.image}
                        alt={item.place.place_name}
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    )}

                    <div className="planned-destination-details">
                      <h4>{item.place.place_name}</h4>

                      {item.place.category && (
                        <p>{item.place.category.category_name}</p>
                      )}

                      {item.place.address && <p>{item.place.address}</p>}

                      {item.place.description && <p>{item.place.description}</p>}

                      {item.place.distance !== null &&
                        item.place.distance !== undefined && (
                          <p>
                            Recorded distance from Hemmathagama:{" "}
                            {item.place.distance} km
                          </p>
                        )}

                      {item.place.visit_duration && (
                        <p>
                          Suggested visit duration: {item.place.visit_duration}
                        </p>
                      )}

                      {item.place.best_time_to_visit && (
                        <p>
                          Best time to visit: {item.place.best_time_to_visit}
                        </p>
                      )}

                      <label>
                        Planned time
                        <input
                          type="time"
                          value={item.planned_time?.slice(0, 5) ?? ""}
                          onChange={(event) =>
                            void handleUpdateTime(item, event.target.value)
                          }
                        />
                      </label>

                      <button
                        type="button"
                        className="remove-destination-button"
                        disabled={saving}
                        onClick={() => void handleRemovePlace(item.place_id)}
                      >
                        Remove Destination
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
