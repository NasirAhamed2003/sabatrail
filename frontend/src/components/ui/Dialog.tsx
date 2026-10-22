import { useEffect, useRef, type ReactNode } from "react";

// Accessible modal built on the native <dialog> element: the browser traps
// focus, makes the page behind it inert, and closes it on Escape. Focus
// returns to whatever was focused before it opened.
interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md";
}

export default function Dialog({ open, title, onClose, children, footer, size = "sm" }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
      returnFocus.current?.focus?.();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={`dialog dialog-${size}`}
      aria-labelledby="dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        // Clicking the backdrop (the dialog element itself) closes it
        if (event.target === ref.current) onClose();
      }}
    >
      {open && (
        <div className="dialog-body">
          <div className="dialog-header">
            <h2 id="dialog-title">{title}</h2>
            <button type="button" className="dialog-close" onClick={onClose}>
              <span aria-hidden="true">×</span>
              <span className="visually-hidden">Close</span>
            </button>
          </div>

          <div className="dialog-content">{children}</div>

          {footer && <div className="dialog-footer">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
