import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router";
import api from "../api";
import Dialog from "../components/ui/Dialog";
import { Button } from "../components/ui/Button";
import { useToast } from "../components/ui/Toast";
import { useAuth } from "./auth";
import { apiErrorMessage, apiStatus } from "./errors";
import { formatDate, todayIso } from "./format";
import { loginPath } from "./routing";
import type { Place, PlanDetails, PlanStop, VisitPlan } from "./types";
import Alert from "../components/ui/Alert";

// ==========================================
// PLANS CONTEXT
// The signed-in visitor's plans, the "active" plan shown in the Your-day
// tray, and the add-to-plan flow used by every "Add to my day" button.
// ==========================================

const ACTIVE_KEY = "sabatrail_active_plan";
const PENDING_KEY = "sabatrail_pending_add";

interface PlansContextValue {
  plans: VisitPlan[] | null; // null until loaded
  plansError: boolean;
  activePlan: VisitPlan | null;
  activeStops: PlanStop[];
  setActivePlanId: (id: number) => void;
  refreshPlans: () => Promise<VisitPlan[] | null>;
  refreshActiveStops: () => Promise<void>;
  requestAdd: (place: Place) => void;
  isInActivePlan: (placeId: number) => boolean;
}

const PlansContext = createContext<PlansContextValue | null>(null);

