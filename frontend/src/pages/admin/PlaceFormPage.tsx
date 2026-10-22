import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router";
import api from "../../api";
import LocationPicker from "../../components/LocationPicker";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../components/ui/Toast";
import { apiErrorMessage, apiFieldErrors, apiStatus } from "../../lib/errors";
import { formatDuration, formatKm } from "../../lib/format";
import { HEMMATHAGAMA, haversineKm } from "../../lib/geo";
import { invalidatePlaces } from "../../lib/places";
import type { Category, Place } from "../../lib/types";

const FIELDS = [
  "place_name",
  "category_id",
  "description",
  "address",
  "latitude",
  "longitude",
  "opening_time",
  "closing_time",
  "best_time_to_visit",
  "visit_duration_minutes",
  "suitability",
  "facilities",
  "travel_tips",
  "before_you_go",
  "image",
  "image_credit",
] as const;

type Field = (typeof FIELDS)[number];
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>>;

const EMPTY: Values = Object.fromEntries(FIELDS.map((field) => [field, ""])) as Values;

function toValues(place: Place): Values {
  const text = (value: unknown) => (value === null || value === undefined ? "" : String(value));

  return {
    place_name: text(place.place_name),
    category_id: text(place.category_id),
    description: text(place.description),
    address: text(place.address),
    latitude: text(place.latitude),
    longitude: text(place.longitude),
    opening_time: text(place.opening_time).slice(0, 5),
    closing_time: text(place.closing_time).slice(0, 5),
    best_time_to_visit: text(place.best_time_to_visit),
    visit_duration_minutes: text(place.visit_duration_minutes),
    suitability: text(place.suitability),
    facilities: text(place.facilities),
    travel_tips: text(place.travel_tips),
    before_you_go: text(place.before_you_go),
    image: text(place.image),
    image_credit: text(place.image_credit),
  };
}

// Same rules as the API (backend/Src/validation.ts placeSchema)
function validate(values: Values): Errors {
  const errors: Errors = {};
  const number = (value: string) => (value.trim() === "" ? NaN : Number(value));

  if (!values.place_name.trim()) errors.place_name = "Enter the place's name.";
  if (!values.category_id) errors.category_id = "Choose a category.";

  const lat = number(values.latitude);
  const lng = number(values.longitude);

  if (!Number.isFinite(lat)) errors.latitude = "Enter a latitude, or click the map.";
  else if (lat < -90 || lat > 90) errors.latitude = "Latitude must be between -90 and 90.";

  if (!Number.isFinite(lng)) errors.longitude = "Enter a longitude, or click the map.";
  else if (lng < -180 || lng > 180) errors.longitude = "Longitude must be between -180 and 180.";

  if (values.visit_duration_minutes.trim()) {
    const minutes = Number(values.visit_duration_minutes);
    if (!Number.isInteger(minutes) || minutes < 5 || minutes > 720) {
      errors.visit_duration_minutes = "Use whole minutes between 5 and 720.";
    }
  }

  if (values.opening_time && values.closing_time && values.closing_time <= values.opening_time) {
    errors.closing_time = "Closing time must be after opening time.";
  }

  if (values.image.trim() && !/^https?:\/\/\S+$/i.test(values.image.trim())) {
    errors.image = "Use a full web address starting with https://";
  }

  return errors;
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <fieldset className="form-section">
      <legend>{title}</legend>
      {hint && <p className="muted form-section-hint">{hint}</p>}
      <div className="form-grid">{children}</div>
    </fieldset>
  );
}

