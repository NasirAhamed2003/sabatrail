import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import api from "../../api";
import { Button } from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Dialog from "../../components/ui/Dialog";
import { useToast } from "../../components/ui/Toast";
import { apiErrorMessage, apiFieldErrors } from "../../lib/errors";
import { invalidatePlaces } from "../../lib/places";
import type { Category } from "../../lib/types";
import Alert from "../../components/ui/Alert";

// One category row; in edit mode the row is its own form, so Enter saves
// and Escape cancels.
function CategoryRow({
  category,
  onSaved,
  onDelete,
}: {
  category: Category;
  onSaved: () => void;
  onDelete: () => void;
}) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.category_name);
  const [description, setDescription] = useState(category.description ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const formId = `category-form-${category.category_id}`;
  const count = category._count?.places ?? 0;

  const startEditing = () => {
    setName(category.category_name);
    setDescription(category.description ?? "");
    setError("");
    setEditing(true);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim()) {
      setError("Enter a category name.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await api.put(`/categories/${category.category_id}`, {
        category_name: name.trim(),
        description: description.trim() || null,
      });
      invalidatePlaces();
      showToast(`Saved ${name.trim()}`);
      setEditing(false);
      onSaved();
    } catch (saveError) {
      setError(apiErrorMessage(saveError, "Couldn't save this category."));
    } finally {
      setSaving(false);
    }
  };

  const cancelOnEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") setEditing(false);
  };

  if (editing) {
    return (
      <tr className="is-editing">
        <td data-label="Category">
          <form id={formId} onSubmit={save} />
          <label className="visually-hidden" htmlFor={`${formId}-name`}>
            Category name
          </label>
          <input
            id={`${formId}-name`}
            form={formId}
            className="input"
            value={name}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={cancelOnEscape}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${formId}-error` : undefined}
            autoFocus
          />
          {error && (
            <p className="field-error" id={`${formId}-error`}>
              {error}
            </p>
          )}
        </td>
        <td data-label="Description">
          <label className="visually-hidden" htmlFor={`${formId}-description`}>
            Description
          </label>
          <input
            id={`${formId}-description`}
            form={formId}
            className="input"
            value={description}
            maxLength={191}
            onChange={(event) => setDescription(event.target.value)}
            onKeyDown={cancelOnEscape}
          />
        </td>
        <td data-label="Places">{count}</td>
        <td className="admin-row-actions">
          <Button type="submit" form={formId} size="sm" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td data-label="Category">
        <strong>{category.category_name}</strong>
      </td>
      <td data-label="Description">{category.description || <span className="muted">—</span>}</td>
      <td data-label="Places">{count}</td>
      <td className="admin-row-actions">
        <Button type="button" variant="secondary" size="sm" onClick={startEditing}>
          Edit<span className="visually-hidden"> {category.category_name}</span>
        </Button>
        <Button type="button" variant="danger" size="sm" onClick={onDelete}>
          Delete<span className="visually-hidden"> {category.category_name}</span>
        </Button>
      </td>
    </tr>
  );
}

export default function AdminCategoriesPage() {
  const { showToast } = useToast();
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  const [pending, setPending] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    let active = true;

    api
      .get<Category[]>("/categories")
      .then((response) => {
        if (!active) return;
        setCategories(response.data);
        setLoadError(false);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });

    return () => {
      active = false;
    };
  }, [reloadKey]);

  const reload = () => setReloadKey((key) => key + 1);

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAddError("");

    if (!name.trim()) {
      setAddError("Enter a category name.");
      document.getElementById("new-category-name")?.focus();
      return;
    }

    setAdding(true);

    try {
      await api.post("/categories", { category_name: name.trim(), description: description.trim() || null });
      showToast(`Added ${name.trim()}`);
      setName("");
      setDescription("");
      reload();
    } catch (error) {
      setAddError(apiFieldErrors(error).category_name ?? apiErrorMessage(error, "Couldn't add the category."));
    } finally {
      setAdding(false);
    }
  };

  const confirmDelete = async () => {
    if (!pending) return;

    setDeleting(true);
    setDeleteError("");

    try {
      await api.delete(`/categories/${pending.category_id}`);
      showToast(`Deleted ${pending.category_name}`);
      setPending(null);
      reload();
    } catch (error) {
      setDeleteError(apiErrorMessage(error, "Couldn't delete this category."));
    } finally {
      setDeleting(false);
    }
  };

  const inUse = (pending?._count?.places ?? 0) > 0;

  return (
    <section className="admin-page" aria-labelledby="admin-categories-heading">
      <header className="admin-page-header">
        <div>
          <h1 id="admin-categories-heading">Categories</h1>
          <p className="muted">Visitors filter places by these. A category can only be deleted when no places use it.</p>
        </div>
      </header>

      <form className="admin-add-category" onSubmit={add} noValidate>
        <div className="field">
          <label htmlFor="new-category-name">New category name</label>
          <input
            id="new-category-name"
            className="input"
            value={name}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={addError ? true : undefined}
            aria-describedby={addError ? "new-category-error" : undefined}
          />
          {addError && (
            <p className="field-error" id="new-category-error">
              {addError}
            </p>
          )}
        </div>
        <div className="field">
          <label htmlFor="new-category-description">
            Description <span className="field-optional">(optional)</span>
          </label>
          <input
            id="new-category-description"
            className="input"
            value={description}
            maxLength={191}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={adding}>
          {adding ? "Adding…" : "Add category"}
        </Button>
      </form>

      {loadError && (
        <Alert tone="error">
          Couldn&apos;t load categories.{" "}
          <button type="button" className="link-button" onClick={reload}>
            Try again
          </button>
        </Alert>
      )}

      {categories === null && !loadError && <p role="status">Loading categories…</p>}

      {categories && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">Description</th>
                <th scope="col">Places</th>
                <th scope="col">
                  <span className="visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <CategoryRow
                  key={category.category_id}
                  category={category}
                  onSaved={reload}
                  onDelete={() => {
                    setDeleteError("");
                    setPending(category);
                  }}
                />
              ))}
            </tbody>
          </table>
          {categories.length === 0 && <p className="admin-empty">No categories yet.</p>}
        </div>
      )}

      {inUse ? (
        <Dialog
          open={pending !== null}
          title={`"${pending?.category_name}" is in use`}
          onClose={() => setPending(null)}
          footer={<Button onClick={() => setPending(null)}>OK</Button>}
        >
          <p>
            {pending?._count?.places} {pending?._count?.places === 1 ? "place uses" : "places use"} this category. Edit
            {pending?._count?.places === 1 ? " that place" : " those places"} to move them to another category, then
            delete it.
          </p>
        </Dialog>
      ) : (
        <ConfirmDialog
          open={pending !== null}
          title={`Delete "${pending?.category_name ?? ""}"?`}
          confirmLabel="Delete category"
          busy={deleting}
          error={deleteError}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPending(null)}
        >
          <p>No places use this category. It will no longer appear as a filter. This can&apos;t be undone.</p>
        </ConfirmDialog>
      )}
    </section>
  );
}
