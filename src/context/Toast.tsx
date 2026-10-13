import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { ArrowUpRight, CheckCircle2, Loader2, X, XCircle } from "lucide-react";

type Kind = "success" | "pending" | "error";
type Toast = { id: string; kind: Kind; title: string; body?: string; href?: string };

type Ctx = { push: (t: Toast) => void; dismiss: (id: string) => void };
const ToastContext = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback(
    (id: string) => setToasts((t) => t.filter((x) => x.id !== id)),
    []
  );

  // Pushing a toast with an existing id replaces it (pending -> confirmed)
  const push = useCallback(
    (toast: Toast) => {
      setToasts((t) => [...t.filter((x) => x.id !== toast.id), toast]);
      if (toast.kind !== "pending") setTimeout(() => dismiss(toast.id), 7000);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  const icon = {
    success: <CheckCircle2 size={18} className="text-success" />,
    pending: <Loader2 size={18} className="animate-spin text-accent" />,
    error: <XCircle size={18} className="text-danger" />,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4 shadow-xl"
          >
            <span className="mt-0.5">{icon[t.kind]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.body && <p className="mt-0.5 text-xs text-muted">{t.body}</p>}
              {t.href && (
                <a
                  href={t.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  View on Etherscan <ArrowUpRight size={12} />
                </a>
              )}
            </div>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-muted hover:text-fg">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}