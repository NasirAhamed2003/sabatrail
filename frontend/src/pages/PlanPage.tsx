import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router";
import api from "../api";
import FoodStops from "../components/FoodStops";
import PlaceMap, { type MapMarker } from "../components/PlaceMap";
import PlanFormDialog from "../components/PlanFormDialog";
import StartPointControl from "../components/StartPointControl";
import TripSummary from "../components/TripSummary";
import { Button, ButtonLink } from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import Icon from "../components/ui/Icon";
import { useToast } from "../components/ui/Toast";
import { apiErrorMessage, apiStatus } from "../lib/errors";
import { formatDate, formatDuration, formatKm } from "../lib/format";
import { directionsUrl, hasCoordinates } from "../lib/geo";
import { usePlaces } from "../lib/places";
import { usePlans } from "../lib/plans";
import { useStartPoint } from "../lib/startPoint";
import { useTripEstimate } from "../lib/trip";
import type { TravelLeg } from "../lib/travel";
import type { PlanDetails, PlanStop, VisitPlan } from "../lib/types";
import "./PlanPage.css";
import Alert from "../components/ui/Alert";

type DetailsState = {
  planId: number;
  status: "ready" | "missing" | "error";
  stops: PlanStop[];
};

// ==========================================
// PLANNED TIME: saves 600 ms after typing stops, or on blur
// ==========================================

function PlannedTimeInput({
  stop,
  onSave,
}: {
  stop: PlanStop;
  onSave: (time: string | null) => Promise<void>;
}) {
  const initial = stop.planned_time?.slice(0, 5) ?? "";
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<number | undefined>(undefined);
  const lastSaved = useRef(initial);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const save = async (next: string) => {
    window.clearTimeout(timer.current);
    if (next === lastSaved.current) return;

    setState("saving");

    try {
      await onSave(next || null);
      lastSaved.current = next;
      setState("saved");
    } catch {
      setState("error");
    }
  };

  const id = `planned-time-${stop.plan_place_id}`;

  return (
    <div className="stop-time">
      <label htmlFor={id}>Arrival time</label>
      <input
        id={id}
        className="input stop-time-input"
        type="time"
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          setValue(next);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => void save(next), 600);
        }}
        onBlur={() => void save(value)}
      />
      <span className={`save-status save-${state}`} aria-live="polite">
        {state === "saving" && "Saving…"}
        {state === "saved" && (
          <>
            <Icon name="check" size={14} /> Saved
          </>
        )}
        {state === "error" && "Couldn't save — try again"}
      </span>
    </div>
  );
}

// ==========================================
// ONE STOP ON THE TIMELINE
// ==========================================

