import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import api from "../../api";
import { Button, ButtonLink } from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Icon from "../../components/ui/Icon";
import { useToast } from "../../components/ui/Toast";
import { apiErrorMessage } from "../../lib/errors";
import { formatDate, formatKm } from "../../lib/format";
import { usePlaces } from "../../lib/places";
import type { Category, Place } from "../../lib/types";

type SortKey = "name" | "distance" | "updated";

interface PendingDelete {
  place: Place;
  planCount: number | null; // null while loading
}

export default function AdminPlacesPage() {
  const { places, status, reload } = usePlaces({ fresh: true });
  const { showToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });
  const [pending, setPending] = useState<PendingDelete | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let active = true;

    api
      .get<Category[]>("/categories")
      .then((response) => {
        if (active) setCategories(response.data);
      })
      .catch(() => {
        // The filter falls back to categories found on places
      });

    return () => {
      active = false;
    };
  }, []);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = places.filter((place) => {
      const matchesCategory = categoryFilter === "all" || String(place.category_id) === categoryFilter;
      const matchesSearch =
        !query || [place.place_name, place.address].filter(Boolean).join(" ").toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });

    const value = (place: Place) =>
      sort.key === "name"
        ? place.place_name.toLowerCase()
        : sort.key === "distance"
          ? (place.distance ?? Infinity)
          : (place.updated_at ?? "");

    return [...filtered].sort((a, b) => (value(a) < value(b) ? -sort.dir : value(a) > value(b) ? sort.dir : 0));
  }, [places, search, categoryFilter, sort]);

  const missingPhotos = places.filter((place) => !place.image).length;
  const missingHours = places.filter((place) => !place.opening_time).length;
  const missingGuidance = places.filter((place) => !place.before_you_go).length;

  const sortBy = (key: SortKey) =>
    setSort((current) => ({ key, dir: current.key === key ? (current.dir === 1 ? -1 : 1) : 1 }));

  const ariaSort = (key: SortKey) =>
    sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none";

  const sortHeader = (label: string, sortKey: SortKey) => (
    <th scope="col" aria-sort={ariaSort(sortKey)}>
      <button type="button" className="sort-button" onClick={() => sortBy(sortKey)}>
        {label}
        <span aria-hidden="true">{sort.key === sortKey ? (sort.dir === 1 ? " ▲" : " ▼") : " ↕"}</span>
      </button>
    </th>
  );

  const askDelete = (place: Place) => {
    setDeleteError("");
    setPending({ place, planCount: null });

    api
      .get<{ plan_count: number }>(`/places/${place.place_id}/usage`)
      .then((response) => setPending({ place, planCount: response.data.plan_count }))
      .catch(() => setPending({ place, planCount: 0 }));
  };

  const confirmDelete = async () => {
    if (!pending) return;

    setDeleting(true);
    setDeleteError("");

    try {
      const force = (pending.planCount ?? 0) > 0 ? "?force=true" : "";
      await api.delete(`/places/${pending.place.place_id}${force}`);
      showToast(`Deleted ${pending.place.place_name}`);
      setPending(null);
      void reload();
    } catch (error) {
      setDeleteError(apiErrorMessage(error, "Couldn't delete this place. Please try again."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="admin-page" aria-labelledby="admin-places-heading">
      <header className="admin-page-header">
        <div>
          <h1 id="admin-places-heading">Places</h1>
          <p className="muted">Everything visitors see comes from these records.</p>
        </div>
        <ButtonLink to="/admin/places/new">
          <Icon name="plus" size={16} /> Add place
        </ButtonLink>
      </header>

      {status === "ready" && (
        <ul className="admin-health" aria-label="Data health">
          <li>
            <strong>{places.length}</strong> places
          </li>
          <li className={missingPhotos ? "needs-work" : ""}>
            <strong>{missingPhotos}</strong> without a photo
          </li>
          <li className={missingHours ? "needs-work" : ""}>
            <strong>{missingHours}</strong> without opening hours
          </li>
          <li className={missingGuidance ? "needs-work" : ""}>
            <strong>{missingGuidance}</strong> without “Before you go”
          </li>
        </ul>
      )}

      <div className="admin-toolbar">
        <div className="field">
          <label htmlFor="admin-place-search">Search places</label>
          <input
            id="admin-place-search"
            className="input"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or address"
          />
        </div>
        <div className="field">
          <label htmlFor="admin-place-category">Category</label>
          <select
            id="admin-place-category"
            className="input"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.category_id} value={category.category_id}>
                {category.category_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {status === "loading" && <p role="status">Loading places…</p>}

      {status === "error" && (
        <div className="alert alert-error" role="alert">
          Couldn&apos;t load places.{" "}
          <button type="button" className="link-button" onClick={() => void reload()}>
            Try again
          </button>
        </div>
      )}

      {status === "ready" && (
        <>
          <p className="muted" aria-live="polite">
            Showing {visible.length} of {places.length}
          </p>

          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  {sortHeader("Place", "name")}
                  <th scope="col">Category</th>
                  {sortHeader("Distance", "distance")}
                  <th scope="col">Photo</th>
                  {sortHeader("Updated", "updated")}
                  <th scope="col">
                    <span className="visually-hidden">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((place) => (
                  <tr key={place.place_id}>
                    <td data-label="Place">
                      <div className="admin-place-cell">
                        {place.image ? (
                          <img src={place.image} alt="" loading="lazy" />
                        ) : (
                          <span className="admin-thumb-empty" aria-hidden="true" />
                        )}
                        <span>
                          <Link to={`/places/${place.place_id}`}>{place.place_name}</Link>
                          {place.address && <small>{place.address}</small>}
                        </span>
                      </div>
                    </td>
                    <td data-label="Category">{place.category?.category_name ?? "—"}</td>
                    <td data-label="Distance">{formatKm(place.distance) ?? "—"}</td>
                    <td data-label="Photo">
                      {place.image ? (
                        <span className="chip">Yes</span>
                      ) : (
                        <span className="chip chip-sand">Missing</span>
                      )}
                    </td>
                    <td data-label="Updated">{place.updated_at ? formatDate(place.updated_at) : "—"}</td>
                    <td className="admin-row-actions">
                      <ButtonLink to={`/admin/places/${place.place_id}/edit`} variant="secondary" size="sm">
                        Edit<span className="visually-hidden"> {place.place_name}</span>
                      </ButtonLink>
                      <Button variant="danger" size="sm" onClick={() => askDelete(place)}>
                        Delete<span className="visually-hidden"> {place.place_name}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {visible.length === 0 && (
              <p className="admin-empty">
                {places.length === 0 ? "No places yet. Add the first one." : "No places match your search."}
              </p>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={`Delete "${pending?.place.place_name ?? ""}"?`}
        confirmLabel={(pending?.planCount ?? 0) > 0 ? "Delete and remove from plans" : "Delete place"}
        busy={deleting || pending?.planCount === null}
        error={deleteError}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setPending(null)}
      >
        {pending?.planCount === null ? (
          <p role="status">Checking whether visitors have planned this place…</p>
        ) : (pending?.planCount ?? 0) > 0 ? (
          <p>
            <strong>
              It&apos;s in {pending!.planCount} visitor {pending!.planCount === 1 ? "plan" : "plans"}.
            </strong>{" "}
            Deleting it also removes it from {pending!.planCount === 1 ? "that plan" : "those plans"}. This can&apos;t be undone.
          </p>
        ) : (
          <p>No visitor plans include this place. It will disappear from the catalogue. This can&apos;t be undone.</p>
        )}
      </ConfirmDialog>
    </section>
  );
}