export default function PlaceFormPage() {
  const { id } = useParams();
  const editing = id !== undefined;
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "missing" | "error">(editing ? "loading" : "ready");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let active = true;

    api
      .get<Category[]>("/categories")
      .then((response) => {
        if (active) setCategories(response.data);
      })
      .catch(() => {
        if (active) setFormError("Couldn't load categories. Refresh the page to try again.");
      });

    if (editing) {
      api
        .get<Place>(`/places/${id}`)
        .then((response) => {
          if (!active) return;
          setValues(toValues(response.data));
          setLoadState("ready");
        })
        .catch((error) => {
          if (active) setLoadState(apiStatus(error) === 404 || apiStatus(error) === 400 ? "missing" : "error");
        });
    }

    return () => {
      active = false;
    };
  }, [editing, id]);

  const set = (field: Field, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
    if (formError) setFormError("");
    if (field === "image") setImageFailed(false);
  };

  // Validate one field when the admin leaves it
  const checkField = (field: Field) => {
    const message = validate(values)[field];
    setErrors((current) => ({ ...current, [field]: message }));
  };

  const focusFirstError = (found: Errors) => {
    const first = FIELDS.find((field) => found[field]);
    if (first) document.getElementById(`place-${first}`)?.focus();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const found = validate(values);
    setErrors(found);

    if (Object.values(found).some(Boolean)) {
      setFormError("Please fix the highlighted fields.");
      focusFirstError(found);
      return;
    }

    setSaving(true);

    const payload = {
      ...values,
      category_id: Number(values.category_id),
      latitude: Number(values.latitude),
      longitude: Number(values.longitude),
      visit_duration_minutes: values.visit_duration_minutes.trim() ? Number(values.visit_duration_minutes) : null,
    };

    try {
      if (editing) await api.put(`/places/${id}`, payload);
      else await api.post("/places", payload);

      invalidatePlaces();
      showToast(`${editing ? "Saved" : "Added"} ${values.place_name.trim()}`);
      navigate("/admin/places");
    } catch (error) {
      const serverErrors = apiFieldErrors(error) as Errors;
      setErrors(serverErrors);
      setFormError(apiErrorMessage(error, "Couldn't save this place. Please try again."));
      focusFirstError(serverErrors);
    } finally {
      setSaving(false);
    }
  };

  // Field helpers keep labels, hints and errors connected for screen readers
  const describedBy = (field: Field, hint?: string) =>
    [errors[field] && `place-${field}-error`, hint && `place-${field}-hint`].filter(Boolean).join(" ") || undefined;

  const control = (field: Field, hint?: string) => ({
    id: `place-${field}`,
    name: field,
    className: "input",
    value: values[field],
    onBlur: () => checkField(field),
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": describedBy(field, hint),
  });

  const meta = (field: Field, hint?: string) => (
    <>
      {hint && (
        <p className="field-hint" id={`place-${field}-hint`}>
          {hint}
        </p>
      )}
      {errors[field] && (
        <p className="field-error" id={`place-${field}-error`}>
          {errors[field]}
        </p>
      )}
    </>
  );

  if (loadState === "loading") {
    return <p role="status">Loading place…</p>;
  }

  if (loadState === "missing" || loadState === "error") {
    return (
      <div className="admin-page">
        <h1>{loadState === "missing" ? "Place not found" : "Couldn't load this place"}</h1>
        <Link to="/admin/places">Back to places</Link>
      </div>
    );
  }

  const lat = values.latitude.trim() === "" ? null : Number(values.latitude);
  const lng = values.longitude.trim() === "" ? null : Number(values.longitude);
  const validPoint = lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
  const distance = validPoint ? haversineKm(HEMMATHAGAMA, { latitude: lat!, longitude: lng! }) : null;
  const minutes = Number(values.visit_duration_minutes);
  const showPreview = /^https?:\/\/\S+$/i.test(values.image.trim());

  return (
    <section className="admin-page" aria-labelledby="place-form-heading">
      <Link className="back-link" to="/admin/places">
        ← All places
      </Link>

      <header className="admin-page-header">
        <h1 id="place-form-heading">{editing ? `Edit ${values.place_name || "place"}` : "Add a place"}</h1>
      </header>

      <p className="muted">
        Fields marked <span aria-hidden="true">*</span>
        <span className="visually-hidden">with an asterisk</span> are required. Everything else is optional.
      </p>

      <form className="place-form" onSubmit={submit} noValidate>
        <Section title="Basics">
          <div className="field">
            <label htmlFor="place-place_name">Name *</label>
            <input {...control("place_name")} onChange={(e) => set("place_name", e.target.value)} maxLength={150} required />
            {meta("place_name")}
          </div>

          <div className="field">
            <label htmlFor="place-category_id">Category *</label>
            <select {...control("category_id")} onChange={(e) => set("category_id", e.target.value)} required>
              <option value="">Choose a category</option>
              {categories.map((category) => (
                <option key={category.category_id} value={category.category_id}>
                  {category.category_name}
                </option>
              ))}
            </select>
            {meta("category_id")}
          </div>

          <div className="field form-wide">
            <label htmlFor="place-description">Description</label>
            <textarea
              {...control("description", "Two or three sentences: what it is and why it's worth a visit.")}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
            />
            {meta("description", "Two or three sentences: what it is and why it's worth a visit.")}
          </div>
        </Section>

        <Section title="Location" hint="Click the map to drop the pin, or type the coordinates.">
          <div className="field form-wide">
            <label htmlFor="place-address">Address</label>
            <input {...control("address")} onChange={(e) => set("address", e.target.value)} />
            {meta("address")}
          </div>

          <div className="field">
            <label htmlFor="place-latitude">Latitude *</label>
            <input {...control("latitude")} inputMode="decimal" onChange={(e) => set("latitude", e.target.value)} placeholder="e.g. 7.2567" />
            {meta("latitude")}
          </div>

          <div className="field">
            <label htmlFor="place-longitude">Longitude *</label>
            <input {...control("longitude")} inputMode="decimal" onChange={(e) => set("longitude", e.target.value)} placeholder="e.g. 80.5180" />
            {meta("longitude")}
          </div>

          <div className="form-wide">
            <LocationPicker
              latitude={validPoint ? lat : null}
              longitude={validPoint ? lng : null}
              onPick={(pickedLat, pickedLng) => {
                setValues((current) => ({ ...current, latitude: String(pickedLat), longitude: String(pickedLng) }));
                setErrors((current) => ({ ...current, latitude: undefined, longitude: undefined }));
              }}
            />
            <p className="field-hint" aria-live="polite">
              {distance !== null
                ? `${formatKm(distance)} from Hemmathagama town centre (calculated automatically).`
                : "Distance from Hemmathagama is calculated automatically from the coordinates."}
              {distance !== null && distance > 25 && <strong> This is outside the 25 km area SabaTrail covers.</strong>}
            </p>
          </div>
        </Section>

        <Section title="Visiting">
          <div className="field">
            <label htmlFor="place-opening_time">Opening time</label>
            <input {...control("opening_time")} type="time" onChange={(e) => set("opening_time", e.target.value)} />
            {meta("opening_time")}
          </div>

          <div className="field">
            <label htmlFor="place-closing_time">Closing time</label>
            <input {...control("closing_time")} type="time" onChange={(e) => set("closing_time", e.target.value)} />
            {meta("closing_time")}
          </div>

          <div className="field">
            <label htmlFor="place-visit_duration_minutes">Time to spend (minutes)</label>
            <input
              {...control("visit_duration_minutes", "Used to total the day in visitor plans.")}
              type="number"
              min={5}
              max={720}
              step={5}
              onChange={(e) => set("visit_duration_minutes", e.target.value)}
            />
            {meta("visit_duration_minutes", Number.isInteger(minutes) && minutes >= 5 ? `Shown to visitors as ${formatDuration(minutes)}.` : "Used to total the day in visitor plans.")}
          </div>

          <div className="field">
            <label htmlFor="place-best_time_to_visit">Best time to visit</label>
            <input {...control("best_time_to_visit")} onChange={(e) => set("best_time_to_visit", e.target.value)} placeholder="e.g. Early morning" />
            {meta("best_time_to_visit")}
          </div>
        </Section>

        <Section title="Guidance">
          <div className="field form-wide">
            <label htmlFor="place-suitability">Good for</label>
            <input
              {...control("suitability", "Separate with commas; shown as tags, e.g. Families, Hikers, Photography.")}
              onChange={(e) => set("suitability", e.target.value)}
            />
            {meta("suitability", "Separate with commas; shown as tags, e.g. Families, Hikers, Photography.")}
          </div>

          <div className="field form-wide">
            <label htmlFor="place-before_you_go">Before you go</label>
            <textarea
              {...control("before_you_go", "One item per line, e.g. “Footwear: sturdy shoes with grip”. Use Clothing, Footwear, Carry and Safety.")}
              onChange={(e) => set("before_you_go", e.target.value)}
              rows={4}
            />
            {meta("before_you_go", "One item per line, e.g. “Footwear: sturdy shoes with grip”. Use Clothing, Footwear, Carry and Safety.")}
          </div>

          <div className="field">
            <label htmlFor="place-facilities">Facilities</label>
            <textarea {...control("facilities")} onChange={(e) => set("facilities", e.target.value)} rows={3} />
            {meta("facilities")}
          </div>

          <div className="field">
            <label htmlFor="place-travel_tips">Travel tips</label>
            <textarea {...control("travel_tips")} onChange={(e) => set("travel_tips", e.target.value)} rows={3} />
            {meta("travel_tips")}
          </div>
        </Section>

        <Section title="Photo">
          <div className="field form-wide">
            <label htmlFor="place-image">Image URL</label>
            <input
              {...control("image")}
              type="url"
              inputMode="url"
              onChange={(e) => set("image", e.target.value)}
              placeholder="https://"
            />
            {meta("image")}
          </div>

          <div className="field form-wide">
            <label htmlFor="place-image_credit">Photo credit</label>
            <input
              {...control("image_credit", "Author and licence, e.g. “Jane Doe, CC BY-SA 4.0, via Wikimedia Commons”.")}
              onChange={(e) => set("image_credit", e.target.value)}
            />
            {meta("image_credit", "Author and licence, e.g. “Jane Doe, CC BY-SA 4.0, via Wikimedia Commons”.")}
          </div>

          {showPreview && (
            <figure className="image-preview form-wide">
              {imageFailed ? (
                <p className="alert alert-warning">This address didn&apos;t load as an image. Check the URL.</p>
              ) : (
                <img src={values.image.trim()} alt="Preview of the place's photo" onError={() => setImageFailed(true)} />
              )}
              <figcaption className="muted">Preview</figcaption>
            </figure>
          )}
        </Section>

        {formError && (
          <p className="alert alert-error" role="alert">
            {formError}
          </p>
        )}

        <div className="form-actions">
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Add place"}
          </Button>
          <Link className="btn btn-ghost btn-lg" to="/admin/places">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
