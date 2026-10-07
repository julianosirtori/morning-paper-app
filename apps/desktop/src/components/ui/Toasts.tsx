import clsx from "clsx";
import { useToasts } from "../../store/toasts";

export function Toasts() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed right-6 bottom-6 z-60 grid justify-items-end gap-2" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={clsx(
            "max-w-[380px] rounded-ctl px-4 py-3 text-on-ink shadow-pop",
            t.tone === "err" ? "bg-accent" : "bg-ink",
            t.leaving ? "animate-toast-out" : "animate-toast-in",
          )}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}