function storedNumber(key: string, storage: Storage) {
  try {
    const value = Number(storage.getItem(key));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function store(key: string, value: string | null, storage: Storage) {
  try {
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
  } catch {
    // Storage unavailable: preference lasts for this page only
  }
}

// One provider instance per account: signing out or switching accounts
// starts from a clean state.
export function PlansProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return <AccountPlansProvider key={user?.user_id ?? "guest"}>{children}</AccountPlansProvider>;
}

function AccountPlansProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [plans, setPlans] = useState<VisitPlan[] | null>(null);
  const [plansError, setPlansError] = useState(false);
  const [activePlanId, setActivePlanIdState] = useState<number | null>(() => storedNumber(ACTIVE_KEY, localStorage));
  const [activeStops, setActiveStops] = useState<PlanStop[]>([]);

  // Add-to-plan dialog
  const [pickerPlace, setPickerPlace] = useState<Place | null>(null);
  const [choice, setChoice] = useState<number | "new">("new");
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState(todayIso);
  const [dialogError, setDialogError] = useState("");
  const [saving, setSaving] = useState(false);

  const setActivePlanId = useCallback((id: number) => {
    setActivePlanIdState(id);
    store(ACTIVE_KEY, String(id), localStorage);
  }, []);

  const refreshPlans = useCallback(async () => {
    try {
      const response = await api.get<VisitPlan[]>("/visit-plans");
      const list = Array.isArray(response.data) ? response.data : [];
      setPlans(list);
      setPlansError(false);
      return list;
    } catch {
      setPlansError(true);
      return null;
    }
  }, []);

  // Load plans when signed in. The provider is remounted per account
  // (see PlansProvider), so nothing from a previous session lingers.
  useEffect(() => {
    if (!isLoggedIn) return;

    let active = true;

    api
      .get<VisitPlan[]>("/visit-plans")
      .then((response) => {
        if (!active) return;
        setPlans(Array.isArray(response.data) ? response.data : []);
        setPlansError(false);
      })
      .catch(() => {
        if (active) setPlansError(true);
      });

    return () => {
      active = false;
    };
  }, [isLoggedIn]);

  // The active plan must be one of the visitor's plans (default: the first)
  const activePlan = useMemo(() => {
    if (!plans || plans.length === 0) return null;
    return plans.find((plan) => plan.plan_id === activePlanId) ?? plans[0];
  }, [plans, activePlanId]);

  const refreshActiveStops = useCallback(async () => {
    if (!activePlan) return;

    try {
      const response = await api.get<PlanDetails>(`/visit-plans/${activePlan.plan_id}/places`);
      setActiveStops(response.data.places ?? []);
    } catch {
      // Keep the previous stops; the tray simply stays as it was
    }
  }, [activePlan]);

  useEffect(() => {
    if (!activePlan) return;

    let active = true;

    api
      .get<PlanDetails>(`/visit-plans/${activePlan.plan_id}/places`)
      .then((response) => {
        if (active) setActiveStops(response.data.places ?? []);
      })
      .catch(() => {
        // Keep the previous stops; the tray simply stays as it was
      });

    return () => {
      active = false;
    };
  }, [activePlan]);

  // Stops only belong to the active plan
  const visibleStops = activePlan ? activeStops : [];

  const isInActivePlan = useCallback(
    (placeId: number) => visibleStops.some((stop) => stop.place_id === placeId),
    [visibleStops]
  );

  // Add a place to a plan, then confirm with a toast linking to the plan
  const addToPlan = useCallback(
    async (place: Place, plan: VisitPlan) => {
      try {
        await api.post(`/visit-plans/${plan.plan_id}/places`, { place_id: place.place_id });
        setActivePlanId(plan.plan_id);
        if (plan.plan_id === activePlan?.plan_id) await refreshActiveStops();

        showToast(`Added ${place.place_name} to ${plan.plan_name}`, {
          action: { label: "View plan", to: `/plan/${plan.plan_id}` },
        });
        return true;
      } catch (error) {
        if (apiStatus(error) === 409) {
          setActivePlanId(plan.plan_id);
          showToast(`${place.place_name} is already in ${plan.plan_name}`, {
            action: { label: "View plan", to: `/plan/${plan.plan_id}` },
          });
          return true;
        }

        showToast(apiErrorMessage(error, "Couldn't add this place. Please try again."), { tone: "error" });
        return false;
      }
    },
    [activePlan, refreshActiveStops, setActivePlanId, showToast]
  );

  const openPicker = useCallback(
    (place: Place, list: VisitPlan[]) => {
      setPickerPlace(place);
      setChoice(list.length > 0 ? (activePlan?.plan_id ?? list[0].plan_id) : "new");
      setNewName(list.length === 0 ? "My day trip" : "");
      setNewDate(todayIso());
      setDialogError("");
    },
    [activePlan]
  );

  // Entry point for every "Add to my day" button
  const requestAdd = useCallback(
    (place: Place) => {
      if (!isLoggedIn) {
        // Remember the place, log in, and finish the add on return
        store(PENDING_KEY, String(place.place_id), sessionStorage);
        navigate(loginPath(location.pathname + location.hash));
        return;
      }

      const route = (list: VisitPlan[]) => {
        if (list.length === 1) {
          void addToPlan(place, list[0]);
        } else {
          openPicker(place, list);
        }
      };

      if (plans !== null) {
        route(plans);
        return;
      }

      // Plans not loaded yet (or the last load failed): load, then continue
      void refreshPlans().then((list) => {
        if (list) route(list);
        else showToast("We couldn't load your plans. Check your connection and try again.", { tone: "error" });
      });
    },
    [isLoggedIn, plans, addToPlan, openPicker, refreshPlans, showToast, navigate, location.pathname, location.hash]
  );

  // Resume an add that started before logging in
  useEffect(() => {
    if (!isLoggedIn || plans === null) return;

    const pendingId = storedNumber(PENDING_KEY, sessionStorage);
    if (pendingId === null) return;

    store(PENDING_KEY, null, sessionStorage);

    api
      .get<Place>(`/places/${pendingId}`)
      .then((response) => requestAdd(response.data))
      .catch(() => {
        // The place may have been removed; nothing to resume
      });
  }, [isLoggedIn, plans, requestAdd]);

  const closePicker = () => setPickerPlace(null);

  const submitPicker = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pickerPlace) return;

    setDialogError("");
    setSaving(true);

    try {
      let target: VisitPlan | undefined;

      if (choice === "new") {
        if (!newName.trim()) {
          setDialogError("Give your plan a name.");
          return;
        }

        if (!newDate) {
          setDialogError("Choose the date of your visit.");
          return;
        }

        const response = await api.post<VisitPlan>("/visit-plans", {
          plan_name: newName.trim(),
          visit_date: newDate,
        });

        target = response.data;
        await refreshPlans();
      } else {
        target = plans?.find((plan) => plan.plan_id === choice);
      }

      if (!target) {
        setDialogError("Choose a plan.");
        return;
      }

      if (await addToPlan(pickerPlace, target)) closePicker();
    } catch (error) {
      setDialogError(apiErrorMessage(error, "Couldn't create the plan. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const value = useMemo(
    () => ({
      plans,
      plansError,
      activePlan,
      activeStops: visibleStops,
      setActivePlanId,
      refreshPlans,
      refreshActiveStops,
      requestAdd,
      isInActivePlan,
    }),
    [plans, plansError, activePlan, visibleStops, setActivePlanId, refreshPlans, refreshActiveStops, requestAdd, isInActivePlan]
  );

  const hasPlans = (plans?.length ?? 0) > 0;

  return (
    <PlansContext.Provider value={value}>
      {children}

      <Dialog
        open={pickerPlace !== null}
        title={hasPlans ? `Add ${pickerPlace?.place_name ?? ""} to…` : "Start your first plan"}
        onClose={closePicker}
      >
        <form className="add-to-plan-form" onSubmit={submitPicker}>
          {hasPlans && (
            <fieldset className="plan-choices">
              <legend className="visually-hidden">Choose a plan</legend>

              {plans!.map((plan) => (
                <label key={plan.plan_id} className="plan-choice">
                  <input
                    type="radio"
                    name="plan-choice"
                    checked={choice === plan.plan_id}
                    onChange={() => setChoice(plan.plan_id)}
                  />
                  <span>
                    <strong>{plan.plan_name}</strong>
                    <small>{formatDate(plan.visit_date)}</small>
                  </span>
                </label>
              ))}

              <label className="plan-choice">
                <input type="radio" name="plan-choice" checked={choice === "new"} onChange={() => setChoice("new")} />
                <span>
                  <strong>New plan</strong>
                  <small>Start a separate day</small>
                </span>
              </label>
            </fieldset>
          )}

          {!hasPlans && (
            <p className="dialog-intro">
              Plans keep your stops in order with times and directions. Name your day to add{" "}
              <strong>{pickerPlace?.place_name}</strong>.
            </p>
          )}

          {choice === "new" && (
            <div className="new-plan-fields">
              <div className="field">
                <label htmlFor="new-plan-name">Plan name</label>
                <input
                  id="new-plan-name"
                  className="input"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="e.g. Kandy temples day"
                  maxLength={100}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="new-plan-date">Visit date</label>
                <input
                  id="new-plan-date"
                  className="input"
                  type="date"
                  value={newDate}
                  min={todayIso()}
                  onChange={(event) => setNewDate(event.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {dialogError && (
            <Alert tone="error">
              {dialogError}
            </Alert>
          )}

          <div className="dialog-footer">
            <Button variant="ghost" onClick={closePicker}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Adding…" : choice === "new" ? "Create plan and add" : "Add to plan"}
            </Button>
          </div>
        </form>
      </Dialog>
    </PlansContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlans() {
  const context = useContext(PlansContext);
  if (!context) throw new Error("usePlans must be used inside PlansProvider");
  return context;
}
