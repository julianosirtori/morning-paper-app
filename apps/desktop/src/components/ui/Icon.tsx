import clsx from "clsx";

export type IconName =
  | "today" | "paper" | "feed" | "review" | "print" | "prefs" | "check" | "dot" | "alert"
  | "pause" | "more" | "close" | "chev" | "minus" | "plus" | "ext";

/** Ícone do sprite (mesmo traço em todo o app). */
export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg className={clsx("i", className)} aria-hidden="true">
      <use href={`#i-${name}`} />
    </svg>
  );
}

/** Sprite com todos os ícones — renderizado uma vez na raiz do app. */
export function IconSprite() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden="true">
      <symbol id="i-today" viewBox="0 0 24 24"><path d="M3 18h18M6.5 18a5.5 5.5 0 0 1 11 0M12 5v2.5M5.6 9.1l1.7 1.7M18.4 9.1l-1.7 1.7" /></symbol>
      <symbol id="i-paper" viewBox="0 0 24 24"><path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7.5 9h6M7.5 12.5h6M7.5 16h3.5" /></symbol>
      <symbol id="i-feed" viewBox="0 0 24 24"><path d="M5 5a14 14 0 0 1 14 14M5 11a8 8 0 0 1 8 8" /><circle cx="6" cy="18" r="1.4" /></symbol>
      <symbol id="i-review" viewBox="0 0 24 24"><path d="M4 6h11M4 12h11M4 18h6M14.5 17.5l2 2 4-4.5" /></symbol>
      <symbol id="i-print" viewBox="0 0 24 24"><path d="M7 9V3.5h10V9M7 17H4.5v-6.5a1.5 1.5 0 0 1 1.5-1.5h12a1.5 1.5 0 0 1 1.5 1.5V17H17M7 14h10v6.5H7z" /></symbol>
      <symbol id="i-prefs" viewBox="0 0 24 24"><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></symbol>
      <symbol id="i-check" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></symbol>
      <symbol id="i-dot" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" /></symbol>
      <symbol id="i-alert" viewBox="0 0 24 24"><path d="M12 4l9 16H3zM12 10v4.5M12 17.5v.01" /></symbol>
      <symbol id="i-pause" viewBox="0 0 24 24"><path d="M9 6v12M15 6v12" /></symbol>
      <symbol id="i-more" viewBox="0 0 24 24"><circle cx="6" cy="12" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="18" cy="12" r="1.2" fill="currentColor" /></symbol>
      <symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></symbol>
      <symbol id="i-chev" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></symbol>
      <symbol id="i-minus" viewBox="0 0 24 24"><path d="M6 12h12" /></symbol>
      <symbol id="i-plus" viewBox="0 0 24 24"><path d="M6 12h12M12 6v12" /></symbol>
      <symbol id="i-ext" viewBox="0 0 24 24"><path d="M14 5h5v5M19 5l-8 8M17 14v5H5V7h5" /></symbol>
    </svg>
  );
}
