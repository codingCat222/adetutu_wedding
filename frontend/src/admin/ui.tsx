import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

// ---------- Toasts ----------
type Toast = { id: number; kind: "success" | "error"; text: string };
const ToastCtx = createContext<(kind: Toast["kind"], text: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(0);
  const push = useCallback((kind: Toast["kind"], text: string) => {
    const id = next.current++;
    setToasts((t) => [...t, { id, kind, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 space-y-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={`flex items-center gap-2 rounded-sm px-4 py-3 font-sans text-sm shadow-lg ${
              t.kind === "success" ? "bg-deep-olive text-ivory" : "bg-plum text-ivory"
            }`}
          >
            {t.kind === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- Confirm dialog ----------
export function ConfirmDialog(props: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!props.open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && props.onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props.open, props.onCancel]);
  if (!props.open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-deep-plum/60 px-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="w-full max-w-sm bg-ivory rounded-sm p-6">
        <h2 id="confirm-title" className="font-serif text-xl text-deep-plum mb-2">{props.title}</h2>
        <p className="font-sans text-sm text-deep-plum/70 mb-6">{props.message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={props.onCancel} className={btnGhost}>Cancel</button>
          <button onClick={props.onConfirm} disabled={props.busy} className={btnPrimary}>
            {props.busy ? "Working…" : props.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Shared styles / bits ----------
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 bg-plum text-ivory font-sans text-sm px-5 py-2.5 rounded-sm hover:bg-deep-plum transition-colors disabled:opacity-60";
export const btnGhost =
  "inline-flex items-center justify-center gap-2 border border-plum/25 text-deep-plum font-sans text-sm px-5 py-2.5 rounded-sm hover:bg-plum/5 transition-colors disabled:opacity-60";
export const inputCls =
  "bg-white border border-plum/20 rounded-sm px-3 py-2.5 font-sans text-sm text-deep-plum focus:border-olive transition-colors";

const badge: Record<string, string> = {
  UNUSED: "bg-olive/15 text-deep-olive",
  USED: "bg-plum/10 text-plum",
  REVOKED: "bg-deep-plum/10 text-deep-plum/60",
  ATTENDING: "bg-olive/15 text-deep-olive",
  NOT_ATTENDING: "bg-plum/10 text-plum",
};
const label: Record<string, string> = { UNUSED: "Unused", USED: "Used", REVOKED: "Revoked", ATTENDING: "Attending", NOT_ATTENDING: "Declined" };
export function StatusBadge({ value }: { value: string }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 font-sans text-xs font-medium ${badge[value] ?? ""}`}>{label[value] ?? value}</span>;
}

export function Spinner({ text = "Loading…" }: { text?: string }) {
  return <p className="font-sans text-sm text-deep-plum/60 py-10 text-center" role="status">{text}</p>;
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadBlob(filename: string, content: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
