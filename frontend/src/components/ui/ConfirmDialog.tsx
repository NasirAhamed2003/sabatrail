import type { ReactNode } from "react";
import { Button } from "./Button";
import Dialog from "./Dialog";
import Alert from "./Alert";

// Styled confirmation for destructive actions: names the item and the consequence
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  busy = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="confirm-message">{children}</div>
      {error && (
        <Alert tone="error">
          {error}
        </Alert>
      )}
    </Dialog>
  );
}
