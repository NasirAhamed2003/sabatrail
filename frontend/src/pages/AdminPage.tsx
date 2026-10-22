
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router";
import api from "../api";
import "./AdminPage.css";

interface Category {
  category_id: number;
  category_name: string;
  description?: string | null;
}

interface Place {
  place_id: number;
  category_id: number;
  place_name: string;
  description?: string | null;
  address?: string | null;
  latitude: number;
  longitude: number;
  distance?: number | null;
  opening_time?: string | null;
  closing_time?: string | null;
  best_time_to_visit?: string | null;
  visit_duration_minutes?: number | null;
  suitability?: string | null;
  travel_tips?: string | null;
  facilities?: string | null;
  image?: string | null;
  category?: Category | null;
}

export type AdminTab = "places" | "categories";

interface AdminDashboardProps {
  tab: AdminTab;
}

const emptyPlace = {
  category_id: "",
  place_name: "",
  description: "",
  address: "",
  latitude: "",
  longitude: "",
  opening_time: "",
  closing_time: "",
  best_time_to_visit: "",
  visit_duration_minutes: "",
  suitability: "",
  travel_tips: "",
  facilities: "",
  image: "",
};

function AdminDashboard({ tab: activeTab }: AdminDashboardProps) {
  const navigate = useNavigate();
  const setActiveTab = (tab: AdminTab) => navigate(`/admin/${tab}`);
  const [places, setPlaces] = useState<Place[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [placeForm, setPlaceForm] = useState({ ...emptyPlace });
  const [categoryName, setCategoryName] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [editingPlaceId, setEditingPlaceId] = useState<number | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingCategoryDescription, setEditingCategoryDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");

    try {
      const [placeResponse, categoryResponse] = await Promise.all([
        api.get<Place[]>("/places"),
        api.get<Category[]>("/categories"),
      ]);

      setPlaces(placeResponse.data);
      setCategories(categoryResponse.data);
    } catch (err: unknown) {
      const responseMessage =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } })
              .response?.data?.message
          : undefined;

      setError(
        responseMessage ||
          "Could not load management data. Check your login and backend."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const resetPlaceForm = () => {
    setPlaceForm({ ...emptyPlace });
    setEditingPlaceId(null);
  };

  const handlePlaceSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setSaving(true);

    try {
      const payload = {
        ...placeForm,
        category_id: Number(placeForm.category_id),
        latitude: Number(placeForm.latitude),
        longitude: Number(placeForm.longitude),
      };

      if (editingPlaceId === null) {
        await api.post("/places", payload);
        setMessage("Destination added successfully.");
      } else {
        await api.put(`/places/${editingPlaceId}`, payload);
        setMessage("Destination updated successfully.");
      }

      resetPlaceForm();
      await loadData();
    } catch (err: unknown) {
      const responseMessage =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } })
              .response?.data?.message
          : undefined;

      setError(responseMessage || "Could not save the destination.");
    } finally {
      setSaving(false);
    }
  };

  const startEditingPlace = (place: Place) => {
    setActiveTab("places");
    setEditingPlaceId(place.place_id);

    setPlaceForm({
      category_id: String(place.category_id),
      place_name: place.place_name ?? "",
      description: place.description ?? "",
      address: place.address ?? "",
      latitude: String(place.latitude ?? ""),
      longitude: String(place.longitude ?? ""),
      opening_time: place.opening_time ?? "",
      closing_time: place.closing_time ?? "",
      best_time_to_visit: place.best_time_to_visit ?? "",
      visit_duration_minutes:
        place.visit_duration_minutes == null ? "" : String(place.visit_duration_minutes),
      suitability: place.suitability ?? "",
      travel_tips: place.travel_tips ?? "",
      facilities: place.facilities ?? "",
      image: place.image ?? "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deletePlace = async (place: Place) => {
    if (
      !window.confirm(
        `Delete "${place.place_name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setMessage("");
    setError("");

    try {
      await api.delete(`/places/${place.place_id}`);
      setMessage("Destination deleted successfully.");
      if (editingPlaceId === place.place_id) resetPlaceForm();
      await loadData();
    } catch (err: unknown) {
      const responseMessage =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } })
              .response?.data?.message
          : undefined;

      setError(responseMessage || "Could not delete the destination.");
    }
  };

  const handleCategorySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    setError("");

    try {
      await api.post("/categories", {
        category_name: categoryName.trim(),
        description: categoryDescription.trim() || null,
      });

      setCategoryName("");
      setCategoryDescription("");
      setMessage("Category added successfully.");
      await loadData();
    } catch (err: unknown) {
      const responseMessage =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } })
              .response?.data?.message
          : undefined;

      setError(responseMessage || "Could not add the category.");
    }
  };

  const saveCategory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (editingCategoryId === null) return;

    setMessage("");
    setError("");

    try {
      await api.put(`/categories/${editingCategoryId}`, {
        category_name: editingCategoryName.trim(),
        description: editingCategoryDescription.trim() || null,
      });

      setEditingCategoryId(null);
      setMessage("Category updated successfully.");
      await loadData();
    } catch (err: unknown) {
      const responseMessage =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } })
              .response?.data?.message
          : undefined;

      setError(responseMessage || "Could not update the category.");
    }
  };

  const deleteCategory = async (category: Category) => {
    if (
      !window.confirm(
        `Delete category "${category.category_name}"? It may be in use by destinations.`
      )
    ) {
      return;
    }

    setMessage("");
    setError("");

    try {
      await api.delete(`/categories/${category.category_id}`);
      setMessage("Category deleted successfully.");
      await loadData();
    } catch (err: unknown) {
      const responseMessage =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { message?: string } } })
              .response?.data?.message
          : undefined;

      setError(
        responseMessage ||
          "Could not delete the category. It may still be used by destinations."
      );
    }
  };

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <span className="admin-eyebrow">SABATRAIL MANAGEMENT</span>
          <h1>Admin Dashboard</h1>
          <p>Manage local destinations and their categories.</p>
        </div>
      </header>

      <section className="admin-stats">
        <article className="admin-stat-card">
          <span>Total destinations</span>
          <strong>{places.length}</strong>
        </article>
        <article className="admin-stat-card">
          <span>Total categories</span>
          <strong>{categories.length}</strong>
        </article>
      </section>

      {message && <p className="admin-message" role="status">{message}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}

      <div className="admin-tabs">
        <button
          className={activeTab === "places" ? "active" : ""}
          onClick={() => setActiveTab("places")}
        >
          Manage Destinations
        </button>
        <button
          className={activeTab === "categories" ? "active" : ""}
          onClick={() => setActiveTab("categories")}
        >
          Manage Categories
        </button>
      </div>

      {loading ? (
        <p className="admin-loading">Loading management data...</p>
      ) : activeTab === "places" ? (
        <>
          <section className="admin-panel">
            <h2>{editingPlaceId === null ? "Add a Destination" : "Edit Destination"}</h2>

            <form className="admin-form" onSubmit={handlePlaceSubmit}>
              <label>
                Destination name *
                <input
                  required
                  value={placeForm.place_name}
                  onChange={(e) =>
                    setPlaceForm({ ...placeForm, place_name: e.target.value })
                  }
                />
              </label>

              <label>
                Category *
                <select
                  required
                  value={placeForm.category_id}
                  onChange={(e) =>
                    setPlaceForm({ ...placeForm, category_id: e.target.value })
                  }
                >
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.category_id} value={category.category_id}>
                      {category.category_name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Description
                <textarea
                  value={placeForm.description}
                  onChange={(e) =>
                    setPlaceForm({ ...placeForm, description: e.target.value })
                  }
                />
              </label>

              <label>
                Address
                <input
                  value={placeForm.address}
                  onChange={(e) =>
                    setPlaceForm({ ...placeForm, address: e.target.value })
                  }
                />
              </label>

              <label>
                Latitude *
                <input
                  type="number"
                  step="any"
                  required
                  value={placeForm.latitude}
                  onChange={(e) =>
                    setPlaceForm({ ...placeForm, latitude: e.target.value })
                  }
                />
              </label>

              <label>
                Longitude *
                <input
                  type="number"
                  step="any"
                  required
                  value={placeForm.longitude}
                  onChange={(e) =>
                    setPlaceForm({ ...placeForm, longitude: e.target.value })
                  }
                />
              </label>

              <p className="admin-full-width">
                Distance from Hemmathagama is calculated automatically from the
                latitude and longitude.
              </p>

              <label>
                Opening time
                <input
                  type="time"
                  value={placeForm.opening_time}
                  onChange={(e) =>
                    setPlaceForm({ ...placeForm, opening_time: e.target.value })
                  }
                />
              </label>

              <label>
                Closing time
                <input
                  type="time"
                  value={placeForm.closing_time}
                  onChange={(e) =>
                    setPlaceForm({ ...placeForm, closing_time: e.target.value })
                  }
                />
              </label>

              <label>
                Best time to visit
                <input
                  value={placeForm.best_time_to_visit}
                  onChange={(e) =>
                    setPlaceForm({ ...placeForm, best_time_to_visit: e.target.value })
                  }
                />
              </label>

              <label>
                Estimated visit duration (minutes)
                <input
                  type="number"
                  min="5"
                  max="720"
                  step="5"
                  placeholder="e.g. 90"
                  value={placeForm.visit_duration_minutes}
                  onChange={(e) =>
                    setPlaceForm({ ...placeForm, visit_duration_minutes: e.target.value })
                  }
                />
              </label>

              <label>
                Suitability
                <input
                  value={placeForm.suitability}
                  onChange={(e) =>
                    setPlaceForm({ ...placeForm, suitability: e.target.value })
                  }
                />
              </label>

              <label>
                Facilities
                <textarea
                  value={placeForm.facilities}
                  onChange={(e) =>
                    setPlaceForm({ ...placeForm, facilities: e.target.value })
                  }
                />
              </label>

              <label>
                Travel tips
                <textarea
                  value={placeForm.travel_tips}
                  onChange={(e) =>
                    setPlaceForm({ ...placeForm, travel_tips: e.target.value })
                  }
                />
              </label>

              <label className="admin-full-width">
                Image URL
                <input
                  type="url"
                  placeholder="https://..."
                  value={placeForm.image}
                  onChange={(e) =>
                    setPlaceForm({ ...placeForm, image: e.target.value })
                  }
                />
              </label>

              <div className="admin-form-actions admin-full-width">
                <button className="admin-primary-button" disabled={saving}>
                  {saving
                    ? "Saving..."
                    : editingPlaceId === null
                      ? "Add Destination"
                      : "Save Changes"}
                </button>

                {editingPlaceId !== null && (
                  <button
                    type="button"
                    className="admin-secondary-button"
                    onClick={resetPlaceForm}
                  >
                    Cancel Editing
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-heading">
              <h2>Existing Destinations</h2>
              <button className="admin-secondary-button" onClick={() => void loadData()}>
                Refresh
              </button>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Distance</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {places.map((place) => (
                    <tr key={place.place_id}>
                      <td>{place.place_name}</td>
                      <td>{place.category?.category_name ?? "—"}</td>
                      <td>{place.distance == null ? "—" : `${place.distance} km`}</td>
                      <td className="admin-row-actions">
                        <button onClick={() => startEditingPlace(place)}>Edit</button>
                        <button
                          className="admin-delete-button"
                          onClick={() => void deletePlace(place)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {places.length === 0 && (
                    <tr>
                      <td colSpan={4}>No destinations found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="admin-panel">
            <h2>Add a Category</h2>
            <form className="admin-form" onSubmit={handleCategorySubmit}>
              <label>
                Category name *
                <input
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                />
              </label>
              <label>
                Description
                <input
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                />
              </label>
              <div className="admin-form-actions admin-full-width">
                <button className="admin-primary-button">Add Category</button>
              </div>
            </form>
          </section>

          <section className="admin-panel">
            <h2>Existing Categories</h2>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.category_id}>
                      <td>
                        {editingCategoryId === category.category_id ? (
                          <input
                            value={editingCategoryName}
                            onChange={(e) => setEditingCategoryName(e.target.value)}
                          />
                        ) : (
                          category.category_name
                        )}
                      </td>
                      <td>
                        {editingCategoryId === category.category_id ? (
                          <input
                            value={editingCategoryDescription}
                            onChange={(e) =>
                              setEditingCategoryDescription(e.target.value)
                            }
                          />
                        ) : (
                          category.description || "—"
                        )}
                      </td>
                      <td className="admin-row-actions">
                        {editingCategoryId === category.category_id ? (
                          <>
                            <button onClick={(e) => {
                              e.preventDefault();
                              const form = document.getElementById(
                                `category-form-${category.category_id}`
                              ) as HTMLFormElement | null;
                              form?.requestSubmit();
                            }}>
                              Save
                            </button>
                            <button onClick={() => setEditingCategoryId(null)}>
                              Cancel
                            </button>
                            <form
                              id={`category-form-${category.category_id}`}
                              onSubmit={saveCategory}
                            />
                          </>
                        ) : (
                          <button onClick={() => {
                            setEditingCategoryId(category.category_id);
                            setEditingCategoryName(category.category_name);
                            setEditingCategoryDescription(category.description ?? "");
                          }}>
                            Edit
                          </button>
                        )}
                        <button
                          className="admin-delete-button"
                          onClick={() => void deleteCategory(category)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {categories.length === 0 && (
                    <tr>
                      <td colSpan={3}>No categories found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

export default AdminDashboard;