function StopItem({
  stop,
  index,
  total,
  previousName,
  previous,
  leg,
  legStatus,
  onMove,
  onRemove,
  onSaveTime,
}: {
  stop: PlanStop;
  index: number;
  total: number;
  previousName: string;
  previous: { latitude: number; longitude: number };
  leg: TravelLeg | null;
  legStatus: string;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
  onSaveTime: (time: string | null) => Promise<void>;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const place = stop.place;
  const duration = formatDuration(place.visit_duration_minutes);

  return (
    <li className="stop">
      <div className="stop-leg">
        <Icon name="car" size={16} />
        <span>
          {leg
            ? `~${formatDuration(leg.minutes)} drive · ${formatKm(leg.km)} from ${previousName}`
            : legStatus === "loading"
              ? `Calculating drive from ${previousName}…`
              : `Travel time unavailable from ${previousName}`}
        </span>
        {hasCoordinates(place) && (
          <a href={directionsUrl(place, previous)} target="_blank" rel="noreferrer">
            Directions<span className="visually-hidden"> from {previousName} to {place.place_name} (opens Google Maps in a new tab)</span>
          </a>
        )}
      </div>

      <article className="stop-card" aria-labelledby={`stop-title-${stop.plan_place_id}`}>
        <span className="stop-number" aria-hidden="true">
          {index + 1}
        </span>

        <div className="stop-media">
          {place.image && !imageFailed ? (
            <img src={place.image} alt="" loading="lazy" onError={() => setImageFailed(true)} />
          ) : (
            <span className="stop-media-placeholder" aria-hidden="true">
              {place.category?.category_name ?? "Stop"}
            </span>
          )}
        </div>

        <div className="stop-body">
          <h3 id={`stop-title-${stop.plan_place_id}`}>
            <span className="visually-hidden">Stop {index + 1}: </span>
            <Link to={`/places/${place.place_id}`}>{place.place_name}</Link>
          </h3>
          <p className="stop-meta">
            {[place.category?.category_name, duration && `${duration} here`].filter(Boolean).join(" · ")}
          </p>
          <PlannedTimeInput stop={stop} onSave={onSaveTime} />

        <div className="stop-actions">
          <Button
            variant="ghost"
            size="sm"
            data-move={`${place.place_id}-up`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <span aria-hidden="true">↑</span>
            <span className="visually-hidden">Move {place.place_name} earlier</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            data-move={`${place.place_id}-down`}
            disabled={index === total - 1}
            onClick={() => onMove(1)}
          >
            <span aria-hidden="true">↓</span>
            <span className="visually-hidden">Move {place.place_name} later</span>
          </Button>
          <Button variant="ghost" size="sm" className="stop-remove" onClick={onRemove}>
            Remove<span className="visually-hidden"> {place.place_name}</span>
          </Button>
        </div>
        </div>
      </article>
    </li>
  );
}

// ==========================================
// PLANNER PAGE
// ==========================================

export default function PlanPage() {
  const navigate = useNavigate();
  const { planId } = useParams();
  const { plans, plansError, refreshPlans, setActivePlanId, refreshActiveStops, activeStops } = usePlans();

  // Adds made elsewhere (e.g. food-stop suggestions) update the shared stops; refetch when they change
  const sharedStopsKey = activeStops.map((stop) => `${stop.plan_place_id}:${stop.visit_order}`).join(",");
  const { places: catalogue } = usePlaces();
  const { showToast } = useToast();

  const routeId = planId ? Number(planId) : null;
  const selectedId = routeId !== null && Number.isInteger(routeId) ? routeId : null;
  const plan: VisitPlan | undefined = plans?.find((p) => p.plan_id === selectedId);

  const [details, setDetails] = useState<DetailsState | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [dialog, setDialog] = useState<"create" | "edit" | "delete" | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [addPlaceId, setAddPlaceId] = useState("");
  const [adding, setAdding] = useState(false);

  // Open the first plan when the URL has none (or one that isn't the visitor's)
  useEffect(() => {
    if (!plans || plans.length === 0) return;

    if (selectedId === null || !plans.some((p) => p.plan_id === selectedId)) {
      navigate(`/plan/${plans[0].plan_id}`, { replace: true });
    }
  }, [plans, selectedId, navigate]);

  // The plan being viewed is the "active" plan for Add-to-my-day buttons
  useEffect(() => {
    if (selectedId !== null) setActivePlanId(selectedId);
  }, [selectedId, setActivePlanId]);

  // Load the plan's stops
  useEffect(() => {
    if (selectedId === null) return;

    let active = true;

    api
      .get<PlanDetails>(`/visit-plans/${selectedId}/places`)
      .then((response) => {
        if (active) setDetails({ planId: selectedId, status: "ready", stops: response.data.places ?? [] });
      })
      .catch((error) => {
        if (active) {
          setDetails({
            planId: selectedId,
            status: apiStatus(error) === 404 ? "missing" : "error",
            stops: [],
          });
        }
      });

    return () => {
      active = false;
    };
  }, [selectedId, reloadKey, sharedStopsKey]);

  const current = details && details.planId === selectedId ? details : null;
  const stops = current?.stops ?? [];
  const stopPlaces = stops.map((stop) => stop.place);
  const { start } = useStartPoint();
  const startName = start.kind === "town" ? "Hemmathagama town centre" : "your location";
  const estimate = useTripEstimate(stopPlaces, start);

  const reload = () => {
    setReloadKey((key) => key + 1);
    void refreshActiveStops();
  };

  const setStops = (update: (stops: PlanStop[]) => PlanStop[]) => {
    setDetails((state) => (state ? { ...state, stops: update(state.stops) } : state));
  };

  // ---------- Stop actions ----------

  const move = async (index: number, direction: -1 | 1) => {
    if (selectedId === null) return;

    const target = index + direction;
    if (target < 0 || target >= stops.length) return;

    const reordered = [...stops];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const moved = reordered[target];

    setStops(() => reordered.map((stop, i) => ({ ...stop, visit_order: i + 1 })));

    // Keep keyboard focus on the moved stop's arrow (or its other arrow at the ends)
    requestAnimationFrame(() => {
      const same = document.querySelector<HTMLButtonElement>(
        `[data-move="${moved.place_id}-${direction === -1 ? "up" : "down"}"]`
      );
      const other = document.querySelector<HTMLButtonElement>(
        `[data-move="${moved.place_id}-${direction === -1 ? "down" : "up"}"]`
      );
      (same && !same.disabled ? same : other)?.focus();
    });

    try {
      await api.put(`/visit-plans/${selectedId}/order`, { place_ids: reordered.map((stop) => stop.place_id) });
      void refreshActiveStops();
    } catch (error) {
      showToast(apiErrorMessage(error, "Couldn't change the order. Please try again."), { tone: "error" });
      reload();
    }
  };

  const remove = async (stop: PlanStop) => {
    if (selectedId === null) return;

    const previousOrder = stops.map((s) => s.place_id);
    const planIdAtRemoval = selectedId;

    setStops((list) => list.filter((s) => s.plan_place_id !== stop.plan_place_id).map((s, i) => ({ ...s, visit_order: i + 1 })));

    try {
      await api.delete(`/visit-plans/${planIdAtRemoval}/places/${stop.place_id}`);
      void refreshActiveStops();

      showToast(`Removed ${stop.place.place_name}`, {
        duration: 8000,
        action: {
          label: "Undo",
          onClick: () => {
            void (async () => {
              try {
                await api.post(`/visit-plans/${planIdAtRemoval}/places`, {
                  place_id: stop.place_id,
                  planned_time: stop.planned_time?.slice(0, 5) || null,
                });
                await api.put(`/visit-plans/${planIdAtRemoval}/order`, { place_ids: previousOrder });
                showToast(`Restored ${stop.place.place_name}`);
              } catch (error) {
                showToast(apiErrorMessage(error, "Couldn't restore the stop."), { tone: "error" });
              } finally {
                reload();
              }
            })();
          },
        },
      });
    } catch (error) {
      showToast(apiErrorMessage(error, "Couldn't remove the stop. Please try again."), { tone: "error" });
      reload();
    }
  };

  const saveTime = async (stop: PlanStop, time: string | null) => {
    if (selectedId === null) return;

    await api.put(`/visit-plans/${selectedId}/places/${stop.place_id}`, { planned_time: time });
    setStops((list) => list.map((s) => (s.plan_place_id === stop.plan_place_id ? { ...s, planned_time: time } : s)));
    void refreshActiveStops();
  };

  const addStop = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (selectedId === null || !addPlaceId) return;

    const place = catalogue.find((p) => p.place_id === Number(addPlaceId));
    setAdding(true);

    try {
      await api.post(`/visit-plans/${selectedId}/places`, { place_id: Number(addPlaceId) });
      setAddPlaceId("");
      showToast(`Added ${place?.place_name ?? "the place"}`);
      reload();
    } catch (error) {
      showToast(apiErrorMessage(error, "Couldn't add this place. Please try again."), { tone: "error" });
    } finally {
      setAdding(false);
    }
  };

  // ---------- Plan actions ----------

  const createPlan = async (values: { plan_name: string; visit_date: string }) => {
    const response = await api.post<VisitPlan>("/visit-plans", values);
    await refreshPlans();
    setDialog(null);
    showToast(`Created ${response.data.plan_name}`);
    navigate(`/plan/${response.data.plan_id}`);
  };

  const editPlan = async (values: { plan_name: string; visit_date: string }) => {
    if (selectedId === null) return;

    await api.put(`/visit-plans/${selectedId}`, values);
    await refreshPlans();
    setDialog(null);
    showToast("Plan updated");
  };

  const deletePlan = async () => {
    if (selectedId === null || !plan) return;

    setDeleteBusy(true);
    setDeleteError("");

    try {
      await api.delete(`/visit-plans/${selectedId}`);
      setDialog(null);
      showToast(`Deleted ${plan.plan_name}`);
      await refreshPlans();
      navigate("/plan", { replace: true });
    } catch (error) {
      setDeleteError(apiErrorMessage(error, "Couldn't delete the plan. Please try again."));
    } finally {
      setDeleteBusy(false);
    }
  };

  const dialogs = (
    <>
      <PlanFormDialog open={dialog === "create"} mode="create" onSubmit={createPlan} onClose={() => setDialog(null)} />
      <PlanFormDialog
        open={dialog === "edit"}
        mode="edit"
        initialName={plan?.plan_name}
        initialDate={plan?.visit_date?.slice(0, 10)}
        onSubmit={editPlan}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        title={`Delete "${plan?.plan_name ?? ""}"?`}
        confirmLabel="Delete plan"
        busy={deleteBusy}
        error={deleteError}
        onConfirm={() => void deletePlan()}
        onCancel={() => {
          setDialog(null);
          setDeleteError("");
        }}
      >
        <p>
          This removes the plan and its {stops.length} {stops.length === 1 ? "stop" : "stops"}. The places themselves stay
          in SabaTrail. This can&apos;t be undone.
        </p>
      </ConfirmDialog>
    </>
  );

  // ---------- Page states ----------

  if (plansError && plans === null) {
    return (
      <section className="container status-page">
        <h1>My visit plans</h1>
        <Alert tone="error">
          We couldn&apos;t load your plans. Check your connection and try again.
        </Alert>
        <Button variant="secondary" onClick={() => void refreshPlans()}>
          Try again
        </Button>
      </section>
    );
  }

  if (plans === null) {
    return (
      <section className="container status-page" role="status">
        <p>Loading your plans…</p>
      </section>
    );
  }

  if (plans.length === 0) {
    return (
      <section className="container planner-empty">
        <span className="eyebrow">MY VISIT PLANS</span>
        <h1>Plan your first day</h1>
        <p>
          A plan keeps your stops in order, with arrival times, directions, and an estimate for the whole day. Start by
          adding places as you browse, or create an empty plan.
        </p>
        <div className="planner-empty-actions">
          <ButtonLink to="/#explore" size="lg">
            Browse places
          </ButtonLink>
          <Button variant="secondary" size="lg" onClick={() => setDialog("create")}>
            Create an empty plan
          </Button>
        </div>
        {dialogs}
      </section>
    );
  }

  if (!plan) {
    // Redirecting to a valid plan
    return (
      <section className="container status-page" role="status">
        <p>Opening your plan…</p>
      </section>
    );
  }

  const markers: MapMarker[] = [
    { id: "start", latitude: start.latitude, longitude: start.longitude, label: `Start: ${startName}`, kind: "start" },
    ...stops
      .filter((stop) => hasCoordinates(stop.place))
      .map((stop, index) => ({
        id: stop.plan_place_id,
        latitude: stop.place.latitude,
        longitude: stop.place.longitude,
        label: `${index + 1}. ${stop.place.place_name}`,
        detail: stop.planned_time ? `Arrive ${stop.planned_time.slice(0, 5)}` : undefined,
        number: index + 1,
      })),
  ];

  const inPlan = new Set(stops.map((stop) => stop.place_id));
  const available = catalogue.filter((place) => !inPlan.has(place.place_id));
  const groups = [...new Set(available.map((place) => place.category?.category_name ?? "Other"))].sort();

  return (
    <div className="container planner">
      <header className="planner-header">
        <div className="planner-title">
          <span className="eyebrow">MY VISIT PLANS</span>
          <h1>{plan.plan_name}</h1>
          <p>
            <Icon name="sun" size={18} /> {formatDate(plan.visit_date)} · {stops.length}{" "}
            {stops.length === 1 ? "stop" : "stops"}
          </p>
        </div>

        <div className="planner-toolbar">
          {plans.length > 1 && (
            <div className="field planner-switch">
              <label htmlFor="plan-switcher">Switch plan</label>
              <select
                id="plan-switcher"
                className="input"
                value={plan.plan_id}
                onChange={(event) => navigate(`/plan/${event.target.value}`)}
              >
                {plans.map((p) => (
                  <option key={p.plan_id} value={p.plan_id}>
                    {p.plan_name} — {formatDate(p.visit_date)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="planner-buttons">
            <Button variant="secondary" onClick={() => setDialog("edit")}>
              Rename or change date
            </Button>
            <Button variant="danger" onClick={() => setDialog("delete")}>
              Delete plan
            </Button>
            <Button onClick={() => setDialog("create")}>
              <Icon name="plus" size={16} /> New plan
            </Button>
          </div>
        </div>
      </header>

      {current === null && (
        <p className="status-page" role="status">
          Loading stops…
        </p>
      )}

      {current?.status === "error" && (
        <Alert tone="error" className="planner-alert">
          We couldn&apos;t load this plan&apos;s stops. Check your connection and{" "}
          <button type="button" className="link-button" onClick={reload}>
            try again
          </button>
          .
        </Alert>
      )}

      {current?.status === "missing" && (
        <Alert tone="warning" className="planner-alert">
          This plan no longer exists. <Link to="/plan">Open your plans</Link>
        </Alert>
      )}

      {current?.status === "ready" && (
        <div className="planner-grid">
          <section className="timeline" aria-labelledby="stops-heading">
            <h2 id="stops-heading">Your stops</h2>

            {stops.length === 0 ? (
              <div className="timeline-empty">
                <p>
                  <strong>No stops yet.</strong> Browse places and choose “Add to my day”, or pick one below.
                </p>
                <ButtonLink to="/#explore" variant="secondary">
                  Browse places
                </ButtonLink>
              </div>
            ) : (
              <ol className="timeline-list">
                {stops.map((stop, index) => (
                  <StopItem
                    key={stop.plan_place_id}
                    stop={stop}
                    index={index}
                    total={stops.length}
                    previousName={index === 0 ? startName : stops[index - 1].place.place_name}
                    previous={index === 0 ? start : stops[index - 1].place}
                    leg={estimate.legs[index]}
                    legStatus={estimate.travelStatus}
                    onMove={(direction) => void move(index, direction)}
                    onRemove={() => void remove(stop)}
                    onSaveTime={(time) => saveTime(stop, time)}
                  />
                ))}
              </ol>
            )}

            <form className="add-stop" onSubmit={addStop}>
              <div className="field">
                <label htmlFor="add-stop-place">Add a place to this plan</label>
                <select
                  id="add-stop-place"
                  className="input"
                  value={addPlaceId}
                  onChange={(event) => setAddPlaceId(event.target.value)}
                >
                  <option value="">Choose a place…</option>
                  {groups.map((group) => (
                    <optgroup key={group} label={group}>
                      {available
                        .filter((place) => (place.category?.category_name ?? "Other") === group)
                        .map((place) => (
                          <option key={place.place_id} value={place.place_id}>
                            {place.place_name}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <Button type="submit" variant="secondary" disabled={!addPlaceId || adding}>
                {adding ? "Adding…" : "Add stop"}
              </Button>
            </form>
          </section>

          <aside className="planner-side">
            <StartPointControl prefix="Day starts from" />
            <TripSummary stops={stopPlaces} estimate={estimate} showLegs={false} />

            {markers.length > 1 && (
              <section className="planner-map" aria-labelledby="route-map-heading">
                <h2 id="route-map-heading">Route map</h2>
                <PlaceMap markers={markers} line label={`Map of ${plan.plan_name}: start point and ${stops.length} numbered stops`} height="340px" />
                <p className="muted">The dashed line shows the order of your stops, not the road route.</p>
              </section>
            )}

            <FoodStops stops={stopPlaces} places={catalogue} />
          </aside>
        </div>
      )}

      {dialogs}
    </div>
  );
}
