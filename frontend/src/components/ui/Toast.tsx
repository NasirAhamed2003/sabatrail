import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";

// Short confirmations ("Added to Kadugannawa Day Trip") with an optional
// action such as "View plan" or "Undo". Announced politely to screen readers.

type ToastAction = { label: string; to: string } | { label: string; onClick: () => void };

interface Toast {
  id: number;
  message: string;
  tone: "success" | "error";
  action?: ToastAction;
}

interface ToastContextValue {
  showToast: (message: string, options?: { tone?: Toast["tone"]; action?: ToastAction; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback<ToastContextValue["showToast"]>(
    (message, options = {}) => {
      const id = nextId.current++;
      setToasts((current) => [...current.slice(-2), { id, message, tone: options.tone ?? "success", action: options.action }]);
      window.setTimeout(() => dismiss(id), options.duration ?? 6000);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="toast-region" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.tone}`}>
            <span>{toast.message}</span>

            {toast.action &&
              ("to" in toast.action ? (
                <Link className="toast-action" to={toast.action.to} onClick={() => dismiss(toast.id)}>
                  {toast.action.label}
                </Link>
              ) : (
                <button
                  type="button"
                  className="toast-action"
                  onClick={() => {
                    (toast.action as { onClick: () => void }).onClick();
                    dismiss(toast.id);
                  }}
                >
                  {toast.action.label}
                </button>
              ))}

            <button type="button" className="toast-dismiss" onClick={() => dismiss(toast.id)}>
              <span aria-hidden="true">×</span>
              <span className="visually-hidden">Dismiss</span>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
