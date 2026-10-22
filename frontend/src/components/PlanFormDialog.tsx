import { useState, type FormEvent } from "react";
import { apiErrorMessage } from "../lib/errors";
import { todayIso } from "../lib/format";
import { Button } from "./ui/Button";
import Dialog from "./ui/Dialog";

// Create a plan, or rename / re-date an existing one
export default function PlanFormDialog({
  open,
  mode,
  initialName = "",
  initialDate,
  onSubmit,
  onClose,
}: {
  open: boolean;
  mode: "create" | "edit";
  initialName?: string;
  initialDate?: string;
  onSubmit: (values: { plan_name: string; visit_date: string }) => Promise<void>;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} title={mode === "create" ? "New visit plan" : "Edit plan"} onClose={onClose}>
      {open && (
        <PlanForm
          mode={mode}
          initialName={initialName}
          initialDate={initialDate ?? todayIso()}
          onSubmit={onSubmit}
          onClose={onClose}
        />
      )}
    </Dialog>
  );
}

// Mounted fresh each time the dialog opens, so fields start from the initial values
function PlanForm({
  mode,
  initialName,
  initialDate,
  onSubmit,
  onClose,
}: {
  mode: "create" | "edit";
  initialName: string;
  initialDate: string;
  onSubmit: (values: { plan_name: string; visit_date: string }) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [date, setDate] = useState(initialDate);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Give your plan a name.");
      return;
    }

    if (!date) {
      setError("Choose the date of your visit.");
      return;
    }

    setSaving(true);

    try {
      await onSubmit({ plan_name: name.trim(), visit_date: date });
    } catch (submitError) {
      setError(apiErrorMessage(submitError, "Couldn't save the plan. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="dialog-content" onSubmit={submit}>
      <div className="field">
        <label htmlFor="plan-form-name">Plan name</label>
        <input
          id="plan-form-name"
          className="input"
          value={name}
          maxLength={100}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Kandy temples day"
          required
        />
      </div>

      <div className="field">
        <label htmlFor="plan-form-date">Visit date</label>
        <input
          id="plan-form-date"
          className="input"
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          required
        />
      </div>

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}

      <div className="dialog-footer">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : mode === "create" ? "Create plan" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
